# Tests JSON — Alimentation suite accord BCT

## Endpoint testé

```
POST /api/operations-deleguees/{numDossier}/alimentation-bct/{Finalize}
```

> `{numDossier}` est le numéro du dossier à alimenter (paramètre de chemin URL)  
> `{Finalize}` est un booléen : `true` ou `false`

---

## Règles de validation (`alimentationSuiteAccordBct`)

| Champ       | Règle                                                                      |
|-------------|----------------------------------------------------------------------------|
| `numeroBct` | Obligatoire                                                                |
| `dateBct`   | Obligatoire                                                                |
| `typeBct`   | Obligatoire (ex: `"N"` = Nouveau, `"E"` = Extension, `"R"` = Renouvellement) |
| `mntMvtAva` | Obligatoire — doit être **strictement supérieur à 0** (> 0.00)            |

### Contrainte métier

- Le dossier (passé dans l'URL) doit exister en base, sinon HTTP 404
- Le dossier doit avoir `etatDossier = 'V'` (Validé), sinon BusinessException 422
- `mntAutoriseBct` = `mntAutoriseBct actuel + mntMvtAva` (cumul)

### Comportement selon `Finalize`

| Finalize | Comportement |
|----------|-------------|
| `true`   | MAJ `numeroBct`, `dateBct`, `mntAutoriseBct` sur le dossier + MVT status=`'A'` |
| `false`  | MVT créé uniquement, dossier non modifié |

---

## Fichiers de succès

| Fichier | Dossier URL | `typeBct` | `mntMvtAva` | Description |
|---------|-------------|-----------|-------------|-------------|
| `01_succes_alimentation_bct_basique.json`      | 10001 | N | 50 000    | Accord BCT standard |
| `02_succes_alimentation_bct_montant_eleve.json`| 10003 | E | 200 000   | Extension avec montant élevé |
| `03_succes_alimentation_bct_finalize_false.json`| 10001 | N | 25 000   | finalize=false — MVT seul |

---

## erreurs — Requêtes invalides (HTTP 4xx / Exception attendue)

| Fichier | Dossier URL | Code HTTP | Erreur attendue |
|---------|-------------|-----------|-----------------|
| `ERR_BCT_01_numero_bct_absent.json`    | 10001 | 400 | `numeroBct` manquant |
| `ERR_BCT_02_date_bct_absente.json`     | 10001 | 400 | `dateBct` absente |
| `ERR_BCT_03_type_bct_absent.json`      | 10001 | 400 | `typeBct` manquant |
| `ERR_BCT_04_montant_zero.json`         | 10001 | 400 | `mntMvtAva = 0.00` |
| `ERR_BCT_05_montant_negatif.json`      | 10001 | 400 | `mntMvtAva = -5000` |
| `ERR_BCT_06_num_dossier_inexistant.json`| 99999 | 404 | Dossier introuvable |
| `ERR_BCT_07_dossier_non_valide.json`   | 10004 | 422 | `etatDossier='B'` (suspendu) |

---

## Comment utiliser dans Postman

1. Démarrer l'application Spring Boot (`mvn spring-boot:run`)
2. Ouvrir Postman → nouvelle requête `POST`
3. URL : `http://localhost:8080/api/operations-deleguees/10001/alimentation-bct/true`
   - Pour les erreurs, adapter le `{numDossier}` et `{Finalize}` selon le fichier `_endpoint`
4. Headers : `Content-Type: application/json`
5. Body → `raw` → `JSON` → coller le contenu du fichier souhaité
6. Vérifier la réponse (HTTP 200 pour succès, 4xx pour erreurs)

## Prérequis DB

| numDossier | etatDossier requis | Utilisé par |
|------------|-------------------|-------------|
| 10001      | `V`               | Succès 01, 03 — Erreurs 01 à 05 |
| 10003      | `V`               | Succès 02 |
| 10004      | `B`               | Erreur 07 |
