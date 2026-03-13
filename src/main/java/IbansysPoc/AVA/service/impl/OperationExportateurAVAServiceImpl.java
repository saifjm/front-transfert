package IbansysPoc.AVA.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import IbansysPoc.AVA.DTO.ExportateurDTO;
import IbansysPoc.AVA.DTO.OperationExportateurAVADTO;
import IbansysPoc.AVA.entity.OperationExportateurAVA;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.exception.BusinessException;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.OperationExportateurAVAMapper;
import IbansysPoc.AVA.repository.OperationExportateurAVARepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.ApiExterneService;
import IbansysPoc.AVA.service.OperationExportateurAVAService;
import IbansysPoc.AVA.service.OperationsDelegueesMvtService;
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
    private final OperationExportateurAVAMapper operationExportateurAVAMapper;
    private final OperationsDelegueesMvtService operationsDelegueesMvtService;
    private final ApiExterneService apiExterneService;

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
            }

            operationsDelegueeRepository.save(operationsDeleguee);
            log.info("OperationsDeleguee mis a jour et persiste avec succes - numDossier: {}, mntAutorise: {}, dernierNumMvtAva: {}",
                     operationsDeleguee.getNumDossier(), operationsDeleguee.getMntAutorise(), operationsDeleguee.getDernierNumMvtAva());

            log.info("=== FIN createRapatriement (finalize=true) === numDossierAva: {}, thread: {}",
                    dto.getNumDossierAva(), Thread.currentThread().getName());
            return operationExportateurAVAMapper.toDTO(savedEntity);

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
