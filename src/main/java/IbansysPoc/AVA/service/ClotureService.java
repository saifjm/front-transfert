package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.ClotureDTO;
import IbansysPoc.AVA.DTO.OuvertureDossierDTO;

public interface ClotureService {
    OuvertureDossierDTO cloturerDossier(Integer numDossier, ClotureDTO dto, boolean finalizeFlag);
}
