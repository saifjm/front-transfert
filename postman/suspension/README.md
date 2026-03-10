# Tests JSON — Suspension de dossier AVA

## Endpoint testé

```
POST /api/operations-deleguees/suspension/{Finalize}
```

> `{Finalize}` est un booléen : `true` ou `false`

---

## Règles de validation (`suspensionDossier`)

| Champ       | Règle                                                                                               |
|-------------|-----------------------------------------------------------------------------------------------------|
| `numDossier`| Obligatoire — doit référencer un dossier existant en base                                           |
| `codeEtat`  | Obligatoire — valeurs acceptées : **1**, **2**, **3**, **4**, **99** (entre 1 et 99)               |
| `motifEtat` | Obligatoire **uniquement si codeEtat = 99** (AUTRE MOTIF)                                          |

### Signification des codes d'état

| Code | Libellé |
|------|---------|
| `1`  | DEPASSEMENT DU MONTANT AUTORISE |
| `2`  | DECLARATION FISCALE NON PRESENTEE |
| `3`  | TOTAL IMPORTATIONS INSUFFISANT |
| `4`  | DOSSIER NON RENOUVELE |
| `99` | AUTRE MOTIF (motifEtat obligatoire) |

### Contrainte métier

- Le dossier doit avoir `etatDossier = 'V'` (Validé) **avant** la suspension
- Après suspension : `etatDossier` passe à `'B'` (Bloqué)

---

## Fichiers de succès

| Fichier | `codeEtat` | Description |
|---------|------------|-------------|
| `01_succes_suspension_depassement.json`              | 1  | Dépassement du montant autorisé |
| `02_succes_suspension_declaration_non_presentee.json`| 2  | Déclaration fiscale non présentée |
| `03_succes_suspension_importations_insuffisantes.json`| 3 | Total importations insuffisant |
| `04_succes_suspension_dossier_non_renouvele.json`    | 4  | Dossier non renouvelé |
| `05_succes_suspension_autre_motif.json`              | 99 | Autre motif (avec motifEtat) |
| `06_succes_suspension_finalize_false.json`           | 1  | finalize=false — MVT créé, dossier non modifié |

---

## erreurs — Requêtes invalides (HTTP 4xx / Exception attendue)

| Fichier | Code HTTP | Erreur attendue |
|---------|-----------|-----------------|
| `ERR_SUS_01_num_dossier_absent.json`       | 400 | `numDossier` manquant |
| `ERR_SUS_02_num_dossier_inexistant.json`   | 404 | `numDossier` introuvable en base |
| `ERR_SUS_03_code_etat_absent.json`         | 400 | `codeEtat` manquant |
| `ERR_SUS_04_code_etat_invalide.json`       | 422 | `codeEtat=5` hors liste autorisée (1,2,3,4,99) |
| `ERR_SUS_05_motif_absent_code_etat_99.json`| 422 | `codeEtat=99` sans `motifEtat` |
| `ERR_SUS_06_dossier_non_valide.json`       | 422 | Dossier déjà suspendu (`etatDossier='B'`) |
| `ERR_SUS_07_code_etat_valeur_0.json`       | 400 | `codeEtat=0` sous le minimum (1) |
| `ERR_SUS_08_code_etat_valeur_100.json`     | 400 | `codeEtat=100` au-dessus du maximum (99) |

---

## Comment utiliser dans Postman

1. Démarrer l'application Spring Boot (`mvn spring-boot:run`)
2. Ouvrir Postman → nouvelle requête `POST`
3. URL : `http://localhost:8080/api/operations-deleguees/suspension/true`
4. Headers : `Content-Type: application/json`
5. Body → `raw` → `JSON` → coller le contenu du fichier souhaité
6. Vérifier la réponse (HTTP 200 pour succès, 4xx pour erreurs)

## Prérequis DB

| numDossier | etatDossier requis | Utilisé par |
|------------|-------------------|-------------|
| 10001      | `V`               | Cas de succès (01, 04, 05, 06) |
| 10002      | `V`               | Cas de succès (02) |
| 10003      | `V`               | Cas de succès (03) |
| 10004      | `B`               | Erreur 06 (dossier déjà suspendu) |
