package IbansysPoc.AVA.schedular;

import IbansysPoc.AVA.entity.OperationsDelegueesMvt;
import IbansysPoc.AVA.repository.OperationsDelegueeMvtRepository;
import IbansysPoc.AVA.service.OperationsDelegueeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Scheduler de rattrapage pour les mouvements (MVT) orphelins.
 *
 * <p><b>Invariant garanti</b> : Toute opération validée (V) finit appliquée (A).</p>
 *
 * <p>Ce worker remplace tout mécanisme d'outbox. Il tourne périodiquement et :
 * <ol>
 *   <li>Récupère tous les MVT en status <b>V</b> (validés mais pas encore appliqués)
 *       ou <b>E</b> (application échouée précédemment → retry automatique)</li>
 *   <li>Les regroupe par <code>numDossier</code></li>
 *   <li>Pour chaque dossier, appelle <code>applyForDossier(numDossier)</code> qui :
 *       <ul>
 *         <li>Acquiert un lock pessimiste (<code>SELECT ... FOR UPDATE</code>) sur le dossier</li>
 *         <li>Applique chaque MVT dans l'ordre chronologique via <code>applyOne(refOperation)</code></li>
 *         <li><code>applyOne</code> est idempotent : si le MVT est déjà en status A → skip</li>
 *       </ul>
 *   </li>
 * </ol>
 *
 * <p><b>Concurrence</b> : Le lock pessimiste sur le dossier empêche les conflits avec les
 * requêtes HTTP <code>finalize=true</code> qui appellent le même <code>applyForDossier</code>.</p>
 *
 * <p><b>Activation</b> : Contrôlée par la propriété <code>recovery.scheduler.enabled=true</code>
 * dans <code>application.properties</code>. Par défaut, le scheduler n'est PAS activé.</p>
 *
 * @see IbansysPoc.AVA.service.impl.OperationsDelegueeServiceImpl#applyForDossier(Integer)
 * @see IbansysPoc.AVA.service.impl.OperationsDelegueeServiceImpl#applyOne(Long)
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "recovery.scheduler.enabled", havingValue = "true", matchIfMissing = false)
public class MvtRecoveryWorker {

    private final OperationsDelegueeMvtRepository mvtRepository;
    private final OperationsDelegueeService dossierService;

    /** Statuts éligibles au rattrapage : V (validé) et E (erreur précédente) */
    private static final List<String> PENDING_STATUSES = List.of("V", "E");

    /**
     * Scheduler de rattrapage.
     *
     * <p>Exécution : toutes les 30 secondes (configurable via <code>recovery.scheduler.fixedDelay</code>).</p>
     *
     * <p>Logique :
     * <ol>
     *   <li>Récupère tous les MVT en status V ou E</li>
     *   <li>Regroupe par <code>numDossier</code></li>
     *   <li>Pour chaque dossier → <code>applyForDossier(numDossier)</code></li>
     * </ol>
     * Si un dossier échoue, on continue avec les suivants (isolation par dossier).</p>
     */
    @Scheduled(fixedDelayString = "${recovery.scheduler.fixedDelay:30000}")
    public void recoverPendingOperations() {

        List<OperationsDelegueesMvt> pending = mvtRepository.findByStatusIn(PENDING_STATUSES);

        if (pending.isEmpty()) {
            // Rien à faire — log uniquement en TRACE pour ne pas polluer les logs
            log.trace("[RECOVERY] Aucun MVT pending (V/E) à rattraper");
            return;
        }

        log.info("[RECOVERY] {} MVT(s) pending (V/E) détecté(s), lancement du rattrapage", pending.size());

        // Regrouper par numDossier pour traiter dossier par dossier
        Map<Integer, List<OperationsDelegueesMvt>> byDossier = pending.stream()
                .filter(mvt -> mvt.getNumDossier() != null)
                .collect(Collectors.groupingBy(OperationsDelegueesMvt::getNumDossier));

        int successCount = 0;
        int errorCount = 0;

        for (Map.Entry<Integer, List<OperationsDelegueesMvt>> entry : byDossier.entrySet()) {
            Integer numDossier = entry.getKey();
            int mvtCount = entry.getValue().size();

            try {
                log.info("[RECOVERY] Traitement numDossier={} ({} MVT(s) pending)", numDossier, mvtCount);
                dossierService.applyForDossier(numDossier);
                successCount++;
                log.info("[RECOVERY] numDossier={} traité avec succès", numDossier);
            } catch (Exception e) {
                errorCount++;
                log.error("[RECOVERY] Erreur pour numDossier={}: {}", numDossier, e.getMessage(), e);
                // Continue avec les autres dossiers — isolation garantie
            }
        }

        log.info("[RECOVERY] Rattrapage terminé — {} dossier(s) traité(s) avec succès, {} en erreur",
                successCount, errorCount);
    }
}
