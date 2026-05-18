package com.example.securiteservice.repository;

import com.example.securiteservice.entity.Operation;
import com.example.securiteservice.entity.OperationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OperationRepository extends JpaRepository<Operation, OperationId> {
    List<Operation> findById_CodeOperation(Integer codeOperation);

    List<Operation> findById_CodeProduitService(Integer codeProduitService);

    Optional<Operation> findById_CodeProduitServiceAndId_CodeOperation(Integer codeProduitService, Integer codeOperation);
}
