package IbansysPoc.AVA.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.AvaMarcheMvt;
import IbansysPoc.AVA.entity.AvaMarcheMvtId;

@Repository
public interface AvaMarcheMvtRepository extends JpaRepository<AvaMarcheMvt, AvaMarcheMvtId> {
    List<AvaMarcheMvt> findByIdNumMarche(String numMarche);
    List<AvaMarcheMvt> findByIdRefOperation(Integer refOperation);
    List<AvaMarcheMvt> findByCodeAgenceAva(Short codeAgenceAva);
    List<AvaMarcheMvt> findByStatus(String status);
}
