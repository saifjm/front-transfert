package IbansysPoc.AVA.service.impl;

import IbansysPoc.AVA.DTO.ClotureDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;
import IbansysPoc.AVA.entity.OperationsDeleguee;
import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.entity.OperationsDelegueesMvtId;
import IbansysPoc.AVA.mapper.OperationsDelegueeMapper;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.repository.OperationsDelegueeRepository;
import IbansysPoc.AVA.service.ClotureService;
import IbansysPoc.AVA.exception.BusinessException;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class ClotureServiceImpl implements ClotureService {

    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeMapper mapper;

    public ClotureServiceImpl(OperationsDelegueeRepository operationsDelegueeRepository,
                              OperationsDelegueeMvtRepository mvtRepository,
                              OperationsDelegueeMapper mapper) {
        this.operationsDelegueeRepository = operationsDelegueeRepository;
        this.mvtRepository = mvtRepository;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public OuvertureDossierDTO cloturerDossier(Integer numDossier, ClotureDTO dto, boolean finalizeFlag) {
        // 1. Verrouillage Pessimiste
        OperationsDeleguee dossier = operationsDelegueeRepository.findByIdForUpdate(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_INTROUVABLE", "Dossier introuvable : " + numDossier));

        // 2. Vérification d'état
        if ("C".equals(dossier.getEtatDossier())) {
            throw new BusinessException("DOSSIER_DEJA_CLOTURE", "Le dossier est déjà clôturé");
        }

        // 3. Création du Mouvement (MVT)
        Integer newNumMvtAva = (dossier.getDernierNumMvtAva() != null ? dossier.getDernierNumMvtAva() : 0) + 1;
        Long refOperation = mvtRepository.getNextRefOperation();

        OperationsDelegueesMvt mvt = new OperationsDelegueesMvt();
        BeanUtils.copyProperties(dossier, mvt, "id", "beneficiaires", "documents", "avaMarche", "beneficiairesListe");

        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setRefOperation(refOperation);
        mvtId.setDateOperation(LocalDate.now());
        mvt.setId(mvtId);

        // Appliquer les données de la clôture au Mouvement
        mvt.setEtatDossier("C");
        mvt.setMotifEtat(dto.getMotif());
        mvt.setDateEtat(dto.getDateCloture());
        mvt.setReferenceCloture(dto.getReference());
        mvt.setNumMvtAva(newNumMvtAva);

        // NOUS AVONS AJOUTE CES DEUX LIGNES
        mvt.setCodeProduitService((short) 108);
        mvt.setCodeOperation(222);
        
        // Le typePieceClient prend celui du dossier
        mvt.setTypePieceClient(dossier.getTypePieceClient() != null ? dossier.getTypePieceClient().intValue() : null);

        if (!finalizeFlag) {
            mvt.setStatus("X");
            mvtRepository.save(mvt);
        } else {
            mvt.setStatus("A");
            
            dossier.setEtatDossier("C");
            dossier.setMotifEtat(dto.getMotif());
            dossier.setDateEtat(dto.getDateCloture());
            dossier.setDernierNumMvtAva(newNumMvtAva);
            
            mvtRepository.save(mvt);
            operationsDelegueeRepository.save(dossier);
        }

        return mapper.toDTO(dossier);
    }
}
