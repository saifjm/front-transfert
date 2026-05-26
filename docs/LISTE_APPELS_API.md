# Liste Complète des Appels API du Projet AVA

Ce document répertorie tous les appels API identifiés dans le code frontend du projet AVA. Certains appels utilisent des requêtes classiques `fetch()`, tandis que d'autres utilisent le wrapper personnalisé `authenticatedFetch()`.

## Module : Authentification (`utils/api.ts`)
*   `POST /auth/login` (Login, génère un JWT token)
*   `GET /auth/refresh-token` (Refresh token)
*   `GET /auth/logout` (Déconnexion de session)

## Module : Création de Dossier AVA / Données de Référence (`components/AVAForm.tsx`)
*   `GET /api/ref/banques` (Liste des banques)
*   `GET /api/ref/activites` (Liste des activités, appelé à divers endroits)
*   `GET /api/ref/pieces` (Liste des pièces)
*   `GET /api/ref/devises/getall` (Liste des devises)
*   `GET /api/ref/personnes/by-nopiececlient/:noPiece` (Recherche d'une personne par pièce d'identité)
*   `GET /api/ref/comptes/by-piece-client/:noPiece` (Recherche de compte bancaire client)
*   `GET /api/activites` (Autre appel lié aux activités)
*   `POST /__localfs/write` (Interactions locales de test ou mock - développement)
*   `DELETE /__localfs/delete` (Interactions locales de test ou mock - développement)
*   `POST /api/operations-deleguees-mvt/initialisation?finalize=true` (Initialisation avec finalisation du dossier)
*   `POST /api/operations-deleguees/validation/:numDossier` (Validation du dossier)

## Module : Accord BCT (`components/AVAAlimentationAccordBCT.tsx`)
_Note : Utilise `authenticatedFetch`._
*   `GET /api/operations-deleguees` (Liste des opérations déléguées)
*   `GET /api/ref/donnees-generales` (Récupération des données métiers générales - BCT)
*   `GET /api/ref/agences/:cBanque/:code` (Récupération d'une agence spécifique)
*   `POST [URL_Dynamique_Backend]` (Mise à jour d'un dossier spécifique dynamique)
*   `POST [URL_Verification_Manuelle]&flag=1` (Validation BCT)
*   `POST [URL_Verification_Manuelle]&flag=0` (Rejet BCT) 

## Module : Alimentation Exportateur (`components/AlimentationDossierExportateur.tsx`)
_Note : Utilise `authenticatedFetch`._
*   `GET /api/operations-deleguees/dossiers-valides-avec-nom` (Liste des dossiers validés AVA)
*   `GET /api/ref/donnees-generales` (Données générales)
*   `GET /api/ref/agences/:codeBanque/:codeAgence` (Données des agences)
*   `GET /api/operations-deleguees/:numDossier/soldes` (Récupération des soldes)
*   `GET /api/operations-deleguees/:numDossier` (Détails du dossier spécifié)
*   `GET /api/operations-deleguees/:numDossier/numero-compte` (Numéro de compte lié au dossier)
*   `GET /api/ref/comptes/by-piece-client/:noPieceClient` (Comptes du client)
*   `POST /api/operation-exportateur-ava/rapatriement/true` (Demande de rapatriement AVA exportateur)

## Module : Suspension (`components/AVASuspension.tsx`)
*   `GET /api/ref/donnees-generales`
*   `GET /api/ref/agences/:cBanque/:code`
*   `POST /api/suspension/true` _(Utilise authenticatedFetch, identifié dynamiquement dans le code)_

## Module : Clôture (`components/AVAClotureDossier.tsx`)
*   `GET /api/operations-deleguees/dossiers-valides-avec-nom` 
*   `GET /api/ref/donnees-generales`
*   `GET /api/ref/agences/:cBanque/:codeAgence`
*   `GET /api/operations-deleguees/:numDossier/soldes`
*   `PUT/POST /api/cloture/:numDossier/true` (Gère la clôture métier du dossier)

## Module : Annulation & Réservation (`components/AVAAnnulationReservation.tsx`)
*   `GET /api/operations-deleguees/dossiers-valides-avec-nom`
*   `GET /api/ref/donnees-generales`
*   `GET /api/ref/agences/:cBanque/:codeAgence` (Dynamique basé sur les données de l'agence)

---
**Remarque** : Cette liste a été générée via une recherche des appels de données directes au sein des composants (incluant `fetch` et `authenticatedFetch`). Actuellement, seule une petite partie de l'application utilise l'authentification token via `authenticatedFetch`. Une harmonisation éventuelle (transformer tous les `fetch` en `authenticatedFetch`) sera requise pour l'intégration complète de la sécurité.