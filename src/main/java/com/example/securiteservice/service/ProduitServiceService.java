package com.example.securiteservice.service;

import com.example.securiteservice.entity.ProduitService;
import com.example.securiteservice.repository.ProduitServiceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProduitServiceService {

    private final ProduitServiceRepository produitServiceRepository;

    public ProduitServiceService(ProduitServiceRepository produitServiceRepository) {
        this.produitServiceRepository = produitServiceRepository;
    }

    public List<ProduitService> getAll() {
        return produitServiceRepository.findAll();
    }

    public Optional<ProduitService> getByCodeProduitService(Integer codeProduitService) {
        return produitServiceRepository.findByCodeProduitService(codeProduitService);
    }
}
