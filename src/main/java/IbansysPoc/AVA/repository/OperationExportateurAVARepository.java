package IbansysPoc.AVA.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import IbansysPoc.AVA.entity.OperationExportateurAVA;

@Repository
public interface OperationExportateurAVARepository extends JpaRepository<OperationExportateurAVA, Long> {

    @Query(value = "SELECT AVA.AVA_NUM_DOSSIER_SEQ.NEXTVAL FROM DUAL", nativeQuery = true)
    Long getNextNumId();

    @Query(value = "SELECT AVA.AVA_REF_OPR.NEXTVAL FROM DUAL", nativeQuery = true)
    Long getNextRefOperation();
}
