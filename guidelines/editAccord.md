# Prompt pour la modification de l'alimentation Suite Accord BCT

Veuillez modifier la fonction `alimentationSuiteAccordBct` dans le projet `AVA1` pour ajouter les contrôles de saisie suivants :

1. **Vérification de l'existence de l'accord BCT :**
   Faire un appel HTTP (via `RestTemplate` ou `FeignClient` selon ce qui est utilisé dans le projet) à l'API du référentiel : 
   `GET http://localhost:8090/api/ref/central-bank-agreements/{numBct}`
   - Si l'API retourne une erreur 404 (ou si l'accord n'est pas trouvé), lever une **Exception 404** (ex: `ResourceNotFoundException`) avec le message : *"Accord non trouvé"*.

2. **Validation de la combinaison (Date et Type) :**
   Si l'accord est récupéré avec succès, vérifier que la date (`date_BCT`) et le type provenant de l'entrée JSON correspondent exactement aux champs `dateAccordBct` et `typeAccordBct` de l'accord récupéré.
   - En cas de non-correspondance, lever une **BusinessException** avec le message : *"La combinaison de numBct, DataBct et type n'existe pas."*

3. **Vérification de la validité de l'accord :**
   Vérifier le champ `validite` de l'accord récupéré.
   - Si `validite` est égal à `"0"`, lever une **BusinessException** avec le message : *"Accord non valide"*. (On s'attend à ce qu'il soit à `"1"`).

4. **Vérification du scope :**
   Vérifier le champ `scope` de l'accord récupéré.
   - Si `scope` est différent de `"AVA"`, lever une **BusinessException** avec le message : *"Le scope n'est pas AVA"*.

Merci d'appliquer ces vérifications tout au début de la méthode, avant de procéder au reste du traitement métier.
