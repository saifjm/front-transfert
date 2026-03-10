# Tests JSON — Levée de suspension de dossier AVA

## Endpoint testé

```
POST /api/operations-deleguees/levee-suspension/{Finalize}
```

> `{Finalize}` est un booléen : `true` ou `false`

---

## Règles de validation (`leveeSuspensionDossier`)

| Champ       | Règle                                                                                                   |
|-------------|---------------------------------------------------------------------------------------------------------|
| `numDossier`| Obligatoire — doit référencer un dossier existant en base                                               |
| `motifEtat` | Obligatoire                                                                                              |
| `numBct`    | Conditionnel — obligatoire si `codeEtat` du dossier suspendu était **1** (DEPASSEMENT DU MONTANT AUTORISE) et doit être un entier valide |
| `dateBct`   | Conditionnel — obligatoire si `codeEtat` du dossier suspendu était **1**                                |

### Contrainte métier

- Le dossier doit avoir `etatDossier = 'B'` (Bloqué/Suspendu) **avant** la levée
- Après levée : `etatDossier` repasse à `'V'` (Validé) et `codeEtat` est remis à `null`
- Si `codeEtat` était `1` : `numeroBct` et `dateBct` sont mis à jour sur le dossier

---

## Fichiers de succès

| Fichier | Description | BCT requis |
|---------|-------------|------------|
| `01_succes_levee_suspension_std.json`          | Levée standard (codeEtat != 1)                     | Non |
| `02_succes_levee_suspension_avec_bct.json`     | Levée suite dépassement (codeEtat=1, avec BCT)     | Oui |
| `03_succes_levee_suspension_finalize_false.json`| finalize=false — MVT créé, dossier non modifié    | Non |

---

## erreurs — Requêtes invalides (HTTP 4xx / Exception attendue)

| Fichier | Code HTTP | Erreur attendue |
|---------|-----------|-----------------|
| `ERR_LEV_01_num_dossier_absent.json`      | 400 | `numDossier` manquant |
| `ERR_LEV_02_num_dossier_inexistant.json`  | 404 | `numDossier` introuvable en base |
| `ERR_LEV_03_motif_absent.json`            | 400 | `motifEtat` manquant |
| `ERR_LEV_04_dossier_non_suspendu.json`    | 422 | Dossier avec `etatDossier='V'` (pas suspendu) |
| `ERR_LEV_05_num_bct_absent.json`          | 422 | `numBct` absent, codeEtat du dossier était 1 |
| `ERR_LEV_06_date_bct_absente.json`        | 422 | `dateBct` absente, codeEtat du dossier était 1 |
| `ERR_LEV_07_num_bct_non_numerique.json`   | 422 | `numBct` non numérique (ex: "BCT-INVALIDE") |

---

## Comment utiliser dans Postman

1. Démarrer l'application Spring Boot (`mvn spring-boot:run`)
2. Ouvrir Postman → nouvelle requête `POST`
3. URL : `http://localhost:8080/api/operations-deleguees/levee-suspension/true`
4. Headers : `Content-Type: application/json`
5. Body → `raw` → `JSON` → coller le contenu du fichier souhaité
6. Vérifier la réponse (HTTP 200 pour succès, 4xx pour erreurs)

## Prérequis DB

| numDossier | etatDossier requis | codeEtat requis | Utilisé par |
|------------|-------------------|-----------------|-------------|
| 10001      | `V`               | —               | Erreur 04 (dossier non suspendu) |
| 10004      | `B`               | `1`             | Succès 02, Erreurs 05, 06, 07 |
| 10004      | `B`               | `2`, `3` ou `4` | Succès 01, 03 |
