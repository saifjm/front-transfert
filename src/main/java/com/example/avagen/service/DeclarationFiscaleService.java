package com.example.avagen.service;

import com.example.avagen.entity.DeclarationFiscale;
import com.example.avagen.repository.DeclarationFiscaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Year;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeclarationFiscaleService {

    private final DeclarationFiscaleRepository declarationFiscaleRepository;
    private final ApiExterneService apiservice;
    private final EntityManager entityManager;

    public Optional<DeclarationFiscale> getDeclarationFiscaleForPreviousYear(
            Integer typePieceClient,
            String noPieceClient) {
        Short anneePrecedente = (short) (Year.now().getValue() - 1);
        log.info("Recherche DeclarationFiscale: typePieceClient={}, noPieceClient={}, annee={}",
                typePieceClient, noPieceClient, anneePrecedente);

        Optional<DeclarationFiscale> result = declarationFiscaleRepository.findByTypePieceClientAndNoPieceClientAndAnnee(
                typePieceClient,
                noPieceClient,
                anneePrecedente);

        log.info("Résultat trouvé: {}", result.isPresent());
        return result;
    }

    public String getEtat(Integer typePieceClient, String noPieceClient) {
        return getDeclarationFiscaleForPreviousYear(typePieceClient, noPieceClient)
                .map(DeclarationFiscale::getEtat)
                .orElse(null);
    }

    public BigDecimal getMntCaFiscal(Integer typePieceClient, String noPieceClient) {
        return getDeclarationFiscaleForPreviousYear(typePieceClient, noPieceClient)
                .map(DeclarationFiscale::getMntCaFiscal)
                .orElse(null);
    }

    public Optional<DeclarationFiscale> getDeclarationFiscaleForPreviousofthePreviousYear(
            Integer typePieceClient,
            String noPieceClient) {
        Short anneePrecedente = (short) (Year.now().getValue() - 2);
        return declarationFiscaleRepository.findByTypePieceClientAndNoPieceClientAndAnnee(
                typePieceClient,
                noPieceClient,
                anneePrecedente);
    }

    /**
     * Sauvegarde une déclaration fiscale (création ou mise à jour)
     *
     * @param declarationFiscale la déclaration fiscale à sauvegarder
     * @return la déclaration fiscale sauvegardée
     */
    public DeclarationFiscale save(DeclarationFiscale declarationFiscale) {
        // JPA will populate referenceDeclaration from SEQ_DECLA because it's defined with @GeneratedValue(SEQUENCE)
        log.info("Sauvegarde DeclarationFiscale: referenceDeclaration={}, typePieceClient={}, noPieceClient={}, annee={}",
                declarationFiscale.getReferenceDeclaration(),
                declarationFiscale.getTypePieceClient(),
                declarationFiscale.getNoPieceClient(),
                declarationFiscale.getAnnee());

        declarationFiscale.setEtat("V");
        return declarationFiscaleRepository.save(declarationFiscale);
    }
}
