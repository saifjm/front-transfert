package com.example.pocmigration.securite.controller;

import com.example.pocmigration.securite.entity.EmployeAgence;
import com.example.pocmigration.securite.service.EmployeAgenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employes-agence")
public class EmployeAgenceController {

    private final EmployeAgenceService employeAgenceService;

    public EmployeAgenceController(EmployeAgenceService employeAgenceService) {
        this.employeAgenceService = employeAgenceService;
    }

    @GetMapping
    public List<EmployeAgence> getAll() {
        return employeAgenceService.getAll();
    }

    @GetMapping("/agence/{codeAgence}")
    public List<EmployeAgence> getByCodeAgence(@PathVariable Short codeAgence) {
        return employeAgenceService.getByCodeAgence(codeAgence);
    }

    @GetMapping("/{matEmp}")
    public ResponseEntity<List<EmployeAgence>> getByMatEmp(@PathVariable Long matEmp) {
        List<EmployeAgence> list = employeAgenceService.getByMatEmp(matEmp);
        if (list == null || list.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(list);
    }


    @GetMapping("/{matEmp}/codes-agence")
    public ResponseEntity<List<Short>> getCodesAgenceByMatEmp(@PathVariable Long matEmp) {
        List<Short> codes = employeAgenceService.getCodesAgenceByMatEmp(matEmp);
        if (codes.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(codes);
    }
}