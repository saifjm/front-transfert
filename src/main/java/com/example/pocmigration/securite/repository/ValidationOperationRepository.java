package com.example.pocmigration.securite.repository;

import com.example.pocmigration.securite.entity.ValidationOperation;
import com.example.pocmigration.securite.entity.ValidationOperationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ValidationOperationRepository extends JpaRepository<ValidationOperation, ValidationOperationId> {
    List<ValidationOperation> findByMatEmpAndDateValidation(Integer matEmp, LocalDate dateValidation);
}

