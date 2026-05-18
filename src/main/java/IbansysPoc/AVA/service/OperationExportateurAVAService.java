package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.OperationExportateurAVADTO;

public interface OperationExportateurAVAService {

    OperationExportateurAVADTO createRapatriement(OperationExportateurAVADTO dto);

    /**
     * Crée une opération de rapatriement avec option de finalisation.
     *
     * Si finalizeFlag == true : logique complète (OperationExportateurAVA + MVT status='A' + update OperationsDeleguee).
     * Si finalizeFlag == false : création du MVT uniquement, sans persister OperationExportateurAVA ni modifier OperationsDeleguee.
     *
     * @param dto           Le DTO contenant les informations de l'opération AVA
     * @param finalizeFlag  true pour finaliser, false pour MVT uniquement
     * @return Le DTO de l'opération (complet si finalize=true, minimal si finalize=false)
     */
    OperationExportateurAVADTO createRapatriement(OperationExportateurAVADTO dto, boolean finalizeFlag);
}
