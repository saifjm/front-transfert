package com.example.avagen.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO pour le traitement AVA (entrée uniquement).
 * Équivalent du bloc :b0 dans la procédure PL/SQL TRAITEMENT_AVA.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraitementAvaDTO {

    /**
     * Code type dossier AVA - doit être toujours 3
     */
    private Short codeTypeDosAva;

    /**
     * Numéro du dossier AVA - obligatoire pour rechercher le dossier
     */
    private Integer numDossier;

    /**
     * Date du dossier
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dateDossier;

    /**
     * Année de la déclaration fiscale
     */
    private Short annee;

    /**
     * Montant du chiffre d'affaires fiscal HT
     */
    private BigDecimal mntCaFiscalHT;

}

