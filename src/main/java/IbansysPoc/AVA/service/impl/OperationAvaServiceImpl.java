package IbansysPoc.AVA.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import IbansysPoc.AVA.DTO.ExportateurDTO;
import IbansysPoc.AVA.DTO.OperationAvaDTO;
import IbansysPoc.AVA.entity.OperationAva;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.exception.ResourceNotFoundException;
import IbansysPoc.AVA.mapper.OperationAvaMapper;
import IbansysPoc.AVA.repository.OperationAvaRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.OperationAvaService;
import IbansysPoc.AVA.service.OperationsDelegueesMvtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationAvaServiceImpl implements OperationAvaService {

    /** Constante pour le status finalisé du MVT. */
    public static final String STATUS_FINALIZED = "A";

    private final OperationAvaRepository operationAvaRepository;
    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final OperationAvaMapper operationAvaMapper;
    private final OperationsDelegueesMvtService operationsDelegueesMvtService;

    /**
     * Délègue à la version avec finalizeFlag = true (comportement par défaut / rétrocompatibilité).
     */
    @Override
    public OperationAvaDTO createRapatriement(OperationAvaDTO dto) {
        return createRapatriement(dto, true);
    }

    @Override
    public OperationAvaDTO createRapatriement(OperationAvaDTO dto, boolean finalizeFlag) {
        log.info("=== DEBUT createRapatriement === numDossierAva: {}, dateOperation: {}, finalize: {}, thread: {}",
                dto.getNumDossierAva(), dto.getDateOperation(), finalizeFlag, Thread.currentThread().getName());

        // Validation minimale : numDossierAva toujours requis
        if (dto.getNumDossierAva() == null) {
            throw new IllegalArgumentException("Le numero de dossier AVA est obligatoire");
        }

        // Validation: numDossierAva doit exister dans OperationsDeleguee
        OperationsDeleguee operationsDeleguee = operationsDelegueeRepository.findById(dto.getNumDossierAva().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Operation deleguee non trouvee avec numDossier: " + dto.getNumDossierAva()));

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
        // Construire le DTO MVT à partir de l'opération déléguée
        ExportateurDTO mvtDto = new ExportateurDTO();
        Long generatedRefOperation = operationAvaRepository.getNextRefOperation();
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
       // mvtDto.setCodeBanqueProvenance(operationsDeleguee.getCodeBanqueProvenance());
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
        mvtDto.setNumMvtAva(operationsDeleguee.getDernierNumMvtAva());
        mvtDto.setEtatDossier(operationsDeleguee.getEtatDossier());
        mvtDto.setDateEtat(operationsDeleguee.getDateEtat());
        mvtDto.setMotifEtat(operationsDeleguee.getMotifEtat());
        mvtDto.setDateValidation(operationsDeleguee.getDateEtat());

        // Mapper les champs de calcul du DTO rapatriement
        mvtDto.setDateMvtAva(dto.getDateDosRap());
        mvtDto.setMntMvtAva(dto.getMntMvtTnd());
        mvtDto.setCodeProduitService(dto.getCodeProduitService() != null ? dto.getCodeProduitService().shortValue() : null);
        mvtDto.setCodeOperation(dto.getCodeOperation());

        // Definir codeOrigine base sur codeOperation
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

        // Affecter le status : 'A' si finalize=true, sinon reprendre l'etatDossier existant
        if (finalizeFlag) {
            mvtDto.setStatus(STATUS_FINALIZED);
        } else {
            mvtDto.setStatus(operationsDeleguee.getEtatDossier());
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

            // Sauvegarder l'entité OperationAva
            OperationAva entity = operationAvaMapper.toEntity(dto);
            entity.setDateInsertion(LocalDateTime.now());
            entity.setNumId(operationAvaRepository.getNextNumId());
            OperationAva savedEntity = operationAvaRepository.save(entity);
            log.info("Operation AVA creee avec ID: {}", savedEntity.getNumId());

            // Mise a jour d OperationsDeleguees - Le montant du mouvement s ajoute au montant autorise
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

                operationsDelegueeRepository.save(operationsDeleguee);
                log.info("OperationsDeleguee mis a jour et persiste avec succes - numDossier: {}, mntAutorise: {}", 
                         operationsDeleguee.getNumDossier(), operationsDeleguee.getMntAutorise());
            }

            log.info("=== FIN createRapatriement (finalize=true) === numDossierAva: {}, thread: {}", 
                    dto.getNumDossierAva(), Thread.currentThread().getName());
            return operationAvaMapper.toDTO(savedEntity);

        } else {
            // ===================== FINALIZE == FALSE =====================
            // MVT déjà créé ci-dessus. Pas de sauvegarde OperationAva ni mise à jour OperationsDeleguee.
            log.info("=== FIN createRapatriement (finalize=false) === MVT seul créé pour numDossierAva: {}, thread: {}", 
                    dto.getNumDossierAva(), Thread.currentThread().getName());

            // Retourner un DTO minimal avec les infos du dossier
            OperationAvaDTO resultDto = new OperationAvaDTO();
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
     * @param dto Le DTO a valider
     * @throws IllegalArgumentException si un champ obligatoire est manquant ou null
     */
    private void validateRequiredFields(OperationAvaDTO dto) {
        if (dto.getNumDossierAva() == null) {
            throw new IllegalArgumentException("Le numero de dossier AVA est obligatoire");
        }
        if (dto.getDateDosRap() == null) {
            throw new IllegalArgumentException("La date de rapatriement est obligatoire");
        }
        if (dto.getNumeroCompte() == null || dto.getNumeroCompte().trim().isEmpty()) {
            throw new IllegalArgumentException("Le numero de compte est obligatoire");
        }
        if (dto.getTypePieceBenef() == null) {
            throw new IllegalArgumentException("Le type de piece du beneficiaire est obligatoire");
        }
        if (dto.getNoPieceBenef() == null || dto.getNoPieceBenef().trim().isEmpty()) {
            throw new IllegalArgumentException("Le numero de piece du beneficiaire est obligatoire");
        }

        // Validation supplementaire pour mntRap si present
        if (dto.getMntRap() != null && dto.getMntRap().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant de rapatriement doit etre positif");
        }
    }

    /**
     * Valide si la date de rapatriement est dans les 3 derniers mois.
     * @param dateRap La date a valider
     * @return true si valide
     * @throws IllegalArgumentException si invalide
     */
    private boolean isDateRapValid(LocalDate dateRap) {
        LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
        if (dateRap.isBefore(threeMonthsAgo)) {
            throw new IllegalArgumentException("La date de rapatriement doit etre dans les 3 derniers mois. Date fournie: " + dateRap);
        }
        return true;
    }
}