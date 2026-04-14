# Intégration API - Dossier Exportateur (Rapatriement)

Ce fichier détaille le payload et l'API YAML qui ont été intégrés dans le frontend pour gérer le formulaire d'alimentation/rapatriement du composant `AlimentationDossierExportateur.tsx`.

## 1. Payload cible attendu

L'ancienne structure a été abandonnée au profit du payload exigé par le backend :

```json
{
  "numDossierAva": 10001,       // Correspond au dossier actuellement ouvert/sélectionné
  "dateDosRap": "2026-01-15",   // Remplaçant l'ancienne 'Date d'opération'
  "mntRap": 1000.00,            // Remplaçant l'ancien 'Montant d'alimentation'
  "codeDevise": 788,            // Hardcodé par défaut (ou basé sur le backend)
  "numeroCompte": "1234567890123", // Remplaçant le champ 'Observations'
  "typePieceBenef": 1,          // Remplaçant la liste déroulante 'Type d'opération' (1=CIN, 4=Sèj, 7=Pass)
  "noPieceBenef": "123456789",  // Remplaçant le champ texte 'Référence'
  "codeProduitService": 108     // Par exemple 108 dans le projet (ou 1 dans les mocks yaml)
}
```

## 2. Définition OpenAPI (YAML)

L'appel se fait sur les webservices AVA définis ci-dessous :

```yaml
openapi: 3.0.3
info:
  title: AVA Operation Exportateur API (Rapatriement)
  description: API for managing exportateur repatriation operations in the AVA system
  version: 1.0.0
servers:
  - url: http://localhost:8080
    description: Local development server
paths:
  /api/operation-exportateur-ava/rapatriement/{Finalize}:
    post:
      summary: Créer une opération de rapatriement AVA
      description: |
        Crée une nouvelle opération exportateur AVA de type rapatriement avec validation des contraintes métier. 
        Si Finalize=true : logique complète (OperationExportateurAVADTO + MVT avec status='A' + mise à jour OperationsDeleguee) et un PDF est généré et retourné. 
      tags:
        - Opérations Exportateur AVA
      parameters:
        - name: Finalize
          in: path
          required: true
          description: true = logique complète + MVT status 'A' ; false = MVT uniquement
          schema:
            type: boolean
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OperationExportateurAVADTO'
      responses:
        '201':
          description: >
            Opération de rapatriement créée avec succès.
            Si un PDF est généré (Normalement quand Finalize=true), la réponse sera un fichier binaire de type application/pdf.
            S'il n'y a pas de PDF (ex: Finalize=false), la réponse sera directement un objet JSON `OperationExportateurAVADTO`.
...
```

## 3. Modifications effectuées dans le frontend

Les champs du formulaire ont été physiquement renommés sur le composant `<AlimentationDossierExportateur />` :

- Remplacement du Type d'Opération (Augmentation/Restitution) par **"Type de Pièce"** avec menus déroulants liés à la C.I.N, de Séjour et Passeport.
- Remplacement du champ "Référence" par **"Numéro de pièce"**.
- Remplacement du champ "Observations" par **"Numéro de compte (RIB)"**.
- Renommages en interne des variables : `montantAlimentation` devient `mntRap`, et `dateOperation` devient `dateDosRap`.
- Le endpoint de soumission pointe désormais sur `/api/operation-exportateur-ava/rapatriement/true`.
- Logique pour intercepter le header de type `application/pdf` et télécharger de manière invisible le pdf sous le format : `Rapatriement_AVA_{numDossier}.pdf`
