package com.example.securiteservice.controller;

import com.example.securiteservice.dto.ValidationOperationRequest;
import com.example.securiteservice.entity.ValidationOperation;
import com.example.securiteservice.entity.ValidationOperationId;
import com.example.securiteservice.repository.ValidationOperationRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/securite/validations")
public class ValidationOperationController {

    private final ValidationOperationRepository repository;

    public ValidationOperationController(ValidationOperationRepository repository) {
        this.repository = repository;
    }

    @PostMapping
    public ResponseEntity<ValidationOperation> create(@RequestBody ValidationOperationRequest request) {
        ValidationOperationId id = new ValidationOperationId(
                request.getCodeProduitService(),
                request.getCodeOperation(),
                request.getNumDossier(),
                request.getDateDossier()
        );
        ValidationOperation entity = new ValidationOperation();
        entity.setId(id);
        entity.setMatEmp(request.getMatEmp());
        entity.setDateValidation(request.getDateValidation());
        entity.setCodeDevise(request.getCodeDevise());
        entity.setMontant(request.getMontant());
        entity.setRefOperation(request.getRefOperation());
        entity.setDateOperation(request.getDateOperation());

        ValidationOperation saved = repository.save(entity);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<ValidationOperation>> findByMatEmpAndDate(
            @RequestParam("matEmp") Integer matEmp,
            @RequestParam("dateValidation") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateValidation) {
        List<ValidationOperation> results = repository.findByMatEmpAndDateValidation(matEmp, dateValidation);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/all")
    public ResponseEntity<List<ValidationOperation>> findAll() {
        return ResponseEntity.ok(repository.findAll());
    }
}

