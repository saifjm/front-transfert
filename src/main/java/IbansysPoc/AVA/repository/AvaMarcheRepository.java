package IbansysPoc.AVA.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.AvaMarche;

@Repository
public interface AvaMarcheRepository extends JpaRepository<AvaMarche, Integer> {
    List<AvaMarche> findByNumMarche(String numMarche);
    List<AvaMarche> findByCodeAgenceAva(Short codeAgenceAva);
    List<AvaMarche> findByStatus(String status);
}
