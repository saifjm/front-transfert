package IbansysPoc.AVA.service;

import IbansysPoc.AVA.DTO.TraitementAvaDTO;

/**
 * Service pour le traitement AVA.
 * Équivalent de la procédure PL/SQL TRAITEMENT_AVA.
 */
public interface TraitementAvaService {

    /**
     * Effectue le traitement AVA pour une déclaration fiscale.
     *
     * @param dto DTO contenant les paramètres d'entrée (codeTypeDosAva, numDossier, dateDossier, annee, mntCaFiscalHT)
     */
    void traiterDeclarationFiscale(TraitementAvaDTO dto);

}
