import {
    ArrowLeft,
    FileText,
    Filter,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';
import { authenticatedFetch } from '../utils/api';
import { continueAlimentationBctDecision, startAlimentationBctDecision } from '../utils/workflowApi';
import { useErrorHandler } from './ErrorContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// ─── Interfaces ───────────────────────────────────────────────────────────────

interface DossierAVA {
  numDossier: number;
  codeAgence: number;
  libelleAgence: string;
  typeDossierAva: number;
  codeTypeDossier: number;
  libelleTypeDossier: string;
  numeroDossier: string;
  dateDossier: string;
  noPieceClient: string;
  nomClient: string;
  prenomClient: string;
  mntAutorise: number;
  mntAutoriseBct: number;
  mntAvance: number;
  mntUtilise: number;
  mntReserve: number;
  mntBlocage: number;
  solde: number;
  etatDossier: string;
}

/**
 * Payload exact attendu par l'API :
 * POST /api/operations-deleguees/{numDossier}/alimentation-bct/true
 *
 * Champs :
 *   numDossier — number  — numéro du dossier AVA (business key)
 *   numeroBct  — number  — numéro d'accord BCT
 *   dateBct    — string  — date accord (ISO, passé ou aujourd'hui)
 *   typeBct    — string  — type BCT : "N" | "R" | "A" | "P"
 *   mntMvtAva  — number  — montant à cumuler sur mntAutoriseBct (> 0)
 */
interface AutorisationBctDTO {
  numDossier?: number;
  numeroBct?: number;
  dateBct?: string;
  typeBct?: string;
  mntMvtAva?: number;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const TYPE_DOSSIER_LABELS: Record<number, string> = {
  1: 'EXPORTATEUR',
  2: "MARCHE REALISABLE A L'ETRANGER",
  3: 'AUTRES ACTIVITES (ANNEXE N.2)',
  4: 'AUTRES ACTIVITES (BANQUES)',
  5: 'A. ACT. (PROM.-NOUV. PROJ.)',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AVAAlimentationAccordBCT({ initialDossierNum }: { initialDossierNum?: string } = {}) {
  const { showError } = useErrorHandler();
  const deepLinked = useRef(false);
  const [etape, setEtape] = useState<'recherche' | 'alimentation'>('recherche');
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualVerifModal, setShowManualVerifModal] = useState(false);
  const [manualVerifBaseUrl, setManualVerifBaseUrl] = useState('');
  const [isConfirmingVerif, setIsConfirmingVerif] = useState(false);

  // Workflow state
  const [wfAlimentationBctBusinessKey, setWfAlimentationBctBusinessKey] = useState<string | null>(null);

  // Filtres
  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');
  const [agences, setAgences] = useState<{ codeAgence: number; libelleAgence: string }[]>([]);

  // Formulaire — 4 champs exacts du DTO
  const [form, setForm] = useState<AutorisationBctDTO>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDossiers();
  }, []);

  // ── Fetch dossiers (etatDossier="V" uniquement — règle métier) ─────────────
  const fetchDossiers = async () => {
    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/operations-deleguees');
      if (!response.ok) throw new Error(`HTTP_ERROR_${response.status}`);

      interface OperationsDelegueeDTO {
        numDossier: number;
        typeDossierAva: number;
        dateDossier: string;
        codeAgence: number;
        noPieceClient: string;
        etatDossier: string;
        mntAutorise?: number;
        mntAutoriseBct?: number;
        mntAvance?: number;
        mntUtilise?: number;
        mntReserve?: number;
        mntBlocage?: number;
        solde?: number;
        beneficiaires?: Array<{ nomBenef?: string }>;
      }

      const data = await safeJsonParse<OperationsDelegueeDTO[]>(response);
      if (!data || !Array.isArray(data)) throw new Error('PARSE_ERROR');

      // Seuls les dossiers actifs (V) peuvent être alimentés — règle métier
      const actifs = data.filter((d) => d.etatDossier === 'V');

      // Résolution des libellés agence via API
      let agenceNameByCode = new Map<number, string>();
      try {
        const dgRes = await authenticatedFetch('/api/ref/donnees-generales');
        if (dgRes.ok) {
          const dg = await safeJsonParse<Array<{ codeBanque?: number }>>(dgRes);
          const cBanque = Array.isArray(dg) && dg.length > 0 ? Number(dg[0]?.codeBanque) : NaN;
          if (Number.isFinite(cBanque)) {
            const uniqueCodes = Array.from(new Set(actifs.map((d) => d.codeAgence)));
            const resolved = await Promise.all(
              uniqueCodes.map(async (code) => {
                try {
                  const ar = await authenticatedFetch(`/api/ref/agences/${cBanque}/${code}`);
                  if (!ar.ok) return null;
                  const ag = await safeJsonParse<{ libAgence?: string }>(ar);
                  return ag?.libAgence ? { code, lib: ag.libAgence } : null;
                } catch {
                  return null;
                }
              }),
            );
            agenceNameByCode = new Map(
              resolved
                .filter((r): r is { code: number; lib: string } => Boolean(r))
                .map((r) => [r.code, r.lib]),
            );
          }
        }
      } catch {
        /* fallback */
      }

      const dossiersTransformes: DossierAVA[] = actifs.map((dto) => {
        const nomComplet = (dto.beneficiaires?.[0]?.nomBenef || '').trim();
        const parts = nomComplet.split(' ');
        const prenom = parts.length > 1 ? parts[0] : '';
        const nom = parts.length > 1 ? parts.slice(1).join(' ') : nomComplet || 'N/A';

        return {
          numDossier: dto.numDossier,
          codeAgence: dto.codeAgence,
          libelleAgence: agenceNameByCode.get(dto.codeAgence) || `Agence ${dto.codeAgence}`,
          typeDossierAva: dto.typeDossierAva,
          codeTypeDossier: dto.typeDossierAva,
          libelleTypeDossier: TYPE_DOSSIER_LABELS[dto.typeDossierAva] || `Type ${dto.typeDossierAva}`,
          numeroDossier: String(dto.numDossier),
          dateDossier: dto.dateDossier,
          noPieceClient: dto.noPieceClient,
          nomClient: nom,
          prenomClient: prenom,
          mntAutorise: dto.mntAutorise ?? 0,
          mntAutoriseBct: dto.mntAutoriseBct ?? 0,
          mntAvance: dto.mntAvance ?? 0,
          mntUtilise: dto.mntUtilise ?? 0,
          mntReserve: dto.mntReserve ?? 0,
          mntBlocage: dto.mntBlocage ?? 0,
          solde: dto.solde ?? 0,
          etatDossier: dto.etatDossier,
        };
      });

      // Peupler la liste des agences pour le filtre
      const agencesFiltre = Array.from(
        new Map(dossiersTransformes.map((d) => [d.codeAgence, { codeAgence: d.codeAgence, libelleAgence: d.libelleAgence }])).values(),
      );
      setAgences(agencesFiltre);
      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
      showError('Veuillez vérifier votre connexion et réessayer', undefined, 'Impossible de charger les dossiers');
      setDossiers([]);
      setDossiersFiltres([]);
      setAgences([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...dossiers];
    if (searchNumeroDossier.trim()) {
      filtered = filtered.filter((d) =>
        d.numeroDossier.toLowerCase().includes(searchNumeroDossier.toLowerCase()),
      );
    }
    if (searchTypeDossier) {
      filtered = filtered.filter((d) => String(d.codeTypeDossier) === searchTypeDossier);
    }
    if (searchClient.trim()) {
      const term = searchClient.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.nomClient.toLowerCase().includes(term) ||
          d.noPieceClient.toLowerCase().includes(term),
      );
    }
    if (searchAgence) {
      filtered = filtered.filter((d) => String(d.codeAgence) === searchAgence);
    }
    setDossiersFiltres(filtered);
  }, [searchNumeroDossier, searchTypeDossier, searchClient, searchAgence, dossiers]);

  const resetFilters = () => {
    setSearchNumeroDossier('');
    setSearchTypeDossier('');
    setSearchClient('');
    setSearchAgence('');
  };

  // Deep-link: auto-select dossier navigated from dashboard
  useEffect(() => {
    if (!initialDossierNum || deepLinked.current || dossiers.length === 0) return;
    const found = dossiers.find(d => d.numeroDossier === initialDossierNum);
    if (found) { deepLinked.current = true; handleSelectDossier(found); }
  }, [dossiers, initialDossierNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sélection dossier ─────────────────────────────────────────────────────
  const handleSelectDossier = (dossier: DossierAVA) => {
    setDossierSelectionne(dossier);
    setForm({});
    setErrors({});
    setWfAlimentationBctBusinessKey(null); // Reset workflow state
    setEtape('alimentation');
  };

  const handleRetourRecherche = () => {
    setEtape('recherche');
    setDossierSelectionne(null);
    setForm({});
    setErrors({});
    setWfAlimentationBctBusinessKey(null); // Reset workflow state
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.numeroBct || isNaN(form.numeroBct)) {
      newErrors.numeroBct = 'Le numéro d\'accord BCT est obligatoire (entier)';
    }

    if (!form.dateBct) {
      newErrors.dateBct = "La date de l'accord BCT est obligatoire";
    } else {
      // Compare only the date part (YYYY-MM-DD)
      const todayStr = new Date().toISOString().split('T')[0];
      if (form.dateBct > todayStr) {
        newErrors.dateBct = "La date doit être passée ou aujourd'hui (@PastOrPresent)";
      }
    }

    if (!form.typeBct) {
      newErrors.typeBct = 'Le type BCT est obligatoire';
    }

    if (!form.mntMvtAva || form.mntMvtAva <= 0) {
      newErrors.mntMvtAva = 'Le montant doit être supérieur à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) {
      showError('Veuillez corriger les erreurs du formulaire');
      return;
    }
    if (!dossierSelectionne) return;

    setIsSubmitting(true);
    try {
      const payload: AutorisationBctDTO = {
        numDossier: dossierSelectionne.numDossier, // Business key for workflow
        numeroBct: form.numeroBct,
        dateBct: form.dateBct,
        typeBct: form.typeBct,
        mntMvtAva: form.mntMvtAva,
      };

      // ═══════════════════════════════════════════════════════════════════════
      // WORKFLOW INTEGRATION - Alimentation BCT
      // ═══════════════════════════════════════════════════════════════════════
      const wfResponse = wfAlimentationBctBusinessKey
        ? await continueAlimentationBctDecision(
            wfAlimentationBctBusinessKey,
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>
          )
        : await startAlimentationBctDecision(
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>
          );

      // Traiter la réponse du workflow
      if (wfResponse.result === 'OK') {
        // Sauvegarder la business key pour les soumissions futures
        const newKey = wfResponse.state?.businessKey;
        if (newKey) {
          setWfAlimentationBctBusinessKey(newKey);
        }

        // Étape 2 — Mise à jour validité accord BCT (ref service — port 8090)
        const updateUrl = `/api/ref/central-bank-agreements/update-validite?numAccordBct=${form.numeroBct}&dateAccordBct=${form.dateBct}&typeAccordBct=${form.typeBct}`;
        const updateRes = await authenticatedFetch(updateUrl, { method: 'POST' });
        const updateData = await safeJsonParse<{ message?: string }>(updateRes);
        const msg = updateData?.message || '';

        if (msg === 'success') {
          toast.success('Alimentation suite accord BCT enregistrée avec succès', {
            description: `Dossier ${dossierSelectionne.numeroDossier} — BCT N°${form.numeroBct}`,
          });
          handleRetourRecherche();
          await fetchDossiers();
        } else if (msg === 'already updated') {
          toast.info('Accord BCT déjà mis à jour', {
            description: `BCT N°${form.numeroBct} — Cet accord a déjà été consommé`,
          });
          handleRetourRecherche();
          await fetchDossiers();
        } else if (msg === 'expired date') {
          showError(`La date de fin d'application de cet accord BCT est dépassée`, undefined, 'Accord BCT expiré');
        } else if (msg === 'needs a manual verification') {
          // Portée * — demander confirmation avant d'utiliser flag=0
          setManualVerifBaseUrl(updateUrl);
          setShowManualVerifModal(true);
        } else {
          showError(msg || `HTTP ${updateRes.status}`, undefined, 'Erreur mise à jour validité');
        }

      } else if (wfResponse.result === 'REJECTED') {
        showError(wfResponse.errorMessage || 'Veuillez vérifier les données', undefined, 'Opération rejetée');
      } else if (wfResponse.result === 'ERROR') {
        showError(wfResponse.errorMessage || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('[WF] Exception:', error);
      showError(error instanceof Error ? error.message : 'Erreur inconnue', undefined, 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };
    // ── Refus vérification manuelle → flag=2 (mise à zéro) ────────────
    const handleDeclineManualVerif = async () => {
      setIsConfirmingVerif(true);
      try {
        const res = await authenticatedFetch(`${manualVerifBaseUrl}&flag=2`, { method: 'POST' });
        const data = await safeJsonParse<{ message?: string }>(res);
        if (data?.message === 'success') {
          toast.success('Accord BCT enregistré avec succès', {
            description: 'Validité consommée (mise à jour à "0")',
          });
          setShowManualVerifModal(false);
          handleRetourRecherche();
          await fetchDossiers();
        } else {
          showError(data?.message || 'Erreur inconnue', undefined, 'Erreur');
        }
      } catch {
        showError('Erreur lors de l\'enregistrement');
      } finally {
        setIsConfirmingVerif(false);
      }
    };

  // ── Confirmation vérification manuelle → flag=1 (réutilisable) ────────────────
  const handleConfirmManualVerif = async () => {
    setIsConfirmingVerif(true);
    try {
      const res = await authenticatedFetch(`${manualVerifBaseUrl}&flag=1`, { method: 'POST' });
      const data = await safeJsonParse<{ message?: string }>(res);
      if (data?.message === 'success') {
        toast.success('Accord BCT enregistré avec succès', {
          description: 'Validité maintenue à "*" (réutilisable)',
        });
        setShowManualVerifModal(false);
        handleRetourRecherche();
        await fetchDossiers();
      } else {
        showError(data?.message || 'Erreur inconnue', undefined, 'Erreur');
      }
    } catch {
      showError('Erreur lors de l\'enregistrement');
    } finally {
      setIsConfirmingVerif(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 — RECHERCHE
  // ═══════════════════════════════════════════════════════════════════════════
  if (etape === 'recherche') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        <div>
          <h1 className="text-3xl font-bold">Alimentation Suite Accord BCT</h1>
          <p className="text-muted-foreground mt-1">
            Rechercher un dossier valide (actif) pour l'alimenter suite à un accord BCT
          </p>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres de recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Numéro de dossier</Label>
                <Input
                  placeholder="Ex: 9360426"
                  value={searchNumeroDossier}
                  onChange={(e) => setSearchNumeroDossier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Type de dossier</Label>
                <Select value={searchTypeDossier} onValueChange={setSearchTypeDossier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - EXPORTATEUR</SelectItem>
                    <SelectItem value="2">2 - MARCHE REALISABLE A L'ETRANGER</SelectItem>
                    <SelectItem value="3">3 - AUTRES ACTIVITES (ANNEXE N.2)</SelectItem>
                    <SelectItem value="4">4 - AUTRES ACTIVITES (BANQUES)</SelectItem>
                    <SelectItem value="5">5 - A. ACT. (PROM.-NOUV. PROJ.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Input
                  placeholder="Nom ou N° pièce"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Agence</Label>
                <Select value={searchAgence} onValueChange={setSearchAgence}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les agences" />
                  </SelectTrigger>
                  <SelectContent>
                    {agences.map((a) => (
                      <SelectItem key={a.codeAgence} value={String(a.codeAgence)}>
                        {a.codeAgence} - {a.libelleAgence}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des dossiers */}
        <Card>
          <CardHeader>
            <CardTitle>Dossiers valides ({dossiersFiltres.length})</CardTitle>
            <CardDescription>
              Sélectionnez un dossier pour effectuer une alimentation suite accord BCT
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#435B7B] mx-auto" />
                <p className="text-muted-foreground mt-4">Chargement des dossiers...</p>
              </div>
            ) : dossiersFiltres.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun dossier trouvé</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Code Agence</th>
                      <th className="text-left p-3 font-semibold">Agence</th>
                      <th className="text-left p-3 font-semibold">Type Dossier</th>
                      <th className="text-left p-3 font-semibold">Numéro Dossier</th>
                      <th className="text-left p-3 font-semibold">Date Dossier</th>
                      <th className="text-left p-3 font-semibold">N° Pièce Client</th>
                      <th className="text-left p-3 font-semibold">Client</th>
                      <th className="text-left p-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((dossier, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <Badge variant="outline">{dossier.codeAgence}</Badge>
                        </td>
                        <td className="p-3 text-sm">{dossier.libelleAgence}</td>
                        <td className="p-3">
                          <Badge variant="secondary">
                            {dossier.codeTypeDossier} - {dossier.libelleTypeDossier}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{dossier.numeroDossier}</td>
                        <td className="p-3 text-sm">
                          {dossier.dateDossier
                            ? new Date(dossier.dateDossier).toLocaleDateString('fr-FR')
                            : '-'}
                        </td>
                        <td className="p-3 text-sm">{dossier.noPieceClient}</td>
                        <td className="p-3 text-sm">{dossier.nomClient}</td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() => handleSelectDossier(dossier)}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Sélectionner
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 — FORMULAIRE ALIMENTATION
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#d1dce6] border-t-[#435B7B]"></div>
          <p className="font-semibold text-[#2D3E54] text-xl tracking-wide">Alimentation en cours...</p>
        </div>
      )}
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleRetourRecherche}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Alimentation Suite Accord BCT</h1>
            <p className="text-muted-foreground mt-1">
              Dossier : {dossierSelectionne?.numeroDossier} — {dossierSelectionne?.nomClient}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>

      {/* Informations du dossier */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ligne 1 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Informations générales</h3>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Code Agence</p>
                <p className="font-medium">{dossierSelectionne?.codeAgence}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Agence</p>
                <p className="font-medium">{dossierSelectionne?.libelleAgence}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type de dossier</p>
                <p className="font-medium">
                  {dossierSelectionne?.codeTypeDossier} -{' '}
                  {dossierSelectionne?.libelleTypeDossier}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date du dossier</p>
                <p className="font-medium">
                  {dossierSelectionne?.dateDossier
                    ? new Date(dossierSelectionne.dateDossier).toLocaleDateString('fr-FR')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Numéro de dossier</p>
                <p className="font-medium">{dossierSelectionne?.numeroDossier}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">N° Pièce Client</p>
                <p className="font-medium">{dossierSelectionne?.noPieceClient}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nom du client</p>
                <p className="font-medium">
                  {dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* Montants */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Montants</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant autorisé</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {fmt(dossierSelectionne?.mntAutorise ?? 0)} TND
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-muted-foreground">Autorisation BCT actuelle</p>
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                  {fmt(dossierSelectionne?.mntAutoriseBct ?? 0)} TND
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sera cumulée après alimentation</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant avance</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {fmt(dossierSelectionne?.mntAvance ?? 0)} TND
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mt-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">Montant utilisé</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {fmt(dossierSelectionne?.mntUtilise ?? 0)} TND
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">Montant réservé</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {fmt(dossierSelectionne?.mntReserve ?? 0)} TND
                </p>
              </div>
              <div
                className={`p-3 rounded-lg border ${
                  (dossierSelectionne?.solde ?? 0) >= 0
                    ? 'bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <p className="text-muted-foreground">Solde disponible</p>
                <p
                  className={`text-lg font-semibold ${
                    (dossierSelectionne?.solde ?? 0) >= 0
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {fmt(dossierSelectionne?.solde ?? 0)} TND
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire — 4 champs exacts du DTO API */}
      <Card>
        <CardHeader>
          <CardTitle>Accord BCT</CardTitle>
          <CardDescription>
            Renseignez les informations de l'accord BCT reçu de la Banque Centrale de Tunisie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* numeroBct */}
            <div className="space-y-2">
              <Label htmlFor="numeroBct">N° Accord BCT *</Label>
              <Input
                id="numeroBct"
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 20261001"
                value={form.numeroBct ?? ''}
                onChange={(e) =>
                  setForm({ ...form, numeroBct: e.target.value ? Number(e.target.value) : undefined })
                }
                className={errors.numeroBct ? 'border-red-500' : ''}
              />
              {errors.numeroBct && <p className="text-xs text-red-600">{errors.numeroBct}</p>}
            </div>

            {/* dateBct */}
            <div className="space-y-2">
              <Label htmlFor="dateBct">Date Accord BCT *</Label>
              <Input
                id="dateBct"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={form.dateBct ?? ''}
                onChange={(e) => setForm({ ...form, dateBct: e.target.value })}
                className={errors.dateBct ? 'border-red-500' : ''}
              />
              {errors.dateBct && <p className="text-xs text-red-600">{errors.dateBct}</p>}
              <p className="text-xs text-muted-foreground">Date passée ou aujourd'hui</p>
            </div>

            {/* typeBct */}
            <div className="space-y-2">
              <Label htmlFor="typeBct">Type BCT *</Label>
              <Select
                value={form.typeBct ?? ''}
                onValueChange={(v) => setForm({ ...form, typeBct: v })}
                required
              >
                <SelectTrigger className={errors.typeBct ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">L — Lettre</SelectItem>
                  <SelectItem value="F1">F1</SelectItem>
                  <SelectItem value="F2">F2</SelectItem>
                </SelectContent>
              </Select>
              {errors.typeBct && <p className="text-xs text-red-600">{errors.typeBct}</p>}
            </div>

            {/* mntMvtAva */}
            <div className="space-y-2">
              <Label htmlFor="mntMvtAva">Montant Accord BCT *</Label>
              <Input
                id="mntMvtAva"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="Ex: 50000.000"
                value={form.mntMvtAva ?? ''}
                onChange={(e) =>
                  setForm({ ...form, mntMvtAva: e.target.value ? Number(e.target.value) : undefined })
                }
                className={errors.mntMvtAva ? 'border-red-500' : ''}
              />
              {errors.mntMvtAva && <p className="text-xs text-red-600">{errors.mntMvtAva}</p>}
              <p className="text-xs text-muted-foreground">
                Sera cumulé sur l'autorisation BCT actuelle (
                {fmt(dossierSelectionne?.mntAutoriseBct ?? 0)} TND)
              </p>
            </div>
          </div>

          {/* Aperçu du nouvel mntAutoriseBct */}
          {form.mntMvtAva && form.mntMvtAva > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Nouvelle autorisation BCT après alimentation :
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                {fmt((dossierSelectionne?.mntAutoriseBct ?? 0) + form.mntMvtAva)} TND
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmt(dossierSelectionne?.mntAutoriseBct ?? 0)} + {fmt(form.mntMvtAva)}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleRetourRecherche} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer l'Alimentation BCT
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal — vérification manuelle (portée *) */}
      <Dialog open={showManualVerifModal} onOpenChange={setShowManualVerifModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accord BCT à portée générale (*)</DialogTitle>
            <DialogDescription>
              Cet accord BCT a une <strong>portée générale (*)</strong> qui peut être réutilisé.
              <br /><br />
              <strong>Pouvez-vous réutiliser cette validité ?</strong>
              <br /><br />
              • <strong>Oui</strong> : La validité reste <strong>"*"</strong> (réutilisable)
              <br />
              • <strong>Non</strong> : La validité devient <strong>"0"</strong> (consommé)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeclineManualVerif}
              disabled={isConfirmingVerif}
            >
              {isConfirmingVerif && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Non (consommer)
            </Button>
            <Button onClick={handleConfirmManualVerif} disabled={isConfirmingVerif}>
              {isConfirmingVerif && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Oui (réutiliser)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
