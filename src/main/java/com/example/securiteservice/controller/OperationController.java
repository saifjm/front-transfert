package com.example.securiteservice.controller;

import com.example.securiteservice.entity.Operation;
import com.example.securiteservice.service.OperationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations")
public class OperationController {

    private final OperationService operationService;

    public OperationController(OperationService operationService) {
        this.operationService = operationService;
    }

    @GetMapping
    public List<Operation> getAll() {
        return operationService.getAll();
    }

    @GetMapping("/code-operation/{codeOperation}")
    public List<Operation> getByCodeOperation(@PathVariable Integer codeOperation) {
        return operationService.getByCodeOperation(codeOperation);
    }

    @GetMapping("/produit/{codeProduitService}")
    public List<Operation> getByCodeProduitService(@PathVariable Integer codeProduitService) {
        return operationService.getByCodeProduitService(codeProduitService);
    }

    @GetMapping("/produit/{codeProduitService}/operation/{codeOperation}")
    public ResponseEntity<Operation> getByProduitAndOperation(@PathVariable Integer codeProduitService, @PathVariable Integer codeOperation) {
        return operationService.getByProduitAndOperation(codeProduitService, codeOperation)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
