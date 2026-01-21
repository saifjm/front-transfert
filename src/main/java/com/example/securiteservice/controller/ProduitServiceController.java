package com.example.securiteservice.controller;

import com.example.securiteservice.entity.ProduitService;
import com.example.securiteservice.service.ProduitServiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produit-services")
public class ProduitServiceController {

    private final ProduitServiceService produitServiceService;

    public ProduitServiceController(ProduitServiceService produitServiceService) {
        this.produitServiceService = produitServiceService;
    }

    @GetMapping
    public List<ProduitService> getAll() {
        return produitServiceService.getAll();
    }

    @GetMapping("/{codeProduitService}")
    public ResponseEntity<ProduitService> getByCodeProduitService(@PathVariable Integer codeProduitService) {
        return produitServiceService.getByCodeProduitService(codeProduitService)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
