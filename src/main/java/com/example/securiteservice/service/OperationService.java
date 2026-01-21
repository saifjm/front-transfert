package com.example.securiteservice.service;

import com.example.securiteservice.entity.Operation;
import com.example.securiteservice.entity.OperationId;
import com.example.securiteservice.repository.OperationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class OperationService {

    private final OperationRepository operationRepository;

    public OperationService(OperationRepository operationRepository) {
        this.operationRepository = operationRepository;
    }

    public List<Operation> getAll() {
        return operationRepository.findAll();
    }

    public List<Operation> getByCodeOperation(Integer codeOperation) {
        return operationRepository.findById_CodeOperation(codeOperation);
    }

    public List<Operation> getByCodeProduitService(Integer codeProduitService) {
        return operationRepository.findById_CodeProduitService(codeProduitService);
    }

    public Optional<Operation> getByProduitAndOperation(Integer codeProduitService, Integer codeOperation) {
        return operationRepository.findById_CodeProduitServiceAndId_CodeOperation(codeProduitService, codeOperation);
    }
}
