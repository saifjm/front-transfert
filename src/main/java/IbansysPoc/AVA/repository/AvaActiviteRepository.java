package IbansysPoc.AVA.repository;

import IbansysPoc.AVA.entity.AvaActivite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour la table AVA_ACTIVITE.
 */
@Repository
public interface AvaActiviteRepository extends JpaRepository<AvaActivite, Integer> {

    /**
     * Recherche une activité par son code.
     *
     * @param codeActivite Code de l'activité
     * @return L'activité si trouvée
     */
    Optional<AvaActivite> findByCodeActivite(Integer codeActivite);

    /**
     * Vérifie si une activité existe par son code.
     *
     * @param codeActivite Code de l'activité
     * @return true si l'activité existe
     */
    boolean existsByCodeActivite(Integer codeActivite);

    List<AvaActivite> findAll();
}

