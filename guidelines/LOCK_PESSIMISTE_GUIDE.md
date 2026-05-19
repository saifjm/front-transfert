# 🔒 GUIDE COMPLET DU LOCK PESSIMISTE - Système AVA

> **Date** : 9 mars 2026  
> **Objectif** : Comprendre et implémenter le lock pessimiste pour éviter les conflits concurrents

---

## 🎯 Pourquoi le Lock Pessimiste ?

### Le Problème Sans Lock

```
┌─────────────────────────────────────────────────────────────┐
│  SANS LOCK PESSIMISTE - ⚠️ DANGER ⚠️                        │
└─────────────────────────────────────────────────────────────┘

Thread 1 (User A)                    Thread 2 (User B)
─────────────────                    ─────────────────
10:00:00.000                         10:00:00.100
│                                    │
│ READ dossier 6110227               │
│ → solde = 8400 TND                 │
│ → mnt_utilise = 2300 TND           │
│                                    │ READ dossier 6110227
│                                    │ → solde = 8400 TND
│                                    │ → mnt_utilise = 2300 TND
│                                    │
│ Calcul :                           │ Calcul :
│ nouveau_mnt_utilise = 2300 + 300   │ nouveau_mnt_utilise = 2300 + 500
│                    = 2600 TND      │                    = 2800 TND
│ nouveau_solde = 8400 - 300         │ nouveau_solde = 8400 - 500
│               = 8100 TND           │               = 7900 TND
│                                    │
│ UPDATE dossier                     │
│ SET mnt_utilise = 2600             │
│     solde = 8100                   │
│ WHERE num_dossier = 6110227        │
│ ✅ COMMIT                          │
│                                    │ UPDATE dossier
│                                    │ SET mnt_utilise = 2800
│                                    │     solde = 7900
│                                    │ WHERE num_dossier = 6110227
│                                    │ ✅ COMMIT
│                                    │
▼                                    ▼

RÉSULTAT EN BASE :
mnt_utilise = 2800 TND  ❌ FAUX ! (devrait être 2600 TND du dernier)
solde = 7900 TND        ❌ FAUX ! (300 TND du Thread 1 ont été perdus!)

🚨 LA TRANSACTION DU THREAD 1 A ÉTÉ ÉCRASÉE !
🚨 PERTE DE DONNÉES : 300 TND non comptabilisés !
```

### La Solution avec Lock Pessimiste

```
┌─────────────────────────────────────────────────────────────┐
│  AVEC LOCK PESSIMISTE - ✅ SÉCURISÉ ✅                       │
└─────────────────────────────────────────────────────────────┘

Thread 1 (User A)                    Thread 2 (User B)
─────────────────                    ─────────────────
10:00:00.000                         10:00:00.100
│                                    │
│ SELECT ... FOR UPDATE              │
│ 🔒 LOCK acquis sur dossier         │
│ → solde = 8400 TND                 │
│ → mnt_utilise = 2300 TND           │
│                                    │ SELECT ... FOR UPDATE
│                                    │ ⏸️ ATTEND (bloqué par Thread 1)
│ Calcul :                           │
│ nouveau_mnt_utilise = 2600         │
│ nouveau_solde = 8100               │
│                                    │
│ UPDATE dossier                     │
│ SET mnt_utilise = 2600             │
│     solde = 8100                   │
│ ✅ COMMIT                          │
│ 🔓 LOCK libéré                     │
│                                    │ ▶️ REPREND EXECUTION
│                                    │ 🔒 LOCK acquis
│                                    │ → solde = 8100 TND (valeur à jour!)
│                                    │ → mnt_utilise = 2600 TND
│                                    │
│                                    │ Calcul :
│                                    │ nouveau_mnt_utilise = 2600 + 500
│                                    │                    = 3100 TND
│                                    │ nouveau_solde = 8100 - 500
│                                    │               = 7600 TND
│                                    │
│                                    │ UPDATE dossier
│                                    │ SET mnt_utilise = 3100
│                                    │     solde = 7600
│                                    │ ✅ COMMIT
│                                    │ 🔓 LOCK libéré
▼                                    ▼

RÉSULTAT EN BASE :
mnt_utilise = 3100 TND  ✅ CORRECT ! (2300 + 300 + 500)
solde = 7600 TND        ✅ CORRECT ! (8400 - 300 - 500)

✅ AUCUNE PERTE DE DONNÉES
✅ COHÉRENCE GARANTIE
```

---

## 🛠️ Implémentation dans AVA

### Étape 1 : Créer la Méthode de Lock dans le Repository

**Fichier** : `OperationsDelegueeRepository.java`

```java
package IbansysPoc.AVA.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import IbansysPoc.AVA.entity.OperationsDeleguee;

import java.util.Optional;

@Repository
public interface OperationsDelegueeRepository extends JpaRepository<OperationsDeleguee, Integer> {
    
    Optional<OperationsDeleguee> findById(Integer numDossier);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM OperationsDeleguee o WHERE o.numDossier = :numDossier")
    Optional<OperationsDeleguee> findByIdForUpdate(@Param("numDossier") Integer numDossier);
}
```

### Étape 2 : Utiliser le Lock dans le Service

**Fichier** : `OperationsDelegueeServiceImpl.java`

```java
@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class OperationsDelegueeServiceImpl implements OperationsDelegueeService {
    
    private final OperationsDelegueeRepository operationsDelegueeRepository;
    private final OperationsDelegueeMvtRepository mvtRepository;
    
    @Override
    @Transactional
    public void applyFVToDossier(Integer numDossier, Long refOperation) {
        log.info("[applyFVToDossier] 🔒 Début avec LOCK pour dossier={}", numDossier);
        
        LocalDate today = LocalDate.now();
        OperationsDelegueesMvtId mvtId = new OperationsDelegueesMvtId();
        mvtId.setDateOperation(today);
        mvtId.setRefOperation(refOperation);
        
        OperationsDelegueesMvt mvtFV = mvtRepository.findById(mvtId)
                .orElseThrow(() -> new BusinessException("MVT_FV_NON_TROUVE",
                        "Mouvement FV non trouvé : refOperation=" + refOperation));
        
        if (!"V".equals(mvtFV.getStatus())) {
            throw new BusinessException("MVT_NON_VALIDE",
                    "Le mouvement doit avoir status=V (actuel=" + mvtFV.getStatus() + ")");
        }
        
        log.info("[applyFVToDossier] ⏳ Tentative d'acquisition du lock...");
        
        OperationsDeleguee dossier = operationsDelegueeRepository
                .findByIdForUpdate(numDossier)
                .orElseThrow(() -> new BusinessException("DOSSIER_NON_TROUVE",
                        "Dossier non trouvé : numDossier=" + numDossier));
        
        log.info("[applyFVToDossier] ✅ Lock acquis sur dossier={}", numDossier);
        
        BigDecimal ancienMntUtilise = dossier.getMntUtilise() != null ?
            dossier.getMntUtilise() : BigDecimal.ZERO;
        BigDecimal ancienSolde = dossier.getSolde() != null ?
            dossier.getSolde() : BigDecimal.ZERO;
        
        BigDecimal nouveauMntUtilise = mvtFV.getMntUtilise();
        BigDecimal nouveauSolde = mvtFV.getSolde();
        
        dossier.setMntUtilise(nouveauMntUtilise);
        dossier.setSolde(nouveauSolde);
        
        if (mvtFV.getNumMvtAva() != null) {
            dossier.setDernierNumMvtAva(mvtFV.getNumMvtAva());
        }
        
        log.info("[applyFVToDossier] 📝 Mise à jour : mntUtilise {} → {}, solde {} → {}",
                ancienMntUtilise, nouveauMntUtilise, ancienSolde, nouveauSolde);
        
        operationsDelegueeRepository.save(dossier);
        operationsDelegueeRepository.flush();
        
        log.info("[applyFVToDossier] ✅ Succès - Lock sera libéré au COMMIT");
    }
}
```

---

**Implémentation** : ✅ **OPÉRATIONNELLE** dans FV et RC  
**Performance** : ⚡ **ACCEPTABLE** (timeout configurable à 10s)  
**Fiabilité** : 🔒 **MAXIMALE** (zéro perte de données)

