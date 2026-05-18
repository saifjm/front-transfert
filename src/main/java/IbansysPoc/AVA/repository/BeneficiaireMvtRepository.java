package IbansysPoc.AVA.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.BeneficiairesMvt;
import IbansysPoc.AVA.entity.BeneficiairesMvtId;

@Repository
public interface BeneficiaireMvtRepository extends JpaRepository<BeneficiairesMvt, BeneficiairesMvtId> {
    List<BeneficiairesMvt> findByIdRefOperation(Long refOperation);
    List<BeneficiairesMvt> findByIdNumDossier(Integer numDossier);
    List<BeneficiairesMvt> findByCodeAgenceAva(Short codeAgenceAva);


}
