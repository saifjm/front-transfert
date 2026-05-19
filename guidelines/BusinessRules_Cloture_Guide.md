# Guide d'Implémentation : Fonctionnalité "Clôture de Dossier"

Ce document décrit l'architecture et les règles de gestion pour implémenter la nouvelle fonctionnalité de **Clôture de Dossier** dans le projet AVA1, en respectant le pattern `Finalize` (Brouillon vs Validation) et l'architecture existante.

Conformément aux instructions, **aucun fichier existant ne doit être altéré** (à l'exception de l'ajout d'un champ dans l'entité MVT). De nouvelles classes (`Controller`, `Service` et un package dédié ou DTO) seront créées pour isoler cette logique.

---

## 1. Vue d'Ensemble de l'UI et du Mapping

D'après le formulaire UI fourni ("Formulaire Clôture"), l'utilisateur doit saisir les informations suivantes :

| Champ UI | Type DTO (`ClotureDTO`) | Champ Base de Données (Mapping) |
| :--- | :--- | :--- |
| Motif * | `String motif` | `MOTIF_ETAT` (dans Dossier et MVT) |
| Date Clôture * | `LocalDate dateCloture` | `DATE_ETAT` (dans Dossier et MVT) |
| Référence * | `String reference` | **NOUVEAU CHAMP** `REFERENCE_CLOTURE` (dans MVT) |
| Observations | `String observations` | Peut être concaténé au motif ou ignoré si non stocké |

---

## 2. Modifications de la Base de Données & Entités

Puisque la référence du document de clôture doit être persistée dans le mouvement ("referenceCloture"), il est nécessaire d'ajouter ce champ à l'entité MVT.

### Entité `OperationsDelegueesMvt`
Ajouter la colonne suivante dans la classe `OperationsDelegueesMvt.java` :
```java
@Column(name = "REFERENCE_CLOTURE", length = 20)
private String referenceCloture;
```
*(Optionnel : Ajouter également la colonne dans la table physique `OPERATIONS_DELEGUEES_MVT` de la BD si le ddl-auto n'est pas à update).*

---

## 3. Architecture des Nouvelles Classes

Pour éviter de surcharger les services existants, vous créerez les classes suivantes :

1. **`ClotureDTO`** (dans `IbansysPoc.AVA.DTO`)
2. **`ClotureController`** (dans `IbansysPoc.AVA.controller`)
3. **`ClotureService`** (Interface dans `IbansysPoc.AVA.service`)
4. **`ClotureServiceImpl`** (Implémentation dans `IbansysPoc.AVA.service.impl`)

*(Les Repositories existants `OperationsDelegueeRepository` et `OperationsDelegueeMvtRepository` peuvent être injectés dans `ClotureServiceImpl` pour interagir avec la BD, pas besoin de créer de nouveaux Repository à moins d'avoir une entité purement dédiée).*

---

## 4. Contrat d'Interface (Le DTO)

```java
public class ClotureDTO {
    @NotBlank(message = "Le motif est obligatoire")
    private String motif;

    @NotNull(message = "La date de clôture est obligatoire")
    private LocalDate dateCloture;

    @NotBlank(message = "La référence est obligatoire")
    private String reference;

    private String observations; // Optionnel
}
```

---

## 5. Logique Métier (Le Service : `ClotureServiceImpl`)

La fonction principale `cloturerDossier(Integer numDossier, ClotureDTO dto, boolean finalizeFlag)` suivra ce workflow :

### A. Phase Initiale (Toujours exécutée)
1. **Verrouillage Pessimiste** : Récupérer le dossier via `operationsDelegueeRepository.findByIdForUpdate(numDossier)`.
2. **Vérification d'état** : S'assurer que le dossier n'est pas déjà clôturé (`etatDossier != "C"`).

### B. Création du Mouvement (MVT) — Le concept de Base
Le système doit garder la trace de cette opération en créant un MVT pour le dossier :
1. Calculer le nouveau `numMvtAva` : `Integer newNumMvtAva = (dossier.getDernierNumMvtAva() != null ? dossier.getDernierNumMvtAva() : 0) + 1;`
2. Obtenir une nouvelle référence d'opération via la séquence (ex: `operationsMvtRepository.getNextRefOperation()`).
3. Créer une nouvelle instance `OperationsDelegueesMvt`.
4. Copier l'intégralité des données actuelles du dossier vers ce mouvement.
5. Appliquer les données de la clôture au Mouvement :
   - `mvt.setEtatDossier("C");` (L'état du MVT devient Clôturé)
   - `mvt.setMotifEtat(dto.getMotif());`
   - `mvt.setDateEtat(dto.getDateCloture());`
   - `mvt.setReferenceCloture(dto.getReference());` (Le nouveau champ)
   - `mvt.setNumMvtAva(newNumMvtAva);`

### C. L'embranchement `finalizeFlag`

#### Si `finalizeFlag == false` (Mode Brouillon)
* **Action MVT** : `mvt.setStatus("X");`
* **Action Dossier** : **AUCUNE MODIFICATION** sur la table `OPERATIONS_DELEGUEES`.
* **Sauvegarde** : On sauvegarde *uniquement* le mouvement dans `OPERATIONS_DELEGUEES_MVT`.

#### Si `finalizeFlag == true` (Mode Validation/Finalisation)
* **Action MVT** : `mvt.setStatus("C");` (Ou "C" selon vos conventions de clôture).
* **Action Dossier** (Mise à jour de la table principale `OPERATIONS_DELEGUEES`) : 
   - `dossier.setEtatDossier("C");`
   - `dossier.setMotifEtat(dto.getMotif());`
   - `dossier.setDateEtat(dto.getDateCloture());`
   - `dossier.setDernierNumMvtAva(newNumMvtAva);`
* **Sauvegarde** : On sauvegarde le Mouvement **ET** le Dossier mis à jour.

---

## 6. L'Endpoint REST (Le Controller : `ClotureController`)

Le contrôleur exposera un endpoint `POST` cohérent avec le reste du projet.

**Endpoint :** `POST /api/cloture/{numDossier}/{finalize}`

**Code de base pour le Controller :**
```java
@RestController
@RequestMapping("/api/operations-deleguees") // ou "/api/cloture" selon votre convention
@RequiredArgsConstructor
public class ClotureController {

    private final ClotureService clotureService;

    @PostMapping("/{numDossier}/cloture/{finalize}")
    public ResponseEntity<OuvertureDossierDTO> cloturerDossier(
            @PathVariable Integer numDossier,
            @PathVariable("finalize") boolean finalizeFlag,
            @RequestBody @Valid ClotureDTO dto) {
        
        OuvertureDossierDTO response = clotureService.cloturerDossier(numDossier, dto, finalizeFlag);
        return ResponseEntity.ok(response);
    }
}
```

## 7. Résumé des livrables techniques attendus

1.  Ajout de `private String referenceCloture` dans l'entité `OperationsDelegueesMvt`.
2.  Création de la classe `ClotureDTO`.
3.  Création de l'interface `ClotureService` et de la classe `ClotureServiceImpl`.
4.  Création de la classe `ClotureController`.
5.  *(Front-end)*: Appel de l'API avec un payload JSON contenant `motif`, `dateCloture` et `reference` depuis le formulaire React/Angular.