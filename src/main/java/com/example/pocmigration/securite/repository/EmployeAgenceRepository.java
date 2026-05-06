package com.example.pocmigration.securite.repository;

import com.example.pocmigration.securite.entity.EmployeAgence;
import com.example.pocmigration.securite.entity.EmployeAgenceId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeAgenceRepository extends JpaRepository<EmployeAgence, EmployeAgenceId> {

    List<EmployeAgence> findById_CodeAgence(Short codeAgence);

    List<EmployeAgence> findById_MatEmp(Long matEmp);
}