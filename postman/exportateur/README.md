# Tests JSON pour les opérations AVA de rapatriement

## Vue d'ensemble
Ce dossier contient les fichiers de test JSON pour les opérations de rapatriement AVA (`/api/operation-ava/rapatriement`).

## Structure des fichiers

### Fichiers de succès (01-05)
- `01_succes_rapatriement_basique.json` : Cas de base avec tous les champs obligatoires
- `02_succes_rapatriement_montant_eleve.json` : Test du calcul 25% avec montant élevé
- `03_succes_rapatriement_recent.json` : Test de validation date dans les 3 mois
- `04_succes_rapatriement_limite_plafond.json` : Test du plafond mntAutorise à 500,000 TND
- `05_succes_rapatriement_complet.json` : Cas complet avec tous les champs optionnels

### Fichiers d'erreur (ERR_RAP_01-20)
Tests de tous les contrôles de validation identifiés dans la fonction `createRapatriement`.

## Contrôles de validation testés

### Champs obligatoires
- `numDossierAva` : Doit exister dans OperationsDeleguee
- `dateDosRap` : Doit être dans les 3 derniers mois
- `codeProduitService` : Obligatoire
- `numeroCompte` : Format 16 chiffres requis
- `typePieceBenef` : Obligatoire (1=CIN, 2=Passeport, 3=Carte séjour)
- `noPieceBenef` : Obligatoire et non vide

### Règles métier
- `mntRap` : Si présent, doit être positif (> 0)
- `mntMvtTnd` : Calculé automatiquement = 25% de mntRap
- `mntAutorise` : Plafonné à 500,000 TND
- `codeOperation` : Fixé à 1 pour rapatriement
- `codeTypeMvtAva` : Fixé à "RAP"
- `typeDosRap` : Fixé à "RAP"

### Contraintes de données
- `codeDevise` : 788 (TND), 840 (USD), 978 (EUR)
- `codeBanqueProvenance` : Code valide existant
- Date de rapatriement ≤ date actuelle
- Date de rapatriement ≥ date actuelle - 3 mois

## Format des fichiers JSON

Chaque fichier contient :
- `_description` : Description du cas de test
- `_erreur_attendue` : Message d'erreur attendu (fichiers erreur)
- `_http_status` : Code HTTP attendu
- `_type_erreur` : Type d'exception attendue (fichiers erreur)
- Les champs de l'OperationAvaDTO

## Utilisation avec Postman

1. Importer les fichiers JSON dans Postman
2. Utiliser l'endpoint `POST /api/operation-ava/rapatriement`
3. Vérifier les réponses selon les cas de test

## Données de test

Les numéros de dossier AVA utilisés (10001-10005) doivent exister dans la table OPERATIONS_DELEGUEES pour les tests de succès.