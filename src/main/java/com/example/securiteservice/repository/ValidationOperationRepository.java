package com.example.securiteservice.repository;

import com.example.securiteservice.entity.ValidationOperation;
import com.example.securiteservice.entity.ValidationOperationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ValidationOperationRepository extends JpaRepository<ValidationOperation, ValidationOperationId> {
    List<ValidationOperation> findByMatEmpAndDateValidation(Integer matEmp, LocalDate dateValidation);
}

