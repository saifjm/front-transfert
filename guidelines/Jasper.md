# Prompt : Intégration de JasperReports dans l'opération d'Alimentation Exportateur

Voici le prompt détaillé et amélioré que vous pouvez utiliser pour demander l'implémentation de la génération du PDF directement dans l'opération d'alimentation exportateur.

---

**Contexte de la demande :**
Actuellement, la génération du rapport JasperReports se fait via une API spécifique avec son propre payload JSON. 
L'objectif est de supprimer cette API spécifique et d'intégrer la génération du PDF (rapport Jasper) **directement comme une étape de l'exécution de la requête d'alimentation exportateur**.

En plus de créer l'opération (l'entité `OperationExportateur`), le service doit générer le PDF en se basant sur le JSON reçu en entrée pour l'alimentation exportateur et sur les données du dossier (entité `OperationsDeleguee`) présent en base de données. Le PDF doit conserver la même structure, mais sera désormais hydraté par cette combinaison de données.

**Besoin de Mapping Exact (Génération du PDF) :**
Le rapport utilisant les variables (Parameters de JasperReports) devra appliquer les règles de mapping suivantes lors de sa génération au sein du service :

1. **Type d'allocation** : Valeur statique `"1"`.
2. **Titulaire** : Correspond au numéro de dossier (`numeroDossier` de `OperationsDeleguee`).
3. **Nom (ou Dénomination)** : Correspond au nom associé à `OperationsDeleguee` (à récupérer depuis l'entité ou via l'API client si nécessaire).
4. **Code Identification** : Valeur statique `"C"`.
5. **Adresse** : Correspond à l'adresse associée à l'entité `OperationsDeleguee` (ou via l'API Réf si absente de l'entité).
6. Les autres données du rapport (comme le montant rapatrié, la devise, etc.) doivent être extraites du JSON spécifique de la requête d'alimentation exportateur (le DTO).

**Travail demandé au développeur :**
1. **Modifier le service métier** de l'Alimentation Exportateur (méthode de création/rapatriement) pour y injecter un validateur/générateur Jasper (ex: `ReportService`).
2. **Construire la Map de paramètres** (`Map<String, Object>`) au moment de la sauvegarde (si `finalize = true` ou selon la règle métier applicable) en injectant les règles de mapping listées ci-dessus.
3. **Appeler la génération Jasper** (`JasperFillManager.fillReport`) depuis la méthode métier.
4. **Gérer le retour du PDF** : Plutôt que de créer un endpoint dédié pour télécharger le fichier, convertir le PDF généré (tableau d'`octets`) en **Base64** et l'injecter dans un nouveau champ (ex: `pdfBase64`) du DTO de réponse retourné par l'API de création. Le front-end se chargera de le télécharger.
5. Fournir le code propre du service mis à jour et du `ReportService` simplifié sans casser la création de l'entité `OperationExportateur`.

Merci de ne pas concevoir de nouveau contrôleur REST et de tout encapsuler dans l'exécution de la requête existante.
---