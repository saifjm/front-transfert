package IbansysPoc.AVA.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import IbansysPoc.AVA.DTO.ExportateurDTO;
import IbansysPoc.AVA.DTO.OperationExportateurAVADTO;
import IbansysPoc.AVA.entity.OperationExportateurAVA;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.OperationExportateurAVAMapper;
import IbansysPoc.AVA.repository.BeneficiaireRepository;
import IbansysPoc.AVA.repository.OperationExportateurAVARepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.OperationExportateurAVAService;
import IbansysPoc.AVA.service.OperationsDelegueesMvtService;
import IbansysPoc.AVA.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationExportateurAVAServiceImpl implements OperationExportateurAVAService {

    /** Constante pour le status finalisé du MVT (finalize=true). */
    public static final String STATUS_FINALIZED = "A";

    /** Constante pour le status en attente du MVT (finalize=false). */
    public static final String STATUS_PENDING = "X";

    private final OperationExportateurAVARepository operationExportateurAVARepository;
    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final BeneficiaireRepository beneficiaireRepository;
    private final OperationExportateurAVAMapper operationExportateurAVAMapper;
    private final OperationsDelegueesMvtService operationsDelegueesMvtService;
    private final ApiExterneService apiExterneService;
    private final IbansysPoc.AVA.service.BusinessRulesService businessRulesService;
    private final ReportService reportService;

    /**
     * Délègue à la version avec finalizeFlag = true (comportement par défaut / rétrocompatibilité).
     */
    @Override
    public OperationExportateurAVADTO createRapatriement(OperationExportateurAVADTO dto) {
        return createRapatriement(dto, true);
    }

    @Override
    public OperationExportateurAVADTO createRapatriement(OperationExportateurAVADTO dto, boolean finalizeFlag) {
        log.info("=== DEBUT createRapatriement === numDossierAva: {}, dateOperation: {}, finalize: {}, thread: {}",
                dto.getNumDossierAva(), dto.getDateOperation(), finalizeFlag, Thread.currentThread().getName());

        // Validation minimale : numDossierAva toujours requis
        if (dto.getNumDossierAva() == null) {
            throw new IllegalArgumentException("Le numero de dossier AVA est obligatoire");
        }

        log.info("[createRapatriement] ⏳ Tentative d'acquisition du lock sur dossier {}", dto.getNumDossierAva());

        // Validation: numDossierAva doit exister dans OperationsDeleguee AVEC LOCK PESSIMISTE
        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findByIdForUpdate(dto.getNumDossierAva().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Operation deleguee non trouvee avec numDossier: " + dto.getNumDossierAva()));

        log.info("[createRapatriement] ✅ Lock acquis sur dossier {}", dto.getNumDossierAva());

        // Set dateOperation from the corresponding delegated operation
        dto.setDateOperation(operationsDeleguee.getDateDossier());

        // Calcul: mntMvtTnd = 25% de mntRap
        if (dto.getMntRap() != null) {
            dto.setMntMvtTnd(dto.getMntRap().multiply(BigDecimal.valueOf(0.25)));
        }

        // Hardcode codeOperation and codeProduitService — no client input needed
        dto.setCodeOperation(204); // Exportateur — fixed for rapatriement endpoint
        dto.setCodeProduitService(108); // fixed for all operation types
        dto.setCodeTypeMvtAva(resolveCodeTypeMvtAva(204));
        dto.setTypeDosRap(resolveCodeTypeMvtAva(204));

        // ===================== CREATION MVT (dans les deux cas) =====================
        ExportateurDTO mvtDto = new ExportateurDTO();
        Long generatedRefOperation = operationExportateurAVARepository.getNextRefOperation();
        log.info("RefOperation generee pour MVT: {}", generatedRefOperation);
        mvtDto.setRefOperation(generatedRefOperation);
        mvtDto.setDateOperation(dto.getDateOperation());
        mvtDto.setCodeTypeDosAva(operationsDeleguee.getCodeTypeDosAva());
        mvtDto.setNumDossier(operationsDeleguee.getNumDossier());
        mvtDto.setDateDossier(operationsDeleguee.getDateDossier());
        mvtDto.setCodeAgenceAva(operationsDeleguee.getCodeAgenceAva());
        mvtDto.setTypePieceClient(operationsDeleguee.getTypePieceClient().intValue());
        mvtDto.setNoPieceClient(operationsDeleguee.getNoPieceClient());
        mvtDto.setNumeroCompte(operationsDeleguee.getNumeroCompte());
        mvtDto.setTel(operationsDeleguee.getTel());
        mvtDto.setCodeActivite(operationsDeleguee.getCodeActivite());
        mvtDto.setCodeSousActivite(operationsDeleguee.getCodeSousActivite());
        mvtDto.setDeclarationFiscale(operationsDeleguee.getDeclarationFiscale());
        mvtDto.setDateUltDeclCaf(operationsDeleguee.getDateUltDeclCaf());
        mvtDto.setMntAvance(operationsDeleguee.getMntAvance());
        mvtDto.setMntUtilise(operationsDeleguee.getMntUtilise());
        mvtDto.setMntAutorise(operationsDeleguee.getMntAutorise());
        mvtDto.setMntAutoriseBct(operationsDeleguee.getMntAutoriseBct());
        mvtDto.setMntReserve(operationsDeleguee.getMntReserve());
        mvtDto.setMntBlocage(operationsDeleguee.getMntBlocage());
        mvtDto.setSolde(operationsDeleguee.getSolde());
        mvtDto.setMntCa(operationsDeleguee.getMntCa());
        mvtDto.setMntCaFiscal(operationsDeleguee.getMntCaFiscal());
        mvtDto.setMntImportation(operationsDeleguee.getMntImportation());
        mvtDto.setNumeroBct(operationsDeleguee.getNumeroBct());
        mvtDto.setDateBct(operationsDeleguee.getDateBct());
        mvtDto.setEcheance(operationsDeleguee.getEcheance());
        mvtDto.setAnnee(operationsDeleguee.getAnnee());
        Integer newNumMvtAva = (operationsDeleguee.getDernierNumMvtAva() != null
                ? operationsDeleguee.getDernierNumMvtAva() : 0) + 1;
        mvtDto.setNumMvtAva(newNumMvtAva);
        mvtDto.setEtatDossier(operationsDeleguee.getEtatDossier());
        mvtDto.setDateEtat(operationsDeleguee.getDateEtat());
        mvtDto.setMotifEtat(operationsDeleguee.getMotifEtat());
        mvtDto.setDateValidation(operationsDeleguee.getDateEtat());
        mvtDto.setDateMvtAva(dto.getDateDosRap());
        mvtDto.setMntMvtAva(dto.getMntMvtTnd());
        mvtDto.setCodeProduitService(dto.getCodeProduitService() != null ? dto.getCodeProduitService().shortValue() : null);
        mvtDto.setCodeOperation(dto.getCodeOperation());

        Integer codeOperation = dto.getCodeOperation();
        if (codeOperation == null) {
            log.error("codeOperation is null for DTO numDossierAva: {}", dto.getNumDossierAva());
            throw new RuntimeException("codeOperation cannot be null");
        }
        Integer codeOrigine = switch (codeOperation) {
            case 0 -> 2;
            case 1 -> 1;
            case 2 -> 1;
            case 3 -> 1;
            case 4 -> 1;
            case 5 -> 1;
            case 204  -> 1; // Exportateur
            case 9021 -> 1; // Suspension
            case 221  -> 1; // Levee de suspension
            case 2021 -> 1; // MAJ beneficiaire
            default -> 1;
        };
        mvtDto.setCodeOrigine(codeOrigine);

        if (finalizeFlag) {
            mvtDto.setStatus(STATUS_FINALIZED);
        } else {
            mvtDto.setStatus(STATUS_PENDING);
        }

        log.info("AVANT createMvtForRapatriementExportateur - refOperation dans DTO: {}, dateOperation: {}, status: {}",
                mvtDto.getRefOperation(), mvtDto.getDateOperation(), mvtDto.getStatus());
        ExportateurDTO createdMvt = operationsDelegueesMvtService.createMvtForRapatriementExportateur(mvtDto);
        log.info("APRES createMvtForRapatriementExportateur - refOperation retourne: {}, dateOperation: {}",
                createdMvt != null ? createdMvt.getRefOperation() : "NULL",
                createdMvt != null ? createdMvt.getDateOperation() : "NULL");
        if (createdMvt != null && createdMvt.getRefOperation() != null) {
            log.info("OperationsDelegueesMvt cree et persiste avec succes - refOperation: {}, dateOperation: {}",
                     createdMvt.getRefOperation(), createdMvt.getDateOperation());
        } else {
            log.warn("OperationsDelegueesMvt cree mais DTO retourne est null ou incomplet");
        }

        // ===== Contrôles de saisie (appliqués quel que soit finalize) =====
        validateRequiredFields(dto);
        isDateRapValid(dto.getDateDosRap());

        if (finalizeFlag) {
            // ===================== FINALIZE == TRUE =====================

            OperationExportateurAVA entity = operationExportateurAVAMapper.toEntity(dto);
            entity.setDateInsertion(LocalDateTime.now());
            entity.setNumId(operationExportateurAVARepository.getNextNumId());
            OperationExportateurAVA savedEntity = operationExportateurAVARepository.save(entity);
            log.info("Operation ExportateurAVA creee avec ID: {}", savedEntity.getNumId());

            // Update dernierNumMvtAva (status='A')
            operationsDeleguee.setDernierNumMvtAva(newNumMvtAva);

            BigDecimal mntMvtTnd = savedEntity.getMntMvtTnd();
            if (mntMvtTnd != null) {
                BigDecimal currentMntAutorise = operationsDeleguee.getMntAutorise() != null ? operationsDeleguee.getMntAutorise() : BigDecimal.ZERO;
                BigDecimal newMntAutorise = currentMntAutorise.add(mntMvtTnd);
                BigDecimal plafond = BigDecimal.valueOf(500000);

                if (newMntAutorise.compareTo(plafond) > 0) {
                    operationsDeleguee.setMntAutorise(plafond);
                    log.info("MntAutorise plafonne a {} TND (montant calcule: {} TND depassait le plafond)",
                             plafond, newMntAutorise);
                } else {
                    operationsDeleguee.setMntAutorise(newMntAutorise);
                    log.info("MntAutorise mis a jour: {} + {} = {} TND",
                             currentMntAutorise, mntMvtTnd, newMntAutorise);
                }

                // Recalcul du solde après modification de mntAutorise
                BigDecimal nouveauSolde = businessRulesService.calculerSolde(
                        operationsDeleguee.getMntAutorise(),
                        operationsDeleguee.getMntAvance(),
                        operationsDeleguee.getMntAutoriseBct(),
                        operationsDeleguee.getMntUtilise(),
                        operationsDeleguee.getMntReserve(),
                        operationsDeleguee.getMntBlocage()
                );
                operationsDeleguee.setSolde(nouveauSolde);
                log.info("Solde recalculé: {}", nouveauSolde);
            }

            operationsDelegueeRepository.save(operationsDeleguee);
            log.info("OperationsDeleguee mis a jour et persiste avec succes - numDossier: {}, mntAutorise: {}, dernierNumMvtAva: {}",
                     operationsDeleguee.getNumDossier(), operationsDeleguee.getMntAutorise(), operationsDeleguee.getDernierNumMvtAva());

            log.info("=== FIN createRapatriement (finalize=true) === numDossierAva: {}, thread: {}",
                    dto.getNumDossierAva(), Thread.currentThread().getName());
            
            OperationExportateurAVADTO resultDto = operationExportateurAVAMapper.toDTO(savedEntity);
            
            // Génération du rapport PDF
            try {
                Map<String, Object> parameters = new HashMap<>();
                parameters.put("typeAllocation", "1");
                  parameters.put("titulaireAllocation", String.valueOf(dto.getNumDossierAva()));
                  parameters.put("codeIdentification", "C");

                  // Récupération de la banque via l'API REF
                  String codeBanqueStr = "";
                  String libelleBanque = "";
                  
                  if (operationsDeleguee.getCodeBanqueProvenance() != null) {
                      codeBanqueStr = String.valueOf(operationsDeleguee.getCodeBanqueProvenance());
                      
                      try {
                          IbansysPoc.AVA.DTO.BanqueDTO banque = apiExterneService.getBanqueByCode(
                                  operationsDeleguee.getCodeBanqueProvenance().shortValue()
                          );
                          if (banque != null && banque.getLibBanque() != null) {
                              libelleBanque = banque.getLibBanque();
                          }
                      } catch (Exception e) {
                           log.warn("Impossible de récupérer le libellé de la banque via API REF", e);
                      }
                  }
                  
                  parameters.put("codeBanque", codeBanqueStr);
                  parameters.put("intermediaire", libelleBanque);

                  // Code d'agence à partir du dossier (operationsDeleguee)
                  String codeAgenceStr = "";
                  String libelleAgence = "";
                  
                  if (operationsDeleguee.getCodeAgenceAva() != null) {
                      codeAgenceStr = String.valueOf(operationsDeleguee.getCodeAgenceAva());
                      
                      // Utiliser l'API externe (via table banque) pour récupérer le libellé de l'agence
                      try {
                          IbansysPoc.AVA.DTO.BanqueDTO agenceBank = apiExterneService.getBanqueByCode(
                                  operationsDeleguee.getCodeAgenceAva()
                          );
                          if (agenceBank != null && agenceBank.getLibBanque() != null) {
                              libelleAgence = agenceBank.getLibBanque();
                          }
                      } catch (Exception e) {
                           log.warn("Impossible de récupérer le libellé de l'agence via API REF (Banque)", e);
                      }
                  }
                  
                  parameters.put("codeAgence", codeAgenceStr);
                  parameters.put("agence", libelleAgence);

                // Récupération de l'adresse et du nom complet via l'API REF, et du nom direct depuis la BD locale (table beneficiaire)
                String adresseBenef = ""; 
                String nomTitulaire = dto.getNoPieceBenef() != null ? dto.getNoPieceBenef() : "";
                String nomBeneficiaireSeul = "";
                
                try {
                    if (dto.getNumDossierAva() != null) {
                        java.util.List<IbansysPoc.AVA.entity.Beneficiaire> benefs = beneficiaireRepository.findByIdNumDossier(dto.getNumDossierAva().intValue());
                        if (benefs != null && !benefs.isEmpty()) {
                            // On cherche le bénéficiaire qui correspond à noPieceBenef
                            nomBeneficiaireSeul = benefs.stream()
                                    .filter(b -> b.getId().getNoPieceBenef().trim().equals(dto.getNoPieceBenef().trim()))
                                    .map(IbansysPoc.AVA.entity.Beneficiaire::getNomBenef)
                                    .findFirst()
                                    .orElse("");
                        }
                    }
                } catch (Exception e) {
                     log.warn("Impossible de récupérer le nom du bénéficiaire depuis la BD locale", e);
                }

                try {
                    Integer typePiece = dto.getTypePieceBenef() != null ? dto.getTypePieceBenef() : 1;
                    String noPiece = dto.getNoPieceBenef() != null ? dto.getNoPieceBenef() : "";

                    IbansysPoc.AVA.DTO.PersonneDTO pers = apiExterneService.getPersonneInfo(typePiece, noPiece);
                    
                    if (pers != null) {
                        // Construction du nom (Nom + Prénom) pour le bénéficiaire pour l'affichage général
                        String nom = pers.getNom() != null ? pers.getNom() : "";
                        String prenom = pers.getPrenom() != null ? pers.getPrenom() : "";
                        String fullName = (nom + " " + prenom).trim();
                        if (!fullName.isEmpty()) {
                            nomTitulaire = fullName;
                        }

                        // Construction de l'adresse
                        String adr1 = pers.getAdrRes1() != null ? pers.getAdrRes1() : "";
                        String adr2 = pers.getAdrRes2() != null ? pers.getAdrRes2() : "";
                        String adr3 = pers.getAdrRes3() != null ? pers.getAdrRes3() : "";
                        adresseBenef = (adr1 + " " + adr2 + " " + adr3).trim();
                    }
                } catch (Exception e) {
                     log.warn("Impossible de récupérer les informations du bénéficiaire via API REF", e);
                }
                
                parameters.put("adresse", adresseBenef);
                parameters.put("nomOuDenomination", nomTitulaire);

                // --- Récupération optionnelle du pays et de la devise ---
                String libellePaysDevise = "";
                String libelleDeviseStr = dto.getCodeDevise() != null ? String.valueOf(dto.getCodeDevise()) : "";

                if (dto.getCodeDevise() != null) {
                    try {
                        java.util.List<Object> devises = apiExterneService.getDevises();
                        java.util.Map<?, ?> targetDevise = devises.stream()
                            .filter(d -> d instanceof java.util.Map)
                            .map(d -> (java.util.Map<?, ?>) d)
                            .filter(map -> dto.getCodeDevise().equals(map.get("codeDevise"))) // On trouve la devise
                            .findFirst()
                            .orElse(null);

                        if (targetDevise != null) {
                            Object libPays = targetDevise.get("libellePays");
                            if (libPays != null) libellePaysDevise = libPays.toString();

                            Object libDev = targetDevise.get("libelleDevise"); // essayer libelleDevise
                            if (libDev == null) {
                                libDev = targetDevise.get("libDevise"); // essayer libDevise
                            }
                            if (libDev != null) libelleDeviseStr = libDev.toString();
                        }
                    } catch (Exception e) {
                        log.warn("Impossible de récupérer la devise via API REF", e);
                    }
                }

                // Variables issues du JSON d'entrée d'exportateur
                parameters.put("mntRap", dto.getMntRap());
                parameters.put("codeDevise", libelleDeviseStr);
                parameters.put("codeBanqueProvenance", dto.getCodeBanqueProvenance());
                parameters.put("numeroCompte", dto.getNumeroCompte());

                // Creer les lignes du tableau avec designation = "RAP" et origineFonds = "1"
                java.util.List<IbansysPoc.AVA.DTO.ExportateurReportRowDTO> reportRows = new java.util.ArrayList<>();
                IbansysPoc.AVA.DTO.ExportateurReportRowDTO row = new IbansysPoc.AVA.DTO.ExportateurReportRowDTO();
                row.setDate(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                row.setDesignation("RAP");
                row.setCreditOrigineFonds("1");
                row.setDebitPays(!libellePaysDevise.isEmpty() ? libellePaysDevise : String.valueOf(dto.getCodeDevise()));
                row.setDroitsTransfertCumules(dto.getMntMvtTnd());
                row.setMontantsTransfertsCumules(operationsDeleguee.getMntAutorise());
                row.setBeneficiaireCodeType("C");
                row.setBeneficiaireCodeNumero(dto.getNoPieceBenef());
                row.setBeneficiaireNomsPrenoms(!nomBeneficiaireSeul.isEmpty() ? nomBeneficiaireSeul : nomTitulaire);
                reportRows.add(row);

                byte[] pdfBytes = reportService.generatePdfReport("classpath:reports/exportateur_template.jrxml", parameters, reportRows);
                resultDto.setPdfBase64(Base64.getEncoder().encodeToString(pdfBytes));
                log.info("Rapport PDF exportateur généré avec succès et encodé en Base64");
            } catch (Exception e) {
                log.error("Échec de la génération du rapport PDF exportateur", e);
            }

            return resultDto;

        } else {
            // ===================== FINALIZE == FALSE =====================
            log.info("=== FIN createRapatriement (finalize=false) === MVT seul créé pour numDossierAva: {}, thread: {}",
                    dto.getNumDossierAva(), Thread.currentThread().getName());

            OperationExportateurAVADTO resultDto = new OperationExportateurAVADTO();
            resultDto.setNumDossierAva(dto.getNumDossierAva());
            resultDto.setDateOperation(dto.getDateOperation());
            resultDto.setCodeOperation(dto.getCodeOperation());
            resultDto.setCodeProduitService(dto.getCodeProduitService());
            resultDto.setMntRap(dto.getMntRap());
            resultDto.setMntMvtTnd(dto.getMntMvtTnd());
            return resultDto;
        }
    }

    /**
     * Resout le codeTypeMvtAva en fonction du codeOperation fourni par le client.
     *  1    -> RAP  (Rapatriement)
     *  204  -> EXP  (Exportateur)
     *  9021 -> SUS  (Suspension)
     *  221  -> LEV  (Levee de suspension)
     *  2021 -> MAJ  (MAJ beneficiaire)
     */
    private String resolveCodeTypeMvtAva(int codeOperation) {
        return switch (codeOperation) {
            case 204  -> "EXP";
            case 9021 -> "SUS";
            case 221  -> "LEV";
            case 2021 -> "MAJ";
            default   -> "RAP";
        };
    }

    /**
     * Valide que tous les champs obligatoires sont presents et non nulls.
     */
    private void validateRequiredFields(OperationExportateurAVADTO dto) {
        if (dto.getNumDossierAva() == null) {
            throw new IllegalArgumentException("Le numero de dossier AVA est obligatoire");
        }
        if (dto.getDateDosRap() == null) {
            throw new IllegalArgumentException("La date de rapatriement est obligatoire");
        }
        if (dto.getNumeroCompte() == null || dto.getNumeroCompte().trim().isEmpty()) {
            throw new IllegalArgumentException("Le numero de compte est obligatoire");
        }
        if (!dto.getNumeroCompte().trim().matches("\\d{13}")) {
            throw new BusinessException("FORMAT_COMPTE_INVALIDE",
                    "Le numero de compte (numeroCompte) doit contenir exactement 13 chiffres");
        }
        if (dto.getTypePieceBenef() == null) {
            throw new IllegalArgumentException("Le type de piece du beneficiaire est obligatoire");
        }
        if (dto.getNoPieceBenef() == null || dto.getNoPieceBenef().trim().isEmpty()) {
            throw new IllegalArgumentException("Le numero de piece du beneficiaire est obligatoire");
        }
        // Validation format CIN : 7 chiffres suivis d'une lettre
        if (Integer.valueOf(1).equals(dto.getTypePieceBenef())) {
            if (!dto.getNoPieceBenef().trim().matches("\\d{7}[A-Za-z]")) {
                throw new BusinessException("FORMAT_CIN_INVALIDE",
                        "Le format du CIN (noPieceBenef) est invalide : doit contenir exactement 7 chiffres suivis d'une lettre (ex: 1234567A)");
            }
        }
        // Vérification existence du client dans la table Personne via l'API REF
        boolean existe = apiExterneService.existsPersonneByNoPiece(dto.getNoPieceBenef().trim());
        if (!existe) {
            throw new BusinessException("CLIENT_NON_TROUVE",
                    "Le client n'est pas trouvé dans la table Personne (noPieceBenef=" + dto.getNoPieceBenef().trim() + ")");
        }
        if (dto.getMntRap() != null && dto.getMntRap().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant de rapatriement doit etre positif");
        }
    }

    /**
     * Valide si la date de rapatriement est dans les 3 derniers mois.
     */
    private boolean isDateRapValid(LocalDate dateRap) {
        LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
        if (dateRap.isBefore(threeMonthsAgo)) {
            throw new IllegalArgumentException("La date de rapatriement doit etre dans les 3 derniers mois. Date fournie: " + dateRap);
        }
        return true;
    }
}
