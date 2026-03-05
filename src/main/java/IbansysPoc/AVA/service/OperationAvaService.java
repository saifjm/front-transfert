package IbansysPoc.AVA.service;
import IbansysPoc.AVA.DTO.OperationAvaDTO;
public interface OperationAvaService {


    OperationAvaDTO createRapatriement(OperationAvaDTO dto);

    /**
     * Crée une opération de rapatriement avec option de finalisation.
     *
     * Si finalizeFlag == true : logique complète (OperationAva + MVT status='A' + update OperationsDeleguee).
     * Si finalizeFlag == false : création du MVT uniquement, sans persister OperationAva ni modifier OperationsDeleguee.
     *
     * @param dto           Le DTO contenant les informations de l'opération AVA
     * @param finalizeFlag  true pour finaliser, false pour MVT uniquement
     * @return Le DTO de l'opération (complet si finalize=true, minimal si finalize=false)
     */
    OperationAvaDTO createRapatriement(OperationAvaDTO dto, boolean finalizeFlag);
}