Tu es GitHub Copilot (Senior Java/Spring). Implémente UNIQUEMENT le “process finalize”.

Contexte (AVA):
- MVT = OPERATIONS_DELEGUEES_MVT (master, source de vérité)
- DOSSIER = OPERATIONS_DELEGUEES (slave, projection)
- Règle: on ne modifie jamais le dossier directement; il est mis à jour uniquement en appliquant un mouvement validé. :contentReference[oaicite:2]{index=2}

Scope STRICT (NE FAIRE QUE ÇA):
✅ Implémenter le flux finalize=true de l’endpoint:
POST /api/operations-deleguees-mvt/initialisation?finalize=true :contentReference[oaicite:3]{index=3}

Ne pas implémenter:
- finalize=false (brouillon)
- validate d’un brouillon via PUT
- endpoints réservations / traitement AVA
- scheduler MvtRecoveryWorker
- autres recherches/listings

Stack:
Java 17, Spring Boot 3.2.5, Spring Data JPA, Oracle 19c, Bean Validation, Lombok, MapStruct (si nécessaire). :contentReference[oaicite:4]{index=4}

IMPORTANT:
- Ne pas suivre l’architecture en couches de la doc; organise le code par feature/module (vertical slice).
- Fournir code complet: controller + service + validators + repositories + entities minimum nécessaires + gestion d’erreurs.

========================
Process finalize=true (à respecter)
========================
Quand on appelle POST /initialisation?finalize=true :

1) Créer un mouvement (MVT) en status = 'I' (brouillon) avec refOperation (séquence Oracle AVA.AVA_REF_OPR) et dateOperation. :contentReference[oaicite:5]{index=5}
2) Exécuter les validations de données (bloquantes) : matricule fiscal format, RIB 20 chiffres + clé, type dossier existe, sous-activité obligatoire pour types 3/4/5, cohérence autorisation BCT numéro/date, etc. 
3) Exécuter les validations métier (bloquantes) : compatibilité type dossier, marché obligatoire type 2, dates contrat/fin marché, montants rapatriés si banque provenance, etc. 
4) Valider le mouvement: status 'V' + date_validation = aujourd’hui. 
5) Appliquer le mouvement au dossier:
   - si codeOperation=200: créer/mettre à jour la projection OPERATIONS_DELEGUEES
   - recalculer le solde si montants (formule: autorisé + avance + autoriséBct - utilisé - réserve - blocage) 
6) Si application OK: mouvement passe à status 'A' (final).
7) Si application échoue: mouvement passe à status 'E' (pas de retry ici, juste marquer E). 

========================
Contraintes techniques
========================
- Transaction: finalize doit être transactionnel; si validation échoue → 422 (BusinessException) ou 400 (validation forme).
- Idempotence: si la même requête est rejouée (même refOperation impossible car généré), éviter double création dossier: vérifier existence dossier par (numDossier/identité) selon modèle.
- Format erreurs:
  - 422 BusinessException -> {timestamp,status,error,code,message}
  - 400 Bad Request -> {timestamp,status,error,message}
  - 500 -> {timestamp,status,error,message} :contentReference[oaicite:11]{index=11}
- HTTP:
  - 201 Created pour succès création+finalize
  - 422 pour règle métier
  - 400 pour validation de forme :contentReference[oaicite:12]{index=12}

========================
Livrables attendus
========================
1) DTO request/response pour /initialisation
2) Entities JPA minimales:
   - OperationsDelegueesMvt (+ EmbeddedId refOperation+dateOperation)
   - OperationsDeleguee (dossier) minimal
   + repositories
3) Service finalize:
   - createMvt(status I)
   - validateData()
   - validateBusiness()
   - markV()
   - applyToDossier()
   - markA() / markE()
4) GlobalExceptionHandler + BusinessException
5) Exemples JSON request/response + exemples d’erreur

Commence par générer l’arborescence feature-based, puis le code fichier par fichier.