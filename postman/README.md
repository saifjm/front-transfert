# Tests Postman — Bénéficiaires AVA

## Endpoint testé

```
POST /api/beneficiaires/{Finalize}
GET  /api/beneficiaires/{numDossier}
```

> `{Finalize}` est un booléen : `true` ou `false`

---

## Règles de validation (BeneficiaireServiceImpl.validateInput)

| Champ            | Règle                                                                      |
|------------------|----------------------------------------------------------------------------|
| `numDossier`     | Obligatoire, doit référencer une opération déléguée existante en base      |
| `dateDossier`    | Obligatoire                                                                |
| `typePieceBenef` | Obligatoire — valeurs acceptées : **1**, **4**, **7**                      |
| `noPieceBenef`   | Obligatoire, non vide                                                      |
| `codeTypeDos`    | Obligatoire                                                                |
| `nomBenef`       | Obligatoire, non vide                                                      |
| `adresseBenef`   | Obligatoire, non vide                                                      |
| `qualite`        | Obligatoire — valeurs acceptées : **Dirigeant**, **Conseil d'administration**, **Employé** |
| `datePiece`      | Obligatoire — doit être **strictement avant aujourd'hui**                  |
| `etat`           | Obligatoire — valeurs acceptées : **AA**, **A**, **AD**, **N**             |

---

## json-samples — Requêtes valides (HTTP 201 attendu)

| Fichier | Endpoint | Description |
|---------|----------|-------------|
| `1_beneficiaire_finalize_true.json`  | `POST /api/beneficiaires/true`  | Création bénéficiaire + MVT status=A |
| `2_beneficiaire_finalize_false.json` | `POST /api/beneficiaires/false` | Création MVT uniquement, bénéficiaire non persisté |
| `3_beneficiaire_qualite_dirigeant.json` | `POST /api/beneficiaires/true` | qualite=Dirigeant, etat=A |
| `4_beneficiaire_qualite_conseil_admin.json` | `POST /api/beneficiaires/true` | qualite=Conseil d'administration, typePieceBenef=4, etat=AD |
| `5_beneficiaire_typePiece_7_etat_N.json` | `POST /api/beneficiaires/true` | typePieceBenef=7, etat=N |

---

## erreurs — Requêtes invalides (HTTP 4xx / BusinessException attendu)

| Fichier | Erreur attendue |
|---------|-----------------|
| `err_01_numDossier_absent.json`             | `numDossier` manquant → BusinessException |
| `err_02_dateDossier_absente.json`           | `dateDossier` manquant → BusinessException |
| `err_03_typePieceBenef_absent.json`         | `typePieceBenef` manquant → BusinessException |
| `err_04_noPieceBenef_vide.json`             | `noPieceBenef` vide "" → BusinessException |
| `err_05_codeTypeDos_absent.json`            | `codeTypeDos` manquant → BusinessException |
| `err_06_nomBenef_vide.json`                 | `nomBenef` vide "" → BusinessException |
| `err_07_adresseBenef_vide.json`             | `adresseBenef` vide "" → BusinessException |
| `err_08_qualite_absente.json`               | `qualite` manquant → BusinessException |
| `err_09_datePiece_absente.json`             | `datePiece` manquant → BusinessException |
| `err_10_etat_absent.json`                   | `etat` manquant → BusinessException |
| `err_11_typePieceBenef_invalide_valeur_2.json` | `typePieceBenef=2`, valeurs acceptées : 1, 4, 7 → BusinessException |
| `err_12_qualite_invalide_actionnaire.json`  | `qualite="Actionnaire"` hors liste autorisée → BusinessException |
| `err_13_datePiece_future_2027.json`         | `datePiece` en 2027 (futur) → BusinessException |
| `err_14_datePiece_aujourd_hui.json`         | `datePiece` = 2026-03-09 (aujourd'hui, non strictement avant) → BusinessException |
| `err_15_etat_invalide_valeur_B.json`        | `etat="B"` hors liste autorisée (AA, A, AD, N) → BusinessException |

---

## Comment utiliser dans Swagger UI

1. Démarrer l'application Spring Boot
2. Ouvrir `http://localhost:8080/swagger-ui/index.html`
3. Développer la section **Bénéficiaires**
4. Cliquer **Try it out** sur `POST /api/beneficiaires/{Finalize}`
5. Saisir `true` ou `false` dans le paramètre `Finalize`
6. Coller le contenu d'un fichier JSON dans le corps de la requête
7. Cliquer **Execute**

## Comment importer dans Postman

1. Créer une nouvelle **Collection** dans Postman
2. Ajouter une requête `POST` avec l'URL `http://localhost:8080/api/beneficiaires/true`
3. Dans l'onglet **Body**, sélectionner `raw` → `JSON`
4. Coller le contenu du fichier JSON souhaité
5. Répéter pour chaque fichier de test
