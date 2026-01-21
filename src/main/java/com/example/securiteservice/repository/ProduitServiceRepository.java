package com.example.securiteservice.repository;

import com.example.securiteservice.entity.ProduitService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProduitServiceRepository extends JpaRepository<ProduitService, Integer> {
    Optional<ProduitService> findByCodeProduitService(Integer codeProduitService);
}
