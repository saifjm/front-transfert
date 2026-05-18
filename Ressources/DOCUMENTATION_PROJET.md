# 📘 Documentation Complète — Microservice AVA (Avoirs en Devises)

> **Projet** : AVA-Micro_AVA  
> **Système** : IBANSYS  
> **Origine** : Migration de procédures PL/SQL Oracle vers architecture microservices Spring Boot  
> **Date** : Février 2026

---

## Table des Matières

1. [Contexte et Objectif](#1-contexte-et-objectif)
2. [Stack Technique](#2-stack-technique)
3. [Architecture du Projet](#3-architecture-du-projet)
4. [Modèle de Données (Entités JPA)](#4-modèle-de-données-entités-jpa)
5. [Le Principe Fondamental : MVT Master / Dossier Slave](#5-le-principe-fondamental--mvt-master--dossier-slave)
6. [Étape 1 — Initialisation d'une Ouverture (Création MVT)](#6-étape-1--initialisation-dune-ouverture-création-mvt)
7. [Étape 2 — Validations de Données (Contrôles Bloquants)](#7-étape-2--validations-de-données-contrôles-bloquants)
8. [Étape 3 — Validations Métier (Règles Business)](#8-étape-3--validations-métier-règles-business)
9. [Étape 4 — Validation du Dossier (Application MVT → Dossier)](#9-étape-4--validation-du-dossier-application-mvt--dossier)
10. [Étape 5 — Traitement AVA (Déclaration Fiscale)](#10-étape-5--traitement-ava-déclaration-fiscale)
11. [Étape 6 ��� Réservations et Annulations](#11-étape-6--réservations-et-annulations)
12. [Étape 7 — Notifications Email](#12-étape-7--notifications-email)
13. [Étape 8 — Intégrations Inter-Microservices](#13-étape-8--intégrations-inter-microservices)
14. [Gestion des Erreurs](#14-gestion-des-erreurs)
15. [Scripts SQL de Création](#15-scripts-sql-de-création)
16. [Tests Postman](#16-tests-postman)
17. [Récapitulatif des Endpoints API](#17-récapitulatif-des-endpoints-api)
18. [Flux Complet de Bout en Bout](#18-flux-complet-de-bout-en-bout)

---

## 1. Contexte et Objectif

Le microservice **AVA** fait partie de l'écosystème bancaire **IBANSYS**. Il gère les **Avoirs en Devises** (opérations déléguées par la Banque Centrale de Tunisie).

**L'objectif** est de remplacer les procédures PL/SQL Oracle existantes par des APIs REST Spring Boot, tout en conservant exactement la même logique métier.

Les processus couverts sont :
- **Ouverture de dossier AVA** (création mouvement + validation + projection dossier)
- **Traitement annuel de la déclaration fiscale** (recalcul droits, suspension/clôture)
- **Gestion des réservations** (bloquer/libérer des montants sur un dossier)
- **Notifications email** au client via le microservice SWF-Mail

---

## 2. Stack Technique

| Composant | Technologie | Version |
|---|---|---|
| Framework | Spring Boot | 4.0.1 |
| Java | OpenJDK | 17 |
| Base de données | Oracle Database | 19c |
| ORM | Spring Data JPA / Hibernate | (fourni par Boot) |
| Audit | Hibernate Envers | 7.x |
| Mapping DTO ↔ Entity | MapStruct | 1.5.5.Final |
| Réduction boilerplate | Lombok | (fourni par Boot) |
| Documentation API | SpringDoc OpenAPI (Swagger) | 3.0.1 |
| Client HTTP inter-services | Spring RestClient | (fourni par Boot) |
| Pool de connexions | HikariCP | (fourni par Boot) |
| Driver Oracle | ojdbc8 | (runtime) |

### Configuration (`application.properties`)

```properties
server.port=8080
spring.datasource.url=jdbc:oracle:thin:@//37.187.250.163:1521/AVA_POC
spring.jpa.hibernate.ddl-auto=none        # PAS de génération auto de schéma
spring.jpa.show-sql=true

# 4 microservices externes
api.externe.base-url=http://localhost:8085   # GEN (déclarations fiscales)
api.ref.base-url=http://localhost:8090       # REF (référentiels)
api.securite.base-url=http://localhost:8082  # SEC (sécurité)
api.swf-mail.base-url=http://localhost:8097  # SWF-Mail (notifications)

# Swagger
springdoc.swagger-ui.path=/swagger-ui.html
```

---

## 3. Architecture du Projet

### Arborescence des packages

```
IbansysPoc.AVA/
├── AvaApplication.java                 ← Point d'entrée (@SpringBootApplication + @EnableScheduling)
│
├── config/
│   ├── OpenApiConfig.java              ← Configuration Swagger UI
│   └── RestClientConfig.java           ← 4 beans RestClient (GEN, REF, SEC, SWF-Mail)
│
├── controller/                         ← 10 controllers REST
│   ├── OperationsDelegueesMvtController.java   ← Mouvements (initialisation)
│   ├── OperationsDelegueeController.java       ← Dossiers (validation, consultation)
│   ├── TraitementAvaController.java            ← Traitement fiscal annuel
│   ├── ReservationController.java              ← Réservations
│   ├── ReservationOperationController.java     ← Opérations réservation/annulation
│   ├── BusinessRulesController.java            ← Règles métier exposées en API
│   ├── NotificationController.java             ← Proxy notifications SWF-Mail
│   ├── DeclarationCAFHTController.java         ← Proxy CA fiscal HT (GEN)
│   ├── PersonneController.java                 ← Proxy recherche personne (REF)
│   └── AvaActiviteController.java              ← Référentiel activités AVA
│
├── DTO/                                ← 23 DTOs (request/response)
├── entity/                             ← 14 entités JPA (mappées sur Oracle)
├── repository/                         ← 10 repositories Spring Data JPA
├── mapper/                             ← 8 mappers MapStruct
├── exception/                          ← Gestion globale des erreurs
│   ├── BusinessException.java
│   ├── ResourceNotFoundException.java
│   └── GlobalExceptionHandler.java
│
└── service/
    ├── (7 interfaces)
    └── impl/                           ← 7 implémentations
        ├── OperationsDelegueesMvtServiceImpl.java  ← Cœur : création MVT
        ├── OperationsDelegueeServiceImpl.java      ← Validation dossier
        ├── BusinessRulesServiceImpl.java           ← Toutes les règles métier
        ├── TraitementAvaServiceImpl.java           ← Traitement fiscal
        ├── ReservationOperationServiceImpl.java    ← Opérations réservation
        ├── ReservationServiceImpl.java             ← CRUD réservation
        └── ApiExterneServiceImpl.java              ← Appels vers microservices externes
```

### Diagramme de dépendances entre services

```
                     ┌──────────────────────────────┐
                     │   OperationsDelegueesMvt     │
                     │   ServiceImpl                │
                     │   (Créer le mouvement MVT)   │
                     └──────────┬───────────────────┘
                                │ appelle
                    ┌───────────▼──────────────┐
                    │   BusinessRulesService    │
                    │   (Validations + Calculs) │
                    └───────────┬──────────────┘
                                │ appelle
                    ┌───────────▼──────────────┐
                    │   ApiExterneService       │
                    │   (REF, GEN, SWF-Mail)   │
                    └──────────────────────────┘

                     ┌──────────────────────────────┐
                     │   OperationsDeleguee          │
                     │   ServiceImpl                 │
                     │   (Valider : MVT → Dossier)  │
                     └──────────┬───────────────────┘
                                │ lit le MVT, crée le Dossier
                    ┌───────────▼──────────────┐
                    │   BusinessRulesService    │
                    │   (Recalcul solde)        │
                    └──────────────────────────┘

                     ┌──────────────────────────────┐
                     │   TraitementAvaServiceImpl    │
                     │   (Déclaration fiscale)       │
                     └──────────┬───────────────────┘
                                │ lit Dossier, crée MVT, notifie
                    ┌───────────▼──────────────┐
                    │   ApiExterneService       │
                    │   (Notifications email)   │
                    └──────────────────────────┘
```

---

## 4. Modèle de Données (Entités JPA)

### Tables principales

| Entité Java | Table Oracle | Clé Primaire | Description |
|---|---|---|---|
| `OperationsDelegueesMvt` | `OPERATIONS_DELEGUEES_MVT` | `(REF_OPERATION, DATE_OPERATION)` composite | **Le mouvement** — source de vérité |
| `OperationsDeleguee` | `OPERATIONS_DELEGUEES` | `NUM_DOSSIER` | **Le dossier** — projection du MVT |
| `BeneficiairesMvt` | `BENEFICIAIRES_MVT` | Composite (8 champs) | Bénéficiaires liés au MVT |
| `Beneficiaire` | `BENEFICIAIRES` | Composite (numDossier + dateDossier + ...) | Bénéficiaires liés au dossier |
| `Document` | `DOCUMENTS` | Auto | Documents attachés |
| `AvaMarcheMvt` | `AVA_MARCHE_MVT` | Composite | Marché lié au MVT |
| `AvaMarche` | `AVA_MARCHE` | `NUM_DOSSIER` | Marché lié au dossier |
| `Reservation` | `RESERVATION` | `REFERENCE_RES` | Réservation de montant |
| `TypeDossierAva` | `TYPE_DOSSIER_AVA` | `NUMERO_CIRCULAIRE` | Référentiel types de dossier |
| `AvaActivite` | `AVA_ACTIVITE` | `CODE_ACTIVITE` | Référentiel activités |

### Séquences Oracle

| Séquence | Usage |
|---|---|
| `AVA.AVA_REF_OPR` | Génère automatiquement les `REF_OPERATION` pour chaque mouvement |
| `AVA.AVA_NUM_DOSSIER_SEQ` | Génère les `NUM_DOSSIER` (concaténé avec MMYY) |

### Relations entre entités

```
OperationsDelegueesMvt (MVT)          OperationsDeleguee (Dossier)
├── 1:N  BeneficiairesMvt              ├── 1:N  Beneficiaire
├── 1:N  Document                      ├── 1:N  Document
├── 1:1  AvaMarcheMvt                  └── 1:1  AvaMarche
└── N:1  Reservation
```

### Statuts du mouvement (`status`)

| Status | Signification | Quand |
|---|---|---|
| `I` | Initial (brouillon) | Mouvement vient d'être créé |
| `V` | Validé | Après validation des règles métier |
| `A` | Appliqué (final) | Après application au dossier (projection réussie) |
| `E` | Erreur | L'application au dossier a échoué |

### États du dossier (`etatDossier`)

| État | Signification |
|---|---|
| `X` | En cours de création (pas encore validé) |
| `V` | Validé / Actif |
| `B` | Bloqué (suspendu pour dépassement) |
| `C` | Clôturé |
| `R` | Rejeté |

---

## 5. Le Principe Fondamental : MVT Master / Dossier Slave

> **Règle d'or** : On ne modifie **jamais** le dossier (`OPERATIONS_DELEGUEES`) directement.  
> Le dossier est **toujours** mis à jour en appliquant un mouvement (`OPERATIONS_DELEGUEES_MVT`) validé.

```
         ┌─────────────────────┐
         │  Requête JSON       │
         │  (InitiationDTO)    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  1. Créer MVT       │  status = 'I'
         │     (séquence ORA)  │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  2. Validations     │  Données + Métier
         │     (si KO → 422)   │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  3. Sauvegarder MVT │  status = 'I', etatDossier = 'X'
         │     + relations     │  (bénéf, docs, marché)
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  4. Validation      │  POST /validation/{numDossier}
         │     Dossier         │  MVT → Dossier
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  5. Dossier créé    │  etatDossier = 'V'
         │     MVT marqué 'V'  │
         └─────────────────────┘
```

---

## 6. Étape 1 — Initialisation d'une Ouverture (Création MVT)

### Endpoint

```
POST /api/operations-deleguees-mvt/initialisation
Content-Type: application/json
```

### Ce qui se passe dans le code

**Fichier** : `OperationsDelegueesMvtServiceImpl.initialisationOuverture()`

#### 1.1 — Génération des valeurs automatiques (`applyDefaultFieldsForCreate`)

```
refOperation    ← séquence Oracle AVA.AVA_REF_OPR (NEXTVAL)
numDossier      ← séquence AVA_NUM_DOSSIER_SEQ + format MMYY (si non fourni)
dateOperation   ← aujourd'hui (SYSDATE)
dateDossier     ← aujourd'hui
numMvtAva       ← 1 (premier mouvement)
dateValidation  ← aujourd'hui
etatDossier     ← 'X' (en cours)
status          ← 'I' (initial/brouillon)
annee           ← année courante
codeProduitService ← 108 (par défaut)
codeOperation      ← 200 (par défaut, ouverture)
```

Si le type de dossier est 3 ou 4, on récupère aussi la `dateUltDeclCaf` depuis la table `TYPE_DOSSIER_AVA`.

#### 1.2 — Exécution des validations (`runValidations`)

Voir les étapes 2 et 3 ci-dessous.

#### 1.3 — Contrôle marché pour type 2 (`requireAvaMarcheIfType2`)

Si `codeTypeDosAva = 2`, le bloc `avaMarcheMvt` est **obligatoire** dans la requête.

#### 1.4 — Calcul de l'échéance (`computeAndSetEcheanceBeforeSavingMain`)

| Type dossier | Règle d'échéance |
|---|---|
| 1, 3, 4 | Date anniversaire du type de dossier (année courante) |
| 5 | Pas d'échéance (`null`) |
| 2 | Date de fin du marché (si ≥ aujourd'hui), sinon erreur |

Pour le type 2, la **date du contrat** doit être < aujourd'hui, et la **date de fin** doit être ≥ aujourd'hui.

#### 1.5 — Calcul du solde (`calculateAndSetSolde`)

**Formule** :
```
solde = mntAutorise + mntAvance + mntAutoriseBct - mntUtilise - mntReserve - mntBlocage
```

Le calcul est déclenché uniquement si `mntAutorise` est renseigné.

#### 1.6 — Sauvegarde du principal (`saveMain`)

- Normalisation des montants `null → BigDecimal.ZERO`
- Mapping DTO → Entity via MapStruct (`OperationsDelegueeMvtMapper`)
- Positionnement de l'ID composite `(refOperation, dateOperation)`
- Validation pré-insert (champs obligatoires)
- Sauvegarde en base via `JpaRepository.save()`
- Gestion des `DataIntegrityViolationException` (contraintes Oracle)

#### 1.7 — Sauvegarde des relations

- **Bénéficiaires** (`saveBeneficiaires`) : pour chaque bénéficiaire dans le DTO, on crée un `BeneficiairesMvt` avec un ID composite de 8 champs
- **Documents** (`saveDocuments`) : pour chaque document, on positionne `numLigne`, `pathAnnee`, `pathMois`
- **Marché** (`saveAvaMarcheAfterMainSaved`) : si présent, sauvegarde de l'`AvaMarcheMvt` avec vérification de `refContrat` obligatoire

#### 1.8 — Réponse HTTP

```json
// HTTP 201 Created
{
  "refOperation": 12345,
  "numDossier": 67890126
}
```

---

## 7. Étape 2 — Validations de Données (Contrôles Bloquants)

**Fichier** : `BusinessRulesServiceImpl`

Ces validations sont exécutées dans `runValidations()` et lèvent une `BusinessException` (→ HTTP 422) si elles échouent.

### 2.1 — Contrôle du type de dossier

```java
controlerTypeDossier(codeTypeDosAva)
```
- Vérifie que le type de dossier existe dans `TYPE_DOSSIER_AVA`
- Vérifie qu'il n'a pas de `dateFinApplication` (encore actif)
- **Erreur** : `CODE_TYPE_DOSSIER_INEXISTANT`

### 2.2 — Contrôle du matricule fiscal

```java
controlerMatriculeFiscal(noPieceClient)
```
- Format tunisien : 8 caractères (7 chiffres + 1 lettre clé)
- La lettre de contrôle est calculée via le vecteur `ABCDEFGHJKLMNPQRSTVWXYZ` (23 caractères)
- Algorithme : somme pondérée des 7 chiffres (poids 1 à 7), modulo 23 → index dans le vecteur
- **Erreur** : `MATRICULE_FISCAL_INVALIDE` ou `MATRICULE_FISCAL_OBLIGATOIRE`

### 2.3 — Contrôle de la pièce client

```java
controlerPieceClientmatfisc(typePieceClient, numeroPieceClient)
```
- Appel API externe **REF** : `GET /api/ref/personnes/verif/{type}/{numero}`
- Vérifie que le client existe (retour = 0)
- Vérifie en plus le format du matricule fiscal
- **Erreur** : `CLIENT_INEXISTANT`

### 2.4 — Contrôle du numéro de compte (RIB 20 chiffres)

```java
controlerNumeroCompte(typePieceClient, numeroPieceClient, numeroCompte)
```
- Décomposition du RIB : `[codeBanque(2)] [codeAgence(3)] [racineCompte(13)] [cléRib(2)]`
- Vérification du code banque via API REF : `GET /api/ref/banques/search/byCode/{code}`
- Vérification de la combinaison compte via API REF : `GET /api/ref/comptes/exists-combinaison`
- Validation de la clé de contrôle RIB (algorithme modulo 97)
- **Erreurs** : `NUMERO_COMPTE_INVALIDE`, `CODE_BANQUE_INEXISTANTE`, `COMPTE_INEXISTANT`, `RIB_INVALIDE`

### 2.5 — Contrôle de l'agence AVA

```java
controlerAgenceAVA(numeroCompte, dto)
```
- Extrait codeBanque + codeAgenceBCT du numéro de compte
- Appel API REF : `GET /api/ref/agences/by-codes/{codeBanque}/{codeAgenceBct}`
- Positionne `codeAgenceAva` dans le DTO si l'agence existe
- **Erreur** : `AGENCE_INEXISTANTE`

### 2.6 — Contrôle activité / sous-activité

```java
validateActiviteTypeDossier(codeTypeDosAva, codeActivite)
```
- Types 1, 2 : vérifie l'activité via API REF (`/api/ref/activites/search/byCode/{code}`)
- Types 3, 5 : vérifie dans la table locale `AVA_ACTIVITE`
- Type 4 : le code activité **doit être 26**
- **Erreur** : `CODE_ACTIVITE_INEXISTANT`, `CODE_ACTIVITE_AVA_INEXISTANT`, `CODE_ACTIVITE_INVALIDE_TYPE4`

```java
// Sous-activité obligatoire pour types 3, 4, 5
if (type in [3, 4, 5] && codeSousActivite == null) → BusinessException
```

### 2.7 — Contrôle de l'autorisation BCT

```java
controlerAutorisationBct(numeroBct, dateBct)
```
- Si numeroBct est renseigné, dateBct est obligatoire (et vice versa)
- **Erreur** : `DATE_BCT_OBLIGATOIRE` ou `NUMERO_BCT_OBLIGATOIRE`

### 2.8 — Contrôle du produit/service et opération

```java
ControleCodeProduitServiceetoperation(codeProduitService, codeOperation)
```
- Appel API REF pour vérifier la combinaison produit/opération
- **Erreur** : `CODE_PRODUIT_SERVICE_INEXISTANT`

---

## 8. Étape 3 — Validations Métier (Règles Business)

### 3.1 — Compatibilité des types de dossier

```java
controlerCompatibiliteTypeDossier(noPieceClient, codeTypeDosAva)
```

Un client **ne peut pas** avoir certaines combinaisons de dossiers actifs :

| Type demandé | Incompatible avec |
|---|---|
| 1, 3, 4, 5 | Tout dossier existant de type 1, 3, 4, 5 |
| 2 | Tout dossier existant de type 3, 4, 5 |

Vérifié via `operationsDelegueeRepository.existsByNoPieceClientAndCodeTypeDosAvaIn()`

- **Erreur** : `DOSSIER_INCOMPATIBLE`

### 3.2 — Marché obligatoire pour type 2

Si `codeTypeDosAva = 2`, le bloc `avaMarcheMvt` doit être présent avec :
- `dateContrat` obligatoire et < aujourd'hui
- `dateFin` obligatoire et ≥ aujourd'hui
- `refContrat` obligatoire
- **Erreur** : `AVA_MARCHE_MVT_OBLIGATOIRE`

### 3.3 — Contrôle des montants rapatriés

```java
controlerMontantsRapatries(codeBanqueProvenance, mntAutorise, mntAvance, mntAutoriseBct, mntUtilise)
```

Si **un seul** montant ou `codeBanqueProvenance` est renseigné, **tous** deviennent obligatoires :
- `codeBanqueProvenance` : vérifié via API REF (`/api/ref/banques/search/byCode`)
- `mntAutorise`, `mntAvance`, `mntAutoriseBct`, `mntUtilise`
- **Erreurs** : `CODE_BANQUE_PROVENANCE_OBLIGATOIRE`, `MNT_AUTORISE_OBLIGATOIRE`, etc.

### 3.4 — Contrôle du montant d'importation

```java
controlerMontantImportation(mntImportation, codeActivite, codeTypeDosAva, numeroBct)
```

Pour activité 24 + type 3 :
- Si montant = 0 → erreur `MONTANT_IMPORTATION_OBLIGATOIRE`
- Si montant < 200 000 et pas de numéro BCT → erreur bloquante
- Si montant < 200 000 avec numéro BCT → alerte (non bloquante)

### 3.5 — Contrôle de la déclaration fiscale (type 3)

```java
controlerDeclarationFiscale(noPieceClient, codeActivite, codeTypeDosAva, numeroBct, typePieceClient)
```

Uniquement pour type 3 :
1. Vérifier la déclaration fiscale N-1 via API GEN (`/api/declarations-fiscales/etat-ca-fiscal`)
2. Si non trouvée et après le 15 juillet → erreur ou alerte
3. Si non trouvée et avant le 15 juillet → vérifier N-2
4. L'état doit être `'V'` (validée)
5. Pour activité 23 : le CA fiscal doit être ≥ 500 000 DT

---

## 9. Étape 4 — Validation du Dossier (Application MVT → Dossier)

### Endpoint

```
POST /api/operations-deleguees/validation/{numDossier}
```

### Ce qui se passe dans le code

**Fichier** : `OperationsDelegueeServiceImpl.ValidationDossier()`

C'est l'étape cruciale qui **projette le MVT vers le dossier** :

#### 4.1 — Récupération du MVT

```java
mvtRepository.findByCodeProduitServiceAndCodeOperationInAndNumDossier(108, [200], numDossier)
```

Cherche un mouvement avec `codeProduitService = 108`, `codeOperation = 200` pour le `numDossier` donné.

#### 4.2 — Chargement des relations MVT

```java
beneficiaireMvtRepository.findByIdRefOperation(refOperation)
documentRepository.findByRefOperation(refOperation)
avaMarcheMvtRepository.findByIdRefOperation(refOperation)
```

#### 4.3 — Mapping MVT → Dossier

```java
OperationsDeleguee dossier = operationsDelegueeMapper.fromMvt(operationOuv);
```

MapStruct copie automatiquement les champs communs du MVT vers le dossier.

#### 4.4 — Calcul du solde

```java
dossier.setSolde(businessRulesService.calculerSolde(
    mntAutorise, mntAvance, mntAutoriseBct, mntUtilise, mntReserve, mntBlocage
));
```

#### 4.5 — Vérification d'idempotence

```java
if (operationsDelegueeRepository.existsById(numDossier)) {
    throw new BusinessException("DOSSIER_EXISTE", "Le dossier existe déjà");
}
```

#### 4.6 — Persistance du dossier

Utilisation de `EntityManager.persist()` (et non `save()`) pour forcer un INSERT et éviter les problèmes de merge Hibernate.

```java
entityManager.clear();
entityManager.persist(toSaveOperationsDeleguee);
entityManager.flush();
```

#### 4.7 — Projection des relations

| MVT → Dossier |
|---|
| `BeneficiairesMvt` → `Beneficiaire` (via `beneficiaireMapper.fromMvtList()`) |
| `Document` (même entité, on rattache au dossier) |
| `AvaMarcheMvt` → `AvaMarche` (via `avaMarcheMapper.fromMvt()`) |

#### 4.8 — Marquage du MVT comme traité

```java
operationOuv.setStatus("V");
operationOuv.setEtatDossier("V");
operationOuv.setDateValidation(now);
mvtRepository.save(operationOuv);
```

#### 4.9 — Réponse

```json
// HTTP 201 Created
{
  "numDossier": 67890126,
  "typeDossierAva": 3,
  "dateDossier": "2026-02-27",
  "codeAgence": 17,
  "noPieceClient": "1695881M",
  "mntAutorise": 500000.000,
  "solde": 500000.000,
  "etatDossier": "V"
}
```

---

## 10. Étape 5 — Traitement AVA (Déclaration Fiscale)

### Endpoint

```
POST /api/traitement-ava
Content-Type: application/json
```

### Ce qui se passe dans le code

**Fichier** : `TraitementAvaServiceImpl.traiterDeclarationFiscale()`

C'est l'équivalent de la procédure PL/SQL `TRAITEMENT_AVA`. Il traite la déclaration fiscale annuelle d'un dossier de type 3.

#### 5.1 — Validations d'entrée

- `codeTypeDosAva` doit être 3
- `numDossier` obligatoire
- `annee` doit être N-1 ou N-2 (avant le 15 juin)
- Le dossier doit exister, être de type 3, ne pas être clôturé/rejeté
- La déclaration fiscale ne doit pas avoir déjà été faite (`declarationFiscale ≠ 'O'`)

#### 5.2 — Calcul du montant MVT AVA (pour année N-1)

```java
mntMvtAva = businessRulesService.calculMvtAvaCr(codeTypeDosAva, mntAutorise, mntCaFiscalHT);
```

Formule (dans `BusinessRulesServiceImpl.calculMvtAvaCr`) :
1. Récupérer `tauxAva` et `droitMaximum` depuis `TYPE_DOSSIER_AVA`
2. `calculBase = mntCaFiscalHT × tauxAva / 100`
3. Si `droitMaximum ≠ 0` et `autorisé + calculBase > droitMaximum` → plafonner

#### 5.3 — Calcul du solde

```
nouveauMntAutorise = mntAutorise + mntMvtAva
solde = nouveauMntAutorise + 0 + mntAutoriseBct - mntUtilise - mntReserve - mntBlocage
```

#### 5.4 — Décisions automatiques

| Condition | Action | État | Notification |
|---|---|---|---|
| `solde < 0` | Suspension du dossier | `B` (bloqué) | ✅ Email "Dépassement du montant autorisé" |
| `activité = 23 AND type = 3 AND mntCaFiscalHT < 500000` | Clôture du dossier | `C` (clôturé) | ✅ Email "CA fiscal n'a pas atteint le seuil" |
| Sinon | Succès | Inchangé | ❌ |

#### 5.5 — Création du mouvement

Un mouvement est créé dans `OPERATIONS_DELEGUEES_MVT` avec :
- `codeProduitService = 108`, `codeOperation = 207`
- `declarationFiscale = 'O'`
- Les montants (mntMvtAva, mntAutorise, mntUtilise, solde, etc.)

#### 5.6 — Mise à jour du dossier (si succès, année N-1)

```java
dossier.setMntCaFiscal(mntCaFiscalHT);
dossier.setSolde(solde);
dossier.setMntAutorise(nouveauMntAutorise);
dossier.setMntAvance(BigDecimal.ZERO);
dossier.setDeclarationFiscale("O");
dossier.setDernierNumMvtAva(numMvtAva);
```

#### Exemple de requête

```json
{
  "codeTypeDosAva": 3,
  "numDossier": 10001,
  "dateDossier": "2025-01-15",
  "annee": 2025,
  "mntCaFiscalHT": 600000.00
}
```

---

## 11. Étape 6 — Réservations et Annulations

### Endpoints

| Méthode | URL | Description |
|---|---|---|
| `POST` | `/api/reservation-operations` | Créer une réservation (code 269) |
| `POST` | `/api/reservation-operations/annulation` | Créer une annulation (code 231) |
| `PUT` | `/api/reservation-operations/validate/{referenceRes}` | Valider et traiter |
| `GET` | `/api/reservations/numdossier/{id}` | Réservations actives |
| `GET` | `/api/reservations/numdossier/{id}/all` | Toutes les réservations |
| `PUT` | `/api/reservations/{id}/reset-reserve` | Réinitialiser mntReserve |

### Flux de réservation (code 269)

1. **Création** : un mouvement MVT est créé avec `codeOperation = 269`, `codeProduitService = 108`
2. **Validation** (`PUT /validate/{referenceRes}`) :
   - Cherche un MVT non validé avec cette `referenceRes`
   - Passe `status = 'V'`
   - Crée ou met à jour une ligne dans `RESERVATION`
   - Met à jour le dossier (recalcul `mntReserve` et `solde`)

### Flux d'annulation (code 231)

1. **Création** : un mouvement MVT avec `codeOperation = 231`
2. **Validation** : met à jour la `RESERVATION` en cumulant `mntAnnulation += mntMvtAva`

### Vérification de fonds

```java
businessRulesService.VerifFond(mntReserve, solde)
// Si mntReserve > solde → BusinessException "FONDS_INSUFFISANTS"
```

---

## 12. Étape 7 — Notifications Email

### Endpoint (Proxy)

```
POST /api/notifications/client
```

### Ce qui se passe

**Fichier** : `TraitementAvaServiceImpl.envoyerNotification()`

1. Récupérer l'email expéditeur reconnu depuis SWF-Mail (`GET /api/recognized-email-senders`)
2. Construire un `NotificationClientRequest` avec :
   - `codeBanque`, `codeAgenceBct`, `typePieceClient`, `noPieceClient`
   - `numDossier`, `dateDossier`, `racineCompte`
   - `objet` (ex: "AVA : Suspension du dossier AVA N. xxx")
   - `message` (texte de notification)
   - `senderEmail`
3. Appeler le microservice SWF-Mail : `POST /api/notifications/client`
4. SWF-Mail construit le HTML, récupère le nom du client, et insère dans `EMAIL_QUEUE` avec statut `PENDING`

---

## 13. Étape 8 — Intégrations Inter-Microservices

**Fichier** : `ApiExterneServiceImpl` (+ `RestClientConfig`)

4 beans `RestClient` sont configurés pour les appels HTTP :

### Microservice GEN (port 8085)

| Appel | Endpoint GEN | Usage |
|---|---|---|
| `getEtatCaFiscal()` | `GET /api/declarations-fiscales/etat-ca-fiscal` | Déclaration N-1 |
| `getEtatCaFiscal2()` | `GET /api/declarations-fiscales/etat-ca-fiscal-2` | Déclaration N-2 |
| `saveDeclarationCAFHT()` | `POST /api/declarations-caf-ht` | Sauvegarder CA fiscal HT |
| `getDeclarationCAFHT()` | `GET /api/declarations-caf-ht/{noPiece}/{annee}` | Consulter CA fiscal HT |

### Microservice REF (port 8090)

| Appel | Endpoint REF | Usage |
|---|---|---|
| `getAgenceByCode()` | `GET /api/ref/agences/by-codes/{cb}/{ca}` | Vérifier agence |
| `verifierPersonne()` | `GET /api/ref/personnes/verif/{type}/{no}` | Vérifier client |
| `getPersonneInfo()` | `GET /search/{type}/{no}` | Nom du client |
| `verifierActiviteParCode()` | `GET /api/ref/activites/search/byCode/{code}` | Vérifier activité |
| `verifierBanqueParCode()` | `GET /api/ref/banques/search/byCode/{code}` | Vérifier banque |
| `existsCompteByCombinaison()` | `GET /api/ref/comptes/exists-combinaison` | Vérifier compte |
| `getcodeBanque()` | `GET /api/ref/banques/codeBanque/{code}` | Code banque |
| `existsOperationByProduitAndOperation()` | Via REF | Vérifier produit/opération |

### Microservice SWF-Mail (port 8097)

| Appel | Endpoint SWF | Usage |
|---|---|---|
| `notifierClient()` | `POST /api/notifications/client` | Envoyer notification |
| `getAllRecognizedEmailSenders()` | `GET /api/recognized-email-senders` | Emails expéditeurs |

---

## 14. Gestion des Erreurs

**Fichier** : `GlobalExceptionHandler`

| Exception | HTTP | Format réponse |
|---|---|---|
| `BusinessException` | **422** Unprocessable Entity | `{timestamp, status, error:"Business Error", code, message}` |
| `ResourceNotFoundException` | **404** Not Found | `{timestamp, status, error:"Not Found", message}` |
| `IllegalArgumentException` | **400** Bad Request | `{timestamp, status, error:"Bad Request", message}` |
| `Exception` (générique) | **500** Internal Server Error | `{timestamp, status, error:"Internal Server Error", message}` |

### Exemple d'erreur 422

```json
{
  "timestamp": "2026-02-27T10:30:00.000",
  "status": 422,
  "error": "Business Error",
  "code": "MATRICULE_FISCAL_INVALIDE",
  "message": "Matricule Fiscal Invalide"
}
```

### Exemple d'erreur 400

```json
{
  "timestamp": "2026-02-27T10:30:00.000",
  "status": 400,
  "error": "Bad Request",
  "message": "numDossier, startDate et endDate sont obligatoires"
}
```

---

## 15. Scripts SQL de Création

Répertoire : `scripts/sql/`

| Script | Description |
|---|---|
| `create_sequence_ava_ref_opr.sql` | Séquence `AVA_REF_OPR` pour générer les `REF_OPERATION` |
| `create_sequence_ava_num_dossier.sql` | Séquence `AVA_NUM_DOSSIER_SEQ` pour générer les `NUM_DOSSIER` |
| `create_envers_objects.sql` | Tables et séquences pour l'audit Hibernate Envers |
| `create_envers_tables_sans_mvt.sql` | Tables `_AUD` pour l'audit (dossier principal) |
| `create_reservation_trigger.sql` | Trigger de réservation (si nécessaire) |
| `test_traitement_ava_data.sql` | **Données de test** : 7 dossiers avec différents cas (succès, clôture, suspension, rejet, etc.) |

### Données de test (`test_traitement_ava_data.sql`)

| NUM_DOSSIER | TYPE | ETAT | ACTIVITE | MNT_AUTORISE | MNT_UTILISE | CAS |
|---|---|---|---|---|---|---|
| 10001 | 3 | V | 32202 | 500 000 | 100 000 | Succès normal |
| 10002 | 3 | V | 23 | 600 000 | 150 000 | Clôture (CA insuffisant) |
| 10003 | 3 | V | 23 | 400 000 | 50 000 | Succès (CA suffisant) |
| 10004 | 3 | V | 32202 | 100 000 | 200 000 | Suspension (solde négatif) |
| 10005 | 3 | C | 32202 | 300 000 | 300 000 | Erreur (déjà clôturé) |
| 10006 | 3 | R | 32202 | 200 000 | 50 000 | Erreur (déjà rejeté) |
| 10007 | 1 | V | 32202 | 250 000 | 75 000 | Erreur (type ≠ 3) |

---

## 16. Tests Postman

Répertoire : `postman/`

### Collection Postman importable

`InitiationOuverture_Postman_Tests.json` — contient tous les cas de test prêts à importer dans Postman.

### Cas de test — Initiation Ouverture (19 erreurs)

| Fichier | Code erreur | Description |
|---|---|---|
| `ERR_01` | `MATRICULE_FISCAL_OBLIGATOIRE` | Matricule fiscal manquant |
| `ERR_02` | `MATRICULE_FISCAL_INVALIDE` | Matricule fiscal vide |
| `ERR_03` | `AGENCE_INEXISTANTE` | Code agence BCT manquant dans le RIB |
| `ERR_04` | `NUMERO_COMPTE_INVALIDE` | Racine compte manquante |
| `ERR_05` | `RIB_INVALIDE` | Clé RIB incorrecte |
| `ERR_06` | `CODE_ACTIVITE_OBLIGATOIRE` | Code activité manquant |
| `ERR_07` | `CODE_SOUS_ACTIVITE_OBLIGATOIRE` | Sous-activité manquante (type 3) |
| `ERR_08` | `CODE_SOUS_ACTIVITE_OBLIGATOIRE` | Sous-activité manquante (type 4) |
| `ERR_09` | `CODE_SOUS_ACTIVITE_OBLIGATOIRE` | Sous-activité manquante (type 5) |
| `ERR_10` | `DATE_BCT_OBLIGATOIRE` | Numéro BCT sans date |
| `ERR_11` | `NUMERO_BCT_OBLIGATOIRE` | Date BCT sans numéro |
| `ERR_12` | `MONTANT_IMPORTATION_OBLIGATOIRE` | Montant importation faible |
| `ERR_13` | Alerte (non bloquante) | Montant importation avec BCT |
| `ERR_14` | `MNT_AUTORISE_OBLIGATOIRE` | Banque provenance sans montant autorisé |
| `ERR_15` | Manque solde | Banque provenance sans solde |
| `ERR_16` | Montants à zéro | Banque provenance avec montants zéro |
| `ERR_17` | `CODE_BANQUE_PROVENANCE_OBLIGATOIRE` | Montants rapatriés sans banque |
| `ERR_18` | Multiples | Plusieurs erreurs simultanées |
| `ERR_19` | Toutes | Toutes les erreurs possibles |

### Cas de test — Traitement AVA (12 cas)

| Fichier | Résultat attendu | Description |
|---|---|---|
| `CAS_01` | ✅ 200 OK | Succès normal (activité 32202) |
| `CAS_02` | ❌ 422 `DOSSIER_CLOTURE_CA_INSUFFISANT` | Clôture (activité 23, CA < 500k) |
| `CAS_03` | ✅ 200 OK | Succès (activité 23, CA ≥ 500k) |
| `CAS_04` | ❌ 422 `DOSSIER_SUSPENDU_DEPASSEMENT` | Suspension (solde négatif) |
| `CAS_05` | ❌ 422 `DOSSIER_INACTIF` | Erreur (dossier déjà clôturé) |
| `CAS_06` | ❌ 422 `DOSSIER_INACTIF` | Erreur (dossier déjà rejeté) |
| `CAS_07` | ❌ 422 `TYPE_DOSSIER_INVALIDE` | Erreur (type ≠ 3) |
| `CAS_08` | ❌ 422 `CODE_TYPE_DOSSIER_INVALIDE` | Erreur (code type dans la requête ≠ 3) |
| `CAS_09` | ❌ 422 `NUM_DOSSIER_OBLIGATOIRE` | Numéro dossier manquant |
| `CAS_10` | ❌ 422 `DOSSIER_NON_TROUVE` | Dossier inexistant |
| `CAS_11` | ❌ 422 `ANNEE_NON_ELIGIBLE` | Année non éligible |
| `CAS_12` | ✅ 200 OK | Année N-2 éligible (avant 15 juin) |

---

## 17. Récapitulatif des Endpoints API

### Mouvements MVT

| Méthode | URL | Description | HTTP |
|---|---|---|---|
| `POST` | `/api/operations-deleguees-mvt/initialisation` | Créer un mouvement (ouverture) | 201 |
| `GET` | `/api/operations-deleguees-mvt/by-numdossier/{id}?start=...&end=...` | Recherche MVT par dossier/période | 200 |

### Dossiers

| Méthode | URL | Description | HTTP |
|---|---|---|---|
| `POST` | `/api/operations-deleguees/validation/{numDossier}` | Valider dossier (MVT → Dossier) | 201 |
| `GET` | `/api/operations-deleguees` | Lister tous | 200 |
| `GET` | `/api/operations-deleguees/{numDossier}` | Par numéro | 200 |
| `GET` | `/api/operations-deleguees/{numDossier}/with-relations` | Avec relations | 200 |

### Traitement AVA

| Méthode | URL | Description | HTTP |
|---|---|---|---|
| `POST` | `/api/traitement-ava` | Traitement déclaration fiscale | 200 |

### Réservations

| Méthode | URL | Description | HTTP |
|---|---|---|---|
| `POST` | `/api/reservation-operations` | Créer réservation (269) | 201 |
| `POST` | `/api/reservation-operations/annulation` | Créer annulation (231) | 201 |
| `PUT` | `/api/reservation-operations/validate/{ref}` | Valider et traiter | 200 |
| `GET` | `/api/reservations/numdossier/{id}` | Réservations actives | 200 |
| `GET` | `/api/reservations/numdossier/{id}/all` | Toutes les réservations | 200 |
| `PUT` | `/api/reservations/{id}/reset-reserve` | Réinitialiser mntReserve | 204 |

### Règles Métier

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/api/business-rules/calcul-mvt-ava-cr` | Calcul MVT AVA CR |
| `GET` | `/api/business-rules/calcul-solde` | Calcul solde |
| `POST` | `/api/business-rules/controle/agence-ava` | Contrôle agence |
| `GET` | `/api/business-rules/controle/type-dossier/{code}` | Contrôle type dossier |
| `GET` | `/api/business-rules/controle/piece-client` | Contrôle matricule |
| `GET` | `/api/business-rules/controle/compatibilite-type-dossier` | Compatibilité |
| `GET` | `/api/business-rules/controle/numero-compte` | Validation RIB |
| `GET` | `/api/business-rules/validate/activite-type-dossier` | Validation activité |

### Proxy / Référentiels

| Méthode | URL | Description |
|---|---|---|
| `GET` | `/api/ref/personnes/search/{type}/{no}` | Recherche personne |
| `POST` | `/api/notifications/client` | Notification email |
| `GET` | `/api/notifications/recognized-email-senders` | Expéditeurs reconnus |
| `POST` | `/api/declarations-caf-ht` | Sauvegarder CA fiscal |
| `GET` | `/api/declarations-caf-ht/{noPiece}/{annee}` | Consulter CA fiscal |
| `GET` | `/api/activites` | Liste activités AVA |

### Swagger UI

```
http://localhost:8080/swagger-ui.html
```

---

## 18. Flux Complet de Bout en Bout

Voici le flux complet depuis la requête client jusqu'à la création effective du dossier :

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX COMPLET AVA                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ÉTAPE 1 : INITIATION (POST /initialisation)                       │
│  ─────────────────────────────────────────────                      │
│  1. Générer refOperation (séquence Oracle)                          │
│  2. Générer numDossier (séquence + MMYY)                           │
│  3. Positionner valeurs par défaut (status=I, etat=X)              │
│  4. Contrôler type dossier (existe dans TYPE_DOSSIER_AVA)          │
│  5. Contrôler matricule fiscal (format 7 chiffres + clé lettre)    │
│  6. Contrôler personne (API REF → client existe ?)                 │
│  7. Contrôler compatibilité types dossier (pas de conflit)         │
│  8. Contrôler RIB 20 chiffres (décomposer, valider clé)           │
│  9. Contrôler agence AVA (API REF → agence existe ?)              │
│  10. Contrôler activité (selon type: REF ou AVA_ACTIVITE)          │
│  11. Contrôler sous-activité (obligatoire types 3/4/5)             │
│  12. Contrôler autorisation BCT (cohérence numéro/date)            │
│  13. Contrôler montants rapatriés (si banque provenance)           │
│  14. Contrôler montant importation (seuils pour type 3/act 24)     │
│  15. Contrôler déclaration fiscale (si type 3)                     │
│  16. Contrôler produit/opération (API REF)                         │
│  17. Contrôler marché (obligatoire type 2 + dates)                 │
│  18. Calculer échéance (selon type dossier)                        │
│  19. Calculer solde (autorisé+avance+BCT−utilisé−réserve−blocage) │
│  20. Sauvegarder MVT principal (status=I)                          │
│  21. Sauvegarder bénéficiaires MVT                                 │
│  22. Sauvegarder documents MVT                                     │
│  23. Sauvegarder marché MVT (si présent)                           │
│  → Réponse : HTTP 201 { refOperation, numDossier }                 │
│                                                                     │
│  ÉTAPE 2 : VALIDATION (POST /validation/{numDossier})              │
│  ────────────────────────────────────────────────                   │
│  1. Chercher le MVT par numDossier (produit=108, opération=200)    │
│  2. Charger les relations MVT (bénéf, docs, marché)               │
│  3. Mapper MVT → Entité OperationsDeleguee                        │
│  4. Calculer le solde sur le dossier                               │
│  5. Vérifier que le dossier n'existe pas déjà                      │
│  6. Persister le dossier (EntityManager.persist)                   │
│  7. Projeter les bénéficiaires (BenefMvt → Beneficiaire)          │
│  8. Projeter les documents (rattacher au dossier)                  │
│  9. Projeter le marché (AvaMarcheMvt → AvaMarche)                 │
│  10. Marquer le MVT : status=V, etatDossier=V                     │
│  → Réponse : HTTP 201 { dossier complet }                          │
│                                                                     │
│  ÉTAPE 3 : TRAITEMENT FISCAL (POST /traitement-ava)               │
│  ──────────────────────────────────────────────────                 │
│  (annuel, uniquement pour type 3)                                   │
│  1. Valider entrées (type=3, année N-1/N-2, dossier actif)        │
│  2. Calculer MVT AVA CR (taux × CA fiscal)                        │
│  3. Recalculer solde                                               │
│  4. Si solde < 0 → suspension + notification email                 │
│  5. Si CA < 500k (activité 23) → clôture + notification email     │
│  6. Sinon → créer mouvement + mettre à jour dossier               │
│  → Réponse : HTTP 200 (succès) ou HTTP 422 (suspension/clôture)    │
│                                                                     │
│  ÉTAPE 4 : RÉSERVATIONS (POST /reservation-operations)             │
│  ─────────────────────────────────────────────────────              │
│  1. Créer MVT réservation (code 269) ou annulation (code 231)     │
│  2. Valider (PUT /validate/{ref}) :                                │
│     - Marquer MVT comme validé                                      │
│     - Créer/MAJ ligne RESERVATION                                   │
│     - Recalculer mntReserve et solde sur le dossier                │
│  → Réponse : HTTP 200 (opération traitée)                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

> **Note** : La documentation Swagger interactive est accessible sur `http://localhost:8080/swagger-ui.html` lorsque le microservice est démarré.

