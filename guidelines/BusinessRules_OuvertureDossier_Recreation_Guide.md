# BusinessRules_OuvertureDossier Module — Recreation & Integration Guide

Ce guide documente le processus d'ouverture et d'initialisation d'un dossier AVA (création complète depuis un mouvement MVT validé), et fournit les étapes nécessaires pour l'intégrer dans un projet Spring Boot en respectant la même structure que les autres guides du répertoire `Ressources`.

---

## 1. Objectif du module

Le module "Ouverture Dossier" prend en charge la création complète d'une opération déléguée (`OPERATIONS_DELEGUEES`) à partir d'un mouvement validé (MVT) reçu (ex. codeOperation=200). Il doit :
- Construire l'entité `OperationsDeleguee` depuis le MVT principal (`OperationsDelegueesMvt`).
- Persister les relations (bénéficiaires, documents, AvaMarche) référencées dans le MVT.
- Calculer les montants et le solde initial.
- Créer/mettre à jour les mouvements liés et marquer le MVT source comme traité.
- Garantir l'idempotence et la cohérence via verrouillage et transactions.

---

## 2. Architecture (vue d'ensemble)

| Couche | Composant | Responsabilité |
| :--- | :--- | :--- |
| API | `OuvertureDossierController` | Endpoint d'ingestion des MVT ou déclencheur batch |
| Service | `OperationsDelegueeServiceImpl` | `ValidationDossier(numDossier)` / `applyMvtToDossier` — logique d'assemblage + persistance |
| Repository | `OperationsDelegueeRepository` | CRUD + `findByIdForUpdate` (lock pessimiste) |
| Repository | `OperationsDelegueeMvtRepository` | Lecture/écriture des MVT + `getNextRefOperation()` |
| Entities | `OperationsDeleguee`, `Beneficiaire`, `Document`, `AvaMarche`, `OperationsDelegueesMvt` | Schéma de base de données |

---

## 3. DTOs principaux

### `OuvertureDossierDTO` (résultat)
- `numDossier`, `dateDossier`, `numeroCompte`, `mntAvance`, `mntUtilise`, `mntAutorise`, `solde`, `mntAutoriseBct`, `beneficiaires` (optionnel), `documents` (optionnel), `avaMarche` (optionnel)

> Le service peut retourner un DTO minimal (numDossier+etat) ou complet selon le contexte (finalize=true/false).

---

## 4. Pré-conditions et validations

1. Le MVT source existe et est de type attendu (ex. codeProduitService=108, codeOperation=200).
2. Le MVT est validé (`status='V'`) ou la logique prévoit comment traiter les statuts intermédiaires.
3. Les données liées (bénéficiaires, documents, marche) doivent être cohérentes et valides.
4. Idempotence : si le dossier existe déjà, l'opération doit être idempotente (ne pas recréer, mais mettre à jour si nécessaire).

---

## 5. Workflow détaillé — `ValidationDossier(numDossier)` (création complète)

1. Lecture du MVT validé (par `refOperation` ou critères fournis) : récupérer `OperationsDelegueesMvt` principal.
2. Récupérer les relations MVT associées : `BeneficiairesMvt`, `Document` (MVT), `AvaMarcheMvt`.
3. Mapper le MVT principal vers l'entité `OperationsDeleguee` (utiliser `OperationsDelegueeMapper.fromMvt`).
4. Calculer les montants initiaux et le `solde` via `BusinessRulesService.calculerSolde(...)`.
5. Déterminer si `numDossier` existe :
   - Si existe : lancer idempotence — lever exception `DOSSIER_EXISTE` (ou appliquer mise à jour contrôlée selon business rule).
   - Si n'existe pas : persister l'entité `OperationsDeleguee` (préférer `EntityManager.persist` si id assigné par MVT pour éviter `merge` inattendu).
6. Persister les relations :
   - Pour chaque `Beneficiaire` mvt → créer `Beneficiaire` entité, fixer `id.numDossier`, `id.dateDossier`, `etat='A'`, puis `beneficiaireRepository.saveAll()`.
   - Pour chaque `Document` mvt → créer `Document` entité liée au dossier, `documentRepository.saveAll()`.
   - Pour `AvaMarche` (one-to-one) → mapper et `avaMarcheRepository.save()`.
7. Marquer le MVT comme traité (`status='V'`, `dateValidation=now`, `etatDossier='V'`) et `mvtRepository.save(operationOuv)`.
8. Retourner `OuvertureDossierDTO` construit depuis l'entité persistée.

---

## 6. Idempotence & Verrous

- Transaction : annoter la méthode avec `@Transactional`.
- Idempotence : vérifier `existsById(numDossier)` avant d'insérer ; si le dossier existe déjà, appliquer la politique métier (rejeter, fusionner, ou mettre à jour de façon contrôlée).
- Verrouillage : utiliser `operationsDelegueeRepository.findByIdForUpdate(numDossier)` (méthode JPA avec `@Lock(PESSIMISTIC_WRITE)`) dans les chemins où plusieurs processus peuvent écrire concurremment (ex. `applyMvtToDossier`, `createRapatriement`, `alimentationBct`).
- Logs : ajouter des logs `⏳ Tentative d'acquisition du lock` / `✅ Lock acquis` pour traçabilité.

---

## 7. Points d'intégration techniques

- Mapper : centraliser la logique de mapping `Mvt -> Dossier` dans un mapper (`OperationsDelegueeMapper.fromMvt`) pour testabilité.
- EntityManager vs Repository : si l'identifiant `numDossier` provient du MVT et doit être conservé, `EntityManager.persist()` est plus sûr qu'un `save()` qui peut `merge()` une entité détachée.
- Séquences/RefOperation : générer `refOperation` via `operationsDelegueeMvtRepository.getNextRefOperation()` lorsque vous créez de nouveaux mouvements.

---

## 8. Exemples JSON / cas d'usage

- Cas normal (création complète depuis MVT validé) : ce module est typiquement déclenché par une routine qui lit les MVT validés et appelle `ValidationDossier(numDossier)`.

---

## 9. Effets sur la base de données

| Table | Action |
| :--- | :--- |
| `OPERATIONS_DELEGUEES` | INSERT (nouveau dossier) ou UPDATE si stratégie de merge |
| `BENEFICIAIRE` | INSERT pour chaque bénéficiaire mvt |
| `DOCUMENT` | INSERT pour chaque document mvt |
| `AVA_MARCHE` | INSERT (one-to-one) |
| `OPERATIONS_DELEGUEES_MVT` | UPDATE du MVT source (status/dateValidation) et INSERT des MVT de création si nécessaire |

---

## 10. Tests recommandés

- Tests unitaires : mapper `fromMvt`, calcul solde, validations business.
- Tests d'intégration : scénario complet persistant en base H2 (ou testcontainer) : MVT -> ValidationDossier -> vérification des entités créées.
- Tests de concurrence : simuler deux threads appliquant des MVT sur le même `numDossier` et vérifier que le lock empêche les corruptions.

---

## 11. Plan d'implémentation (courte checklist)

1. Ajouter/valider `OperationsDelegueeMapper.fromMvt`.
2. Implémenter `ValidationDossier(numDossier)` dans `OperationsDelegueeServiceImpl` (transactionnelle).
3. Persister relations (beneficiaires, documents, avaMarche).
4. Marquer MVT comme traité et créer MVT d'audit si nécessaire.
5. Ajouter logs et verrouillage pessimiste sur chemins concurrents.
6. Écrire tests unitaires et d'intégration.

---

## 12. Notes et bonnes pratiques

- Ne pas exposer la persistance brute du MVT vers l'entité sans mapping/règles ; privilégier le mapper pour garder la logique métier testable.
- Documenter clairement les invariants (ex. `etatDossier` doit être 'V' après création).
- Gérer explicitement les erreurs de persistance et remonter des `BusinessException` lisibles.

---

## Fichiers liés
- Service attendu : `src/main/java/.../OperationsDelegueeServiceImpl.java`
- Repositories : `OperationsDelegueeRepository`, `OperationsDelegueeMvtRepository`, `BeneficiaireRepository`, `DocumentRepository`, `AvaMarcheRepository`
- Mapper : `OperationsDelegueeMapper`


---

Si vous voulez, je peux :
- 1) créer un fichier de test d'intégration minimal pour le scénario d'ouverture, ou
- 2) appliquer le pattern de lock pessimiste dans d'autres méthodes similaires (déjà fait pour plusieurs), ou
- 3) générer un diagramme d'architecture synthétique.

Dites-moi quelle action prioriser.