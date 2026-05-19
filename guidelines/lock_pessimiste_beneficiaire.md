# 🔒 LOCK PESSIMISTE POUR BÉNÉFICIAIRE - Guide d'implémentation

> **Date** : 11 mars 2026
> **Objectif** : Décrire un prompt structuré et un rapport détaillé expliquant comment implémenter l'approche de lock pessimiste
> pour les fonctions : `createOrUpdateBeneficiaire`, `rapatriementExportateur`, `suspension`, `leveeDeSuspension`, `alimentationBct`.

---

## 🎯 Résumé

Ce document suit exactement la logique et la structure du guide `LOCK_PESSIMISTE_GUIDE.md` fourni. Il explique :
- le problème de concurrence (exemples simplifiés),
- la solution technique (SELECT ... FOR UPDATE / @Lock PESSIMISTIC_WRITE),
- des snippets Java Spring Data JPA pour repository et services,
- des recommandations d'usage, gestion d'erreurs et tests.

---

## ❗ Pourquoi appliquer un lock pessimiste sur `Bénéficiaire` ?

Sans lock, deux transactions concurrentes qui manipulent le même bénéficiaire peuvent se marcher dessus (lost update),
perdre des modifications métier (ex. montant / état / statut), ou produire des incohérences entre modules (exportateur, suspension, alimentation).

Exemple séquentiel (sans lock) :

```
Thread A                              Thread B
---------                              ---------
READ bénéficiaire id=123               READ bénéficiaire id=123
→ status = ACTIVE                      → status = ACTIVE
Compute:                               Compute:
 set status = SUSPENDED                set lastExportDate = now()
UPDATE bénéficiaire                   UPDATE bénéficiaire
SET status = SUSPENDED                 SET lastExportDate = now()
COMMIT                                 COMMIT

Résultat final : dépend de l'ordre des commits => une mise à jour écrase l'autre.
```

Avec lock pessimiste (sélection pour MAJ), la seconde transaction attendra la libération du lock et lira l'état à jour.

---

## ✅ Principe technique

- Utiliser en JPA/Spring Data : `@Lock(LockModeType.PESSIMISTIC_WRITE)` sur une requête dédiée ou `SELECT ... FOR UPDATE` natif.
- Placer la logique métier (validation, calculs, update) à l'intérieur d'une transaction (`@Transactional`) après l'acquisition du lock.
- Gérer les exceptions de lock (`PessimisticLockingFailureException`, `PessimisticLockException`) et prévoir une stratégie de retry/backoff si nécessaire.

---

## 🛠️ Snippets recommandés

### 1) Repository : `BeneficiaireRepository`

```java
package com.monorg.repository;

import com.monorg.entity.Beneficiaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface BeneficiaireRepository extends JpaRepository<Beneficiaire, Long> {

    Optional<Beneficiaire> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Beneficiaire b WHERE b.id = :id")
    Optional<Beneficiaire> findByIdForUpdate(@Param("id") Long id);
}
```

> Remarque : adaptez le type d'identifiant (`Long`) et le nom du package à votre projet.

### 2) Template de service (pattern à réutiliser)

```java
@Service
@RequiredArgsConstructor
public class BeneficiaireService {

    private final BeneficiaireRepository beneficiaireRepository;
    private final Logger log = LoggerFactory.getLogger(getClass());

    @Transactional
    public void withLock(Long id, Consumer<Beneficiaire> action) {
        log.info("[withLock] Tentative d'acquisition du lock pour beneficiarie={}", id);
        Beneficiaire b = beneficiaireRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("BENE_NON_TROUVE", "Beneficiaire non trouvé: " + id));

        action.accept(b);

        beneficiaireRepository.save(b);
        beneficiaireRepository.flush();
        log.info("[withLock] MAJ effectuée pour beneficiarie={}", id);
    }
}
```

Ce pattern centralise l'acquisition du lock, la mise à jour et le flush.

---

## 🔁 Implémentations spécifiques par fonction

Pour chaque cas ci‑dessous, appliquez la même logique : acquérir le lock via `findByIdForUpdate`, appliquer validations/mises à jour métier, `save` + `flush`, laisser le COMMIT libérer le lock.

### A) `createOrUpdateBeneficiaire`

- Cas d'usage : création ou mise à jour d'un bénéficiaire. Si création seule (pas d'ID), pas de lock; si update d'un bénéficiaire existant, acquérir le lock.

```java
@Transactional
public Beneficiaire createOrUpdateBeneficiaire(BeneficiaireDto dto) {
    if (dto.getId() == null) {
        // Création simple
        Beneficiaire newB = mapper.toEntity(dto);
        return beneficiaireRepository.save(newB);
    }

    Long id = dto.getId();
    return beneficiaireRepository.findByIdForUpdate(id)
        .map(b -> {
            // appliquer modifications depuis dto
            mapper.updateEntityFromDto(dto, b);
            Beneficiaire saved = beneficiaireRepository.save(b);
            beneficiaireRepository.flush();
            return saved;
        })
        .orElseThrow(() -> new BusinessException("BENE_NON_TROUVE", "Beneficiaire non trouve: " + id));
}
```

### B) `rapatriementExportateur` (rappatriement/exportateur)

- Cas d'usage : lecture et modification d'attributs liés à l'exportateur (ex. `lastExportDate`, `etatExport`).

```java
@Transactional
public void rapatriementExportateur(Long beneficiaireId, RapatriementData data) {
    log.info("[rapatriementExportateur] start for {}", beneficiaireId);
    Beneficiaire b = beneficiaireRepository.findByIdForUpdate(beneficiaireId)
        .orElseThrow(...);

    // validations métier
    b.setLastExportDate(data.getDate());
    b.setEtatExport(data.getEtat());

    beneficiaireRepository.save(b);
    beneficiaireRepository.flush();
}
```

### C) `suspension` / `leveeDeSuspension`

- Cas d'usage : changer le statut de suspension et enregistrer métadonnées.

```java
@Transactional
public void suspendreBeneficiaire(Long id, SuspensionDto dto) {
    Beneficiaire b = beneficiaireRepository.findByIdForUpdate(id).orElseThrow(...);
    if (b.isSuspended()) throw new BusinessException("DEJA_SUSPENDU", "..." );
    b.setSuspended(true);
    b.setSuspensionReason(dto.getReason());
    beneficiaireRepository.save(b);
    beneficiaireRepository.flush();
}

@Transactional
public void leveeDeSuspension(Long id) {
    Beneficiaire b = beneficiaireRepository.findByIdForUpdate(id).orElseThrow(...);
    b.setSuspended(false);
    b.setSuspensionReason(null);
    beneficiaireRepository.save(b);
    beneficiaireRepository.flush();
}
```

### D) `alimentationBct`

- Cas d'usage : opérations financières modifiant montants, soldes ou mnt_utilise sur le bénéficiaire.

```java
@Transactional
public void alimentationBct(Long id, BigDecimal montant) {
    Beneficiaire b = beneficiaireRepository.findByIdForUpdate(id).orElseThrow(...);

    BigDecimal ancienMnt = b.getMntUtilise() == null ? BigDecimal.ZERO : b.getMntUtilise();
    BigDecimal nouveau = ancienMnt.add(montant);
    b.setMntUtilise(nouveau);
    b.setSolde(b.getSolde().subtract(montant));

    beneficiaireRepository.save(b);
    beneficiaireRepository.flush();
}
```

---

## ⚠️ Gestion des exceptions et stratégie retry

- Attraper `PessimisticLockingFailureException` / `PessimisticLockException` et appliquer :
  - court retry (exponentiel) jusqu'à N tentatives (ex. 3),
  - ou échouer rapidement et retourner code d'erreur métier pour que le caller réessaie côté client.
- Configurer un timeout de lock court (par ex. 5-10s) au niveau de la base ou via hint JPA :

```java
entityManager.createQuery("SELECT b FROM Beneficiaire b WHERE b.id = :id")
    .setParameter("id", id)
    .setLockMode(LockModeType.PESSIMISTIC_WRITE)
    .setHint("javax.persistence.lock.timeout", 10000) // ms
    .getSingleResult();
```

---

## ✅ Recommandations opérationnelles

- Centraliser la logique de lock (pattern `withLock`) pour éviter duplication.
- Ne pas mettre de traitements réseaux longs (APIs externes) entre l'acquisition du lock et le COMMIT.
- Tenir le plus court possible la transaction pour réduire contention.
- Exposer des métriques (temps d'attente au lock, nombre de retries, échecs) et des logs clairs.
- Prévoir des tests d'intégration multi-thread pour valider l'absence de lost-updates.

---

## ✅ Checklist de validation (tests)

- Tests unitaires pour la logique métier hors transaction.
- Tests d'intégration multi-thread simulant concurrents sur le même `beneficiaireId`.
- Tests de performance mesurant taux de lock contention sur scénarios réels.
- Revues de code pour s'assurer que chaque modification d'état critique passe par `findByIdForUpdate`.

---

## Annexes : prompt structuré pour demander une analyse ou une PR

Prompt modèle :

```
Analyse le code existant pour la gestion des bénéficiaires et génère une PR qui :
1) Introduit `findByIdForUpdate` dans `BeneficiaireRepository`.
2) Refactore `createOrUpdateBeneficiaire`, `rapatriementExportateur`, `suspension`, `leveeDeSuspension`, `alimentationBct`
   pour utiliser la stratégie de lock pessimiste (pattern withLock).
3) Ajoute gestion des exceptions de lock et retry simple (3 tentatives).
4) Ajoute tests d'intégration multi-thread pour valider l'absence de lost-update.
Fournis patchs précis et tests unitaires/integration nécessaires.
```

---

Si vous souhaitez, je peux :
- générer la PR/patchs de code adaptant les repositories et services dans votre projet,
- ajouter les tests d'intégration multi-thread,
- ou intégrer une stratégie de retry centralisée.

Faites-moi savoir quelle(s) action(s) vous voulez que j'exécute ensuite.
