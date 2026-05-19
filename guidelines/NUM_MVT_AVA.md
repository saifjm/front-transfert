# Numéro de mouvement AVA (`num_mvt_ava`) et `dernier_num_mvt_ava`

## Objectif
Ce document explique le concept et les règles d'incrémentation du numéro de mouvement AVA (`num_mvt_ava`) ainsi que l'usage du champ `dernier_num_mvt_ava` stocké sur l'entité `OperationsDeleguee`.

## Définitions
- `num_mvt_ava` : numéro séquentiel attribué à chaque mouvement (MVT) créé pour une opération déléguée. C'est la « numérotation interne » du mouvement AVA.
- `dernier_num_mvt_ava` : champ de l'entité `OperationsDeleguee` qui mémorise le dernier `num_mvt_ava` effectivement utilisé/persisté pour ce dossier.

## Règles métier (résumé)
1. Lors de la création d'un nouveau mouvement pour une opération déléguée, le `num_mvt_ava` du MVT = (`dernier_num_mvt_ava` si non nul, sinon 0) + 1.
2. Après avoir persisté le mouvement, on met à jour `OperationsDeleguee.dernier_num_mvt_ava` avec la nouvelle valeur **seulement** si le MVT sauvegardé possède un `status` égal à `'A'` ou `'V'`.
   - Si le MVT est créé avec un statut de type temporaire (par ex. `'X'` pour finalize=false), on ne modifie pas `dernier_num_mvt_ava`.
3. Si `dernier_num_mvt_ava` est `null`, la première valeur attribuée sera `1`.

## Raisons et conséquences
- But : garder une numérotation monothread logique par dossier et ne pas avancer définitivement le compteur pour des mouvements non finalisés/temporaires.
- Conséquence : les mouvements créés en mode non-finalisé (status `'X'`) n'altèrent pas le compteur visible du dossier ; seul un MVT finalisé/validé le fera.
- Concurrence : pour éviter des conflits (deux créations simultanées), l'opération qui applique le mouvement au dossier doit utiliser un verrou (par ex. `findByIdForUpdate`) ou une opération en transaction afin de garantir la cohérence du `dernier_num_mvt_ava`.

## Mapping DB (colonnes utilisées)
- Table `OPERATIONS_DELEGUEES` : colonne `DERNIER_NUM_MVT_AVA` (entité `OperationsDeleguee.dernierNumMvtAva`).
- Table `OPERATIONS_DELEGUEES_MVT` : colonne `NUM_MVT_AVA` (champ du mouvement).

## Exemple de séquence (cas simple)
1. Dossier 123 : `dernier_num_mvt_ava` = 5
2. Création d'un MVT en finalize=false (status='X') → MVT.num_mvt_ava = 6 ; `dernier_num_mvt_ava` reste 5.
3. Création d'un MVT en finalize=true (status='A') → MVT.num_mvt_ava = 6 ; après sauvegarde `dernier_num_mvt_ava` = 6.
4. Création suivante (finalize=true) → MVT.num_mvt_ava = 7 ; dossier mis à jour avec `dernier_num_mvt_ava` = 7.

> Remarque : si un MVT temporaire (status='X') est ensuite finalisé et son status devient 'A'/'V', la logique applicative doit décider si, au moment de la bascule, on doit synchroniser `dernier_num_mvt_ava`. Dans l'implémentation courante, `dernier_num_mvt_ava` est mis à jour uniquement lors de la création du MVT finalisé (ou si la création initiale était déjà finalisée).

## Bonnes pratiques d'implémentation
- Calculer `newNum = (dernier_num_mvt_ava != null ? dernier_num_mvt_ava : 0) + 1` avant de persister le MVT.
- Persister le MVT, puis, si `status == 'A' || status == 'V'`, écrire `operationsDeleguee.dernierNumMvtAva = newNum` et sauvegarder l'entité `OperationsDeleguee` (dans la même transaction si possible).
- Utiliser un verrou pessimiste (`findByIdForUpdate`) lors d'opérations qui modifient `dernier_num_mvt_ava` pour éviter la course entre transactions.

## Emplacements du code (implémentation actuelle)
- `OperationsDelegueeServiceImpl` — fonctions créant des MVTs : `createSuspensionMovement`, `createLeveeSuspensionMovement`, `createAlimentationBctMovement`. Elles calculent `num_mvt_ava = dernier_num_mvt_ava + 1` puis mettent à jour `dernier_num_mvt_ava` si status `'A'` ou `'V'`.
- `BeneficiaireServiceImpl` — `createMovement` applique la même règle pour les mouvements de mise à jour/ajout de bénéficiaires.
- `OperationExportateurAVAServiceImpl` — lors de la création d'un rapatriement, le `num_mvt_ava` est calculé et `dernier_num_mvt_ava` est mis à jour quand le MVT est finalisé.

## Conclusion
La règle simple à retenir : on incrémente localement le numéro de mouvement pour chaque création, mais on n'avance le compteur définitif du dossier (`dernier_num_mvt_ava`) que pour les mouvements effectivement finalisés/validés (`A` ou `V`). Ceci permet de conserver un historique propre sans polluer le compteur avec des tentatives non finalisées.

---
Pour toute question ou si vous souhaitez un diagramme d'activité illustrant ces étapes, dites-le et je l'ajoute ici.