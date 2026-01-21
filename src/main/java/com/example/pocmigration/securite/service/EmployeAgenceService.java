package com.example.pocmigration.securite.service;

import com.example.pocmigration.securite.entity.EmployeAgence;
import com.example.pocmigration.securite.repository.EmployeAgenceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmployeAgenceService {

    private final EmployeAgenceRepository employeAgenceRepository;

    public EmployeAgenceService(EmployeAgenceRepository employeAgenceRepository) {
        this.employeAgenceRepository = employeAgenceRepository;
    }

    public List<EmployeAgence> getAll() {
        return employeAgenceRepository.findAll();
    }

    public List<EmployeAgence> getByCodeAgence(Short codeAgence) {
        return employeAgenceRepository.findById_CodeAgence(codeAgence);
    }

    // Retourne tous les codes agence valides (non null et != 0) pour un matEmp donné
    public List<Short> getCodesAgenceByMatEmp(Long matEmp) {
        List<EmployeAgence> list = employeAgenceRepository.findById_MatEmp(matEmp);
        if (list == null || list.isEmpty()) {
            return List.of();
        }

        return list.stream()
                .map(EmployeAgence::getCodeAgence)
                .filter(code -> code != null && code != 0)
                .distinct()
                .collect(Collectors.toList());
    }

    public List<EmployeAgence> getByMatEmp(Long matEmp) {
        return employeAgenceRepository.findById_MatEmp(matEmp);
    }

}