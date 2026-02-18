package com.example.avagen.repository;

import com.example.avagen.entity.DeclarationFiscale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeclarationFiscaleRepository extends JpaRepository<DeclarationFiscale, Long> {

    /**
     * Recherche une déclaration fiscale par type de pièce client, numéro de pièce client et année.
     * Utilisé quand codeTypeDosAva = 3
     *
     * @param typePieceClient type de pièce client (Integer)
     * @param noPieceClient   numéro de pièce client
     * @param annee           année
     * @return Optional contenant la déclaration fiscale si trouvée
     */
    Optional<DeclarationFiscale> findByTypePieceClientAndNoPieceClientAndAnnee(
            Integer typePieceClient,
            String noPieceClient,
            Short annee);
}
