import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Filter,
  PlayCircle,
  RefreshCw,
  Save,
  Search
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { safeJsonParse } from "../utils";
import { authenticatedFetch } from "../utils/api";
import {
  continueLeveeSuspensionDecision,
  startLeveeSuspensionDecision,
} from "../utils/workflowApi";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface DossierAVA {
  codeAgence: string | number;
  libelleAgence: string;
  typeDossier: string | number;
  codeTypeDossier?: string | number;
  libelleTypeDossier: string;
  numeroDossier: string;
  dateDossier: string;
  noPieceClient: string;
  nomClient: string;
  prenomClient?: string;
  montantAutorise: number;
  mntAutorise?: number;
  montantUtilise: number;
  mntUtilise?: number;
  mntAvance?: number;
  mntAutorisationBct?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde: number;
  devise: string;
  statut: "ACTIF" | "SUSPENDU" | "CLOTURE";
  echeance?: string;
  typePieceClient?: number;
}

interface LeveeSuspensionDTO {
  numeroDossier?: string;
  motifEtat?: string;
  dateLevee?: string;
  numBct?: string;
  dateBct?: string;
}

interface SuspensionData {
  dateEtat: string;
  motif?: string;
  motifSuspension?: string; // Gardé pour compatibilité si besoin
  codeEtat?: number; // 1 = Dépassement montant autorisé, etc.
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

interface BeneficiaireSummaryDTO {
  adresseBenef: string;
  noPieceBenef: string;
  nomBenef: string;
  qualite: string;
  typePieceBenef: number;
}

interface DonneesGenerales {
  codeBanque: number;
  nomBanque: string;
  codeAgence?: number;
  codeDouane?: string;
}

interface AgenceDetail {
  codeAgence: number;
  libelleAgence: string;
  // ... autres champs
}

export function AVALeveeSuspension() {
  const [etape, setEtape] = useState<"recherche" | "levee">(
    "recherche",
  );
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<
    DossierAVA[]
  >([]);
  const [dossierSelectionne, setDossierSelectionne] =
    useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualVerifModal, setShowManualVerifModal] = useState(false);
  const [manualVerifBaseUrl, setManualVerifBaseUrl] = useState('');
  const [isConfirmingVerif, setIsConfirmingVerif] = useState(false);

  // État workflow
  const [wfLeveeSuspensionBusinessKey, setWfLeveeSuspensionBusinessKey] = useState<string | null>(null);

  const [searchNumeroDossier, setSearchNumeroDossier] =
    useState("");
  const [searchTypeDossier, setSearchTypeDossier] =
    useState("");
  const [searchClient, setSearchClient] = useState("");
  const [searchAgence, setSearchAgence] = useState("");

  const [agences, setAgences] = useState<Agence[]>([]);
  const [codeBanque, setCodeBanque] = useState<number | null>(
    null,
  );
  const [agenceDetails, setAgenceDetails] = useState<
    Record<string, string>
  >({});
  const [beneficiaires, setBeneficiaires] = useState<
    BeneficiaireSummaryDTO[]
  >([]);

  const [levee, setLevee] = useState<LeveeSuspensionDTO>({
    dateLevee: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>(
    {},
  );
  const [showSuccessModal, setShowSuccessModal] =
    useState(false);
  const [leveeEnregistree, setLeveeEnregistree] =
    useState<LeveeSuspensionDTO | null>(null);
  const [suspensionData, setSuspensionData] =
    useState<SuspensionData | null>(null);
  const [loadingSuspensionData, setLoadingSuspensionData] =
    useState(false);

  useEffect(() => {
    fetchDonneesGenerales();
    fetchDossiers();
  }, []);

  const fetchDonneesGenerales = async () => {
    try {
      const response = await fetch(
        "/api/ref/donnees-generales",
      );

      if (response.ok) {
        const data =
          await safeJsonParse<DonneesGenerales[]>(response);
        if (data && data.length > 0) {
          const cBanque = data[0].codeBanque;
          setCodeBanque(cBanque);
          return;
        }
      }
      throw new Error("API_ERROR");
    } catch (error) {
      console.info("ℹ️ Mode démonstration - Code Banque");
      setCodeBanque(26); // Code banque par défaut
    }
  };

  const fetchAgenceDetail = async (
    codeAgence: string | number,
  ) => {
    if (!codeBanque) return null;

    const key = `${codeAgence}`;
    if (agenceDetails[key]) {
      return agenceDetails[key];
    }

    try {
      const response = await fetch(
        `/api/ref/agences/${codeBanque}/${codeAgence}`,
      );

      if (response.ok) {
        const data =
          await safeJsonParse<AgenceDetail>(response);
        if (data && data.libelleAgence) {
          setAgenceDetails((prev) => ({
            ...prev,
            [key]: data.libelleAgence,
          }));
          return data.libelleAgence;
        }
      }
      throw new Error("API_ERROR");
    } catch (error) {
      console.info("ℹ️ Mode démonstration - Détails Agence");
      return null;
    }
  };

  const fetchDossiers = async () => {
    setLoading(true);

    const mockDossiers: DossierAVA[] = [
      {
        codeAgence: 100,
        libelleAgence: "Agence Tunis Centre",
        typeDossier: 1,
        codeTypeDossier: 1,
        libelleTypeDossier: "EXPORTATEUR",
        numeroDossier: "AVA-1",
        dateDossier: "2024-01-15",
        noPieceClient: "1695881M",
        nomClient: "Dupont",
        prenomClient: "Jean",
        montantAutorise: 150000,
        mntAutorise: 150000,
        montantUtilise: 45000,
        mntUtilise: 45000,
        mntAvance: 75000,
        mntAutorisationBct: 30000,
        mntReserve: 30000,
        mntBlocage: 0,
        solde: 75000,
        devise: "TND",
        statut: "SUSPENDU",
        echeance: "2024-12-31",
        typePieceClient: 1,
      },
    ];

    const typeDossierLabels: Record<number, string> = {
      1: "EXPORTATEUR",
      2: "MARCHE REALISABLE A L'ETRANGER",
      3: "AUTRES ACTIVITES (ANNEXE N.2)",
      4: "IMPORTATEUR",
      5: "INVESTISSEMENT",
    };

    try {
      const response = await authenticatedFetch("/api/operations-deleguees");

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface OperationsDelegueeDTO {
        numDossier: number;
        typeDossierAva: number;
        dateDossier: string;
        codeAgence: number;
        noPieceClient: string;
        etatDossier: string;
        beneficiaires?: Array<{ nomBenef?: string }>;
      }

      const data =
        await safeJsonParse<OperationsDelegueeDTO[]>(response);
      if (data && Array.isArray(data)) {
        // Filter only suspended dossiers (etatDossier = "B")
        const suspended = data.filter((dto) => dto.etatDossier === "B");

        // Resolve agence labels from API
        let agenceNameByCode = new Map<number, string>();
        try {
          const dgRes = await fetch("/api/ref/donnees-generales");
          if (dgRes.ok) {
            const dg = await safeJsonParse<Array<{ codeBanque?: number }>>(dgRes);
            const cBanque = Array.isArray(dg) && dg.length > 0 ? Number(dg[0]?.codeBanque) : NaN;
            if (Number.isFinite(cBanque)) {
              const uniqueCodes = Array.from(new Set(suspended.map((d) => d.codeAgence)));
              const resolved = await Promise.all(
                uniqueCodes.map(async (code) => {
                  try {
                    const ar = await fetch(`/api/ref/agences/${cBanque}/${code}`);
                    if (!ar.ok) return null;
                    const ag = await safeJsonParse<{ libAgence?: string }>(ar);
                    return ag?.libAgence ? { code, lib: ag.libAgence } : null;
                  } catch { return null; }
                })
              );
              agenceNameByCode = new Map(
                resolved.filter((r): r is { code: number; lib: string } => Boolean(r))
                  .map((r) => [r.code, r.lib])
              );
            }
          }
        } catch { /* fallback to code only */ }

        const dossiersTransformes: DossierAVA[] = suspended.map(
          (dto) => {
            // Try to get client name from first beneficiaire
            const nomClient = dto.beneficiaires?.[0]?.nomBenef?.trim() || "";
            const nomParts = nomClient.split(" ");
            const prenom = nomParts.length > 1 ? nomParts[0] : "";
            const nom = nomParts.length > 1 ? nomParts.slice(1).join(" ") : nomClient;

            return {
              codeAgence: dto.codeAgence,
              libelleAgence:
                agenceNameByCode.get(dto.codeAgence) ||
                `Agence ${dto.codeAgence}`,
              typeDossier: dto.typeDossierAva,
              codeTypeDossier: dto.typeDossierAva,
              libelleTypeDossier:
                typeDossierLabels[dto.typeDossierAva] ||
                `Type ${dto.typeDossierAva}`,
              numeroDossier: `${dto.numDossier}`,
              dateDossier: dto.dateDossier,
              noPieceClient: dto.noPieceClient,
              nomClient: nom || "N/A",
              prenomClient: prenom || "",
              montantAutorise: 0,
              mntAutorise: 0,
              montantUtilise: 0,
              mntUtilise: 0,
              mntAvance: 0,
              mntAutorisationBct: 0,
              mntReserve: 0,
              mntBlocage: 0,
              solde: 0,
              devise: "TND",
              statut: "SUSPENDU",
              typePieceClient: 1,
            };
          },
        );

        setDossiers(dossiersTransformes);
        setDossiersFiltres(dossiersTransformes);
        setAgences(Array.from(new Map(dossiersTransformes.map(d => [String(d.codeAgence), { codeAgence: String(d.codeAgence), libelleAgence: d.libelleAgence }])).values()));
        return;
      }
      throw new Error("PARSE_ERROR");
    } catch (error) {
      console.info("ℹ️ Mode démonstration - Levée Suspension");
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let filtered = [...dossiers];

    if (searchNumeroDossier.trim()) {
      filtered = filtered.filter((d) =>
        d.numeroDossier
          .toLowerCase()
          .includes(searchNumeroDossier.toLowerCase()),
      );
    }

    if (searchTypeDossier) {
      filtered = filtered.filter(
        (d) => d.typeDossier.toString() === searchTypeDossier,
      );
    }

    if (searchClient.trim()) {
      const term = searchClient.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.nomClient.toLowerCase().includes(term) ||
          d.noPieceClient.toLowerCase().includes(term) ||
          d.prenomClient?.toLowerCase().includes(term),
      );
    }

    if (searchAgence) {
      filtered = filtered.filter(
        (d) => d.codeAgence.toString() === searchAgence,
      );
    }

    setDossiersFiltres(filtered);
  }, [
    searchNumeroDossier,
    searchTypeDossier,
    searchClient,
    searchAgence,
    dossiers,
  ]);

  const resetFilters = () => {
    setSearchNumeroDossier("");
    setSearchTypeDossier("");
    setSearchClient("");
    setSearchAgence("");
  };

  const fetchSuspensionData = async (numDossier: number) => {
    setLoadingSuspensionData(true);

    const mockSuspensionData: SuspensionData =
      numDossier % 2 === 0
        ? {
            dateEtat: "2024-02-10",
            motif: "DECLARATION FISCALE NON PRESENTEE",
            codeEtat: 2,
          }
        : {
            dateEtat: "2024-01-20",
            motif: "DÉPASSEMENT DU MONTANT AUTORISÉ",
            codeEtat: 1,
          };

    try {
      const response = await authenticatedFetch(
        `/api/operations-deleguees/${numDossier}`,
      );

      if (response.ok) {
        const data =
          await safeJsonParse<{ dateEtat?: string; motifEtat?: string; codeEtat?: number }>(response);
        if (data) {
          setSuspensionData({
            dateEtat: data.dateEtat || new Date().toISOString(),
            motif: data.motifEtat || "Motif inconnu",
            codeEtat: data.codeEtat,
          });
          setLoadingSuspensionData(false);
          return;
        }
      }
      throw new Error("API_ERROR");
    } catch (error) {
      console.info(
        "ℹ️ Mode démonstration - Données de suspension",
      );
      setSuspensionData(mockSuspensionData);
    } finally {
      setLoadingSuspensionData(false);
    }
  };

  const handleSelectDossier = async (dossier: DossierAVA) => {
    setLoading(true);
    setWfLeveeSuspensionBusinessKey(null); // Réinitialiser la clé workflow

    try {
      const numDossierStr = dossier.numeroDossier.replace(
        "AVA-",
        "",
      );
      const response = await authenticatedFetch(
        `/api/operations-deleguees/${numDossierStr}/summarybenf`,
      );

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface OperationsDelegueeSummaryDTO {
        codeTypeDosAva?: number;
        numDossier?: number;
        dateDossier?: string;
        codeAgenceAva?: number;
        typePieceClient?: number;
        noPieceClient?: string;
        mntAvance?: number;
        mntUtilise?: number;
        mntAutorise?: number;
        solde?: number;
        echeance?: string;
        mntAutorisationBct?: number;
        mntReserve?: number;
        mntBlocage?: number;
        beneficiaires?: BeneficiaireSummaryDTO[];
      }

      const summary =
        await safeJsonParse<OperationsDelegueeSummaryDTO>(
          response,
        );

      if (!summary) {
        throw new Error("JSON_PARSE_ERROR");
      }

      // Stocker les bénéficiaires
      setBeneficiaires(summary.beneficiaires || []);

      const dossierComplet: DossierAVA = {
        ...dossier,
        mntAutorise: summary.mntAutorise || 0,
        montantAutorise: summary.mntAutorise || 0,
        mntUtilise: summary.mntUtilise || 0,
        montantUtilise: summary.mntUtilise || 0,
        mntAvance: summary.mntAvance || 0,
        mntAutorisationBct: summary.mntAutorisationBct || 0,
        mntReserve: summary.mntReserve || 0,
        mntBlocage: summary.mntBlocage || 0,
        solde: summary.solde || 0,
        echeance: summary.echeance,
      };

      setDossierSelectionne(dossierComplet);
      setLevee({
        numeroDossier: dossier.numeroDossier,
        dateLevee: new Date().toISOString().split("T")[0],
      });
      setErrors({});
      setEtape("levee");

      // Récupérer les données de suspension
      const numDossierInt = parseInt(numDossierStr, 10);
      fetchSuspensionData(numDossierInt);

      // Récupérer le nom de l'agence dynamiquement
      if (codeBanque) {
        fetchAgenceDetail(dossier.codeAgence);
      }
    } catch (error: any) {
      setDossierSelectionne(dossier);
      setLevee({
        numeroDossier: dossier.numeroDossier,
        dateLevee: new Date().toISOString().split("T")[0],
      });
      setErrors({});
      setEtape("levee");

      const numDossierInt = parseInt(
        dossier.numeroDossier.replace(/\D/g, "") || "0",
        10,
      );
      fetchSuspensionData(numDossierInt);

      console.info(
        "ℹ️ Mode démonstration - Levée Suspension avec summarybenf",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetourRecherche = () => {
    setEtape("recherche");
    setDossierSelectionne(null);
    setWfLeveeSuspensionBusinessKey(null); // Réinitialiser la clé workflow
    setLevee({
      dateLevee: new Date().toISOString().split("T")[0],
    });
    setErrors({});
  };

  const isDepassementAutorise = 
    suspensionData?.codeEtat === 1 || 
    suspensionData?.motif === "DÉPASSEMENT DU MONTANT AUTORISÉ" ||
    suspensionData?.motifSuspension === "DÉPASSEMENT DU MONTANT AUTORISÉ";

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!levee.motifEtat || levee.motifEtat.trim() === "") {
      newErrors.motifEtat = "Le motif est obligatoire";
    }

    if (!levee.dateLevee) {
      newErrors.dateLevee = "La date est obligatoire";
    }

    if (isDepassementAutorise) {
      if (!levee.numBct || levee.numBct.trim() === "") {
        newErrors.numBct = "Numéro BCT est obligatoire";
      }
      if (!levee.dateBct) {
        newErrors.dateBct = "Date BCT est obligatoire";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setLeveeEnregistree(null);
    handleRetourRecherche();
    fetchDossiers();
  };

  // ── Refus vérification manuelle → flag=2 (mise à zéro) ────────────
  const handleDeclineManualVerif = async () => {
    setIsConfirmingVerif(true);
    try {
      const res = await authenticatedFetch(`${manualVerifBaseUrl}&flag=2`, { method: 'POST' });
      const data = await safeJsonParse<{ message?: string }>(res);
      if (data?.message === 'success') {
        toast.success('Levée de suspension enregistrée avec succès', {
          description: 'Validité BCT consommée (mise à jour à "0")',
        });
        setShowManualVerifModal(false);
        setLeveeEnregistree({ ...levee });
        setShowSuccessModal(true);
      } else {
        toast.error('Erreur', { description: data?.message || 'Erreur inconnue' });
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
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
        toast.success('Levée de suspension enregistrée avec succès', {
          description: 'Validité BCT maintenue à "*" (réutilisable)',
        });
        setShowManualVerifModal(false);
        setLeveeEnregistree({ ...levee });
        setShowSuccessModal(true);
      } else {
        toast.error('Erreur', { description: data?.message || 'Erreur inconnue' });
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsConfirmingVerif(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error(
        "Veuillez corriger les erreurs du formulaire",
      );
      return;
    }

    setIsSubmitting(true);

    // Préparation du payload selon le format attendu
    const numDossier = parseInt(
      levee.numeroDossier?.replace(/\D/g, "") || "0",
      10,
    );

    const payload = {
      numDossier,
      motifEtat: levee.motifEtat,
      numBct: levee.numBct ? parseInt(levee.numBct, 10) : 0,
      dateBct: levee.dateBct,
    };

    try {
      // Utiliser le workflow au lieu de l'appel API direct
      toast.info('Soumission au Service Central...', {
        description: 'Communication avec le moteur de workflow...',
      });

      const wfResponse = wfLeveeSuspensionBusinessKey
        ? await continueLeveeSuspensionDecision(
            wfLeveeSuspensionBusinessKey,
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>
          )
        : await startLeveeSuspensionDecision(
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>
          );

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) {
          setWfLeveeSuspensionBusinessKey(newKey);
        }

        // Si c'est un dépassement autorisé avec BCT, mettre à jour la validité
        if (isDepassementAutorise && levee.numBct && levee.dateBct) {
          const updateUrl = `/api/ref/central-bank-agreements/update-validite?numAccordBct=${levee.numBct}&dateAccordBct=${levee.dateBct}&typeAccordBct=L`;
          const updateRes = await authenticatedFetch(updateUrl, { method: 'POST' });
          const updateData = await safeJsonParse<{ message?: string }>(updateRes);
          const msg = updateData?.message || '';

          if (msg === 'success') {
            toast.success('Levée de suspension enregistrée avec succès', {
              description: `Dossier ${levee.numeroDossier} — BCT N°${levee.numBct}`,
              duration: 5000,
            });
            setLeveeEnregistree({ ...levee });
            setShowSuccessModal(true);
          } else if (msg === 'already updated') {
            toast.info('Levée de suspension enregistrée', {
              description: `Accord BCT N°${levee.numBct} déjà consommé`,
              duration: 5000,
            });
            setLeveeEnregistree({ ...levee });
            setShowSuccessModal(true);
          } else if (msg === 'expired date') {
            toast.error('Accord BCT expiré', {
              description: `La date de fin d'application de cet accord BCT est dépassée`,
            });
          } else if (msg === 'needs a manual verification') {
            // Portée * — demander confirmation
            setManualVerifBaseUrl(updateUrl);
            setShowManualVerifModal(true);
          } else {
            toast.error('Erreur mise à jour validité BCT', { 
              description: msg || `HTTP ${updateRes.status}` 
            });
          }
        } else {
          // Pas de BCT, juste afficher le succès
          toast.success('Levée de suspension soumise avec succès', {
            description: newKey ? `Dossier: ${newKey}` : undefined,
            duration: 5000,
          });
          setLeveeEnregistree({ ...levee });
          setShowSuccessModal(true);
        }

      } else if (wfResponse.result === 'REJECTED') {
        toast.error('Levée de suspension rejetée', {
          description: wfResponse.errorMessage || 'La levée de suspension a été rejetée par le workflow',
        });

      } else if (wfResponse.result === 'ERROR') {
        toast.error('Erreur workflow', {
          description: wfResponse.errorMessage || 'Une erreur est survenue lors du traitement',
        });
      }
    } catch (error) {
      console.error('Erreur lors de la levée de suspension:', error);
      toast.error('Erreur', {
        description: 'Une erreur est survenue lors de la levée de suspension',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (etape === "recherche") {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        <div className="anim-fade-in-up delay-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}>
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Levée de Suspension</h1>
              <p className="text-muted-foreground text-sm">
                Rechercher et sélectionner un dossier AVA suspendu pour lever la suspension
              </p>
            </div>
          </div>
        </div>

        <Card className="anim-fade-in-up delay-100 card-lift border-[#d1dce6]" style={{ borderTop: '3px solid #435B7B' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" style={{ color: '#435B7B' }} />
              <CardTitle className="text-base">Rechercher un dossier</CardTitle>
            </div>
            <CardDescription>
              Utilisez les filtres ci-dessous pour rechercher un
              dossier AVA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="searchNumeroDossier">
                  Numéro de dossier
                </Label>
                <Input
                  id="searchNumeroDossier"
                  placeholder="Ex: AVA-2024-001"
                  value={searchNumeroDossier}
                  onChange={(e) =>
                    setSearchNumeroDossier(e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchTypeDossier">
                  Type de dossier
                </Label>
                <Select
                  value={searchTypeDossier}
                  onValueChange={setSearchTypeDossier}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      1 - EXPORTATEUR
                    </SelectItem>
                    <SelectItem value="2">
                      2 - MARCHE REALISABLE A L'ETRANGER
                    </SelectItem>
                    <SelectItem value="3">
                      3 - AUTRES ACTIVITES (ANNEXE N.2)
                    </SelectItem>
                    <SelectItem value="4">
                      4 - AUTRES ACTIVITES (BANQUES)
                    </SelectItem>
                    <SelectItem value="5">
                      5 - A. ACT. (PROM.-NOUV. PROJ.)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchClient">Client</Label>
                <Input
                  id="searchClient"
                  placeholder="Nom, prénom ou N° pièce"
                  value={searchClient}
                  onChange={(e) =>
                    setSearchClient(e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchAgence">Agence</Label>
                <Select
                  value={searchAgence}
                  onValueChange={setSearchAgence}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les agences" />
                  </SelectTrigger>
                  <SelectContent>
                    {agences.map((agence) => (
                      <SelectItem
                        key={agence.codeAgence}
                        value={agence.codeAgence}
                      >
                        {agence.codeAgence} -{" "}
                        {agence.libelleAgence}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Dossiers suspendus ({dossiersFiltres.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez un dossier pour lever la suspension
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#435B7B] mx-auto"></div>
                <p className="text-muted-foreground mt-4">
                  Chargement des dossiers...
                </p>
              </div>
            ) : dossiersFiltres.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aucun dossier trouvé
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">
                        Code Agence
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Agence
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Type Dossier
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Numéro Dossier
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Date Dossier
                      </th>
                      <th className="text-left p-3 font-semibold">
                        N° Pièce Client
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Client
                      </th>
                      <th className="text-left p-3 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((dossier, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <Badge variant="outline">
                            {dossier.codeAgence}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {dossier.libelleAgence}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">
                            {dossier.codeTypeDossier} -{" "}
                            {dossier.libelleTypeDossier}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">
                          {dossier.numeroDossier}
                        </td>
                        <td className="p-3 text-sm">
                          {dossier.dateDossier
                            ? new Date(
                                dossier.dateDossier,
                              ).toLocaleDateString("fr-FR")
                            : "-"}
                        </td>
                        <td className="p-3 text-sm">
                          {dossier.noPieceClient}
                        </td>
                        <td className="p-3 text-sm">
                          {dossier.prenomClient}{" "}
                          {dossier.nomClient}
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSelectDossier(dossier)
                            }
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#d1dce6] border-t-[#435B7B]"></div>
          <p className="font-semibold text-[#2D3E54] text-xl tracking-wide">Levée de suspension en cours...</p>
        </div>
      )}
      <div className="flex items-center justify-between anim-fade-in-up delay-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRetourRecherche}
            className="border-[#d1dce6] hover:bg-[#EEF3F7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}>
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Levée de Suspension</h1>
              <p className="text-muted-foreground mt-1">
                Dossier : {dossierSelectionne?.numeroDossier} -{" "}
                {dossierSelectionne?.prenomClient}{" "}
                {dossierSelectionne?.nomClient}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Informations générales
            </h3>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">
                  Code Agence
                </p>
                <p className="font-medium">
                  {dossierSelectionne?.codeAgence}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Agence</p>
                <p className="font-medium">
                  {agenceDetails[
                    dossierSelectionne?.codeAgence?.toString() ||
                      ""
                  ] || dossierSelectionne?.libelleAgence}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  Type de dossier
                </p>
                <p className="font-medium">
                  {dossierSelectionne?.codeTypeDossier} -{" "}
                  {dossierSelectionne?.libelleTypeDossier}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  Date du dossier
                </p>
                <p className="font-medium">
                  {dossierSelectionne?.dateDossier
                    ? new Date(
                        dossierSelectionne.dateDossier,
                      ).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  Numéro de dossier
                </p>
                <p className="font-medium">
                  {dossierSelectionne?.numeroDossier}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">
                  N° Pièce Client
                </p>
                <p className="font-medium">
                  {dossierSelectionne?.noPieceClient}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  Nom du client
                </p>
                <p className="font-medium">
                  {dossierSelectionne?.prenomClient}{" "}
                  {dossierSelectionne?.nomClient}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t"></div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Montants de référence
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">
                  Montant autorisé
                </p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAutorise?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">
                  Montant avance
                </p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAvance?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">
                  Montant autorisation BCT
                </p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAutorisationBct?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              </div>
            </div>
          </div>

          <div className="border-t"></div>

          <div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">
                  Montant utilisé
                </p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntUtilise?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">
                  Montant réservé
                </p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntReserve?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              </div>
              <div
                className={`p-3 rounded-lg border ${(dossierSelectionne?.solde ?? 0) >= 0 ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}
              >
                <p className="text-muted-foreground">
                  Solde disponible
                </p>
                <p
                  className={`text-lg font-semibold ${(dossierSelectionne?.solde ?? 0) >= 0 ? "text-green-800 dark:text-green-300" : "text-red-700 dark:text-red-400"}`}
                >
                  {dossierSelectionne?.solde?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloc de consultation de la suspension */}
      <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400">
            Informations de la suspension
          </CardTitle>
          <CardDescription>
            Détails de la suspension en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSuspensionData ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2 text-sm">
                Chargement des données de suspension...
              </p>
            </div>
          ) : suspensionData ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Date d'état
                </p>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {new Date(
                    suspensionData.dateEtat,
                  ).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Motif de suspension
                </p>
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {suspensionData.motif ||
                    suspensionData.motifSuspension}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune donnée de suspension disponible
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formulaire Levée de Suspension</CardTitle>
          <CardDescription>
            Renseignez les informations de levée de suspension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="motifEtat">Motif *</Label>
              <Input
                id="motifEtat"
                value={levee.motifEtat || ""}
                onChange={(e) =>
                  setLevee({
                    ...levee,
                    motifEtat: e.target.value,
                  })
                }
                placeholder="Motif de la levée de suspension"
                className={
                  errors.motifEtat ? "border-red-500" : ""
                }
              />
              {errors.motifEtat && (
                <p className="text-xs text-red-600">
                  {errors.motifEtat}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateLevee">Date Levée *</Label>
              <Input
                id="dateLevee"
                type="date"
                value={levee.dateLevee}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Date système (sysdate)
              </p>
            </div>

            {/* Champs conditionnels pour motif "DÉPASSEMENT DU MONTANT AUTORISÉ" ou codeEtat=1 */}
            {isDepassementAutorise && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="numBct">
                    Numéro d'autorisation BCT *
                  </Label>
                  <Input
                    id="numBct"
                    value={levee.numBct || ""}
                    onChange={(e) =>
                      setLevee({
                        ...levee,
                        numBct: e.target.value,
                      })
                    }
                    placeholder="Numéro d'autorisation BCT"
                    className={errors.numBct ? "border-red-500" : ""}
                  />
                  {errors.numBct && (
                    <p className="text-xs text-red-600">{errors.numBct}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateBct">
                    Date d'autorisation BCT *
                  </Label>
                  <Input
                    id="dateBct"
                    type="date"
                    value={levee.dateBct || ""}
                    onChange={(e) =>
                      setLevee({
                        ...levee,
                        dateBct: e.target.value,
                      })
                    }
                    className={errors.dateBct ? "border-red-500" : ""}
                  />
                  {errors.dateBct && (
                    <p className="text-xs text-red-600">{errors.dateBct}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * Champs obligatoires
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetourRecherche}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle>
                  Levée de Suspension Enregistrée
                </DialogTitle>
                <DialogDescription>
                  La levée de suspension a été enregistrée avec
                  succès
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Numéro de dossier
                </p>
                <p className="font-semibold">
                  {leveeEnregistree?.numeroDossier}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  Date de levée
                </p>
                <p className="font-medium">
                  {leveeEnregistree?.dateLevee
                    ? new Date(
                        leveeEnregistree.dateLevee,
                      ).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  Motif de levée
                </p>
                <p className="font-medium text-green-600 dark:text-green-400">
                  {leveeEnregistree?.motifEtat || "-"}
                </p>
              </div>

              {leveeEnregistree?.numBct && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground">
                    Numéro d'autorisation BCT
                  </p>
                  <p className="font-medium">
                    {leveeEnregistree.numBct}
                  </p>
                </div>
              )}

              {leveeEnregistree?.dateBct && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground">
                    Date d'autorisation BCT
                  </p>
                  <p className="font-medium">
                    {leveeEnregistree.dateBct
                      ? new Date(
                          leveeEnregistree.dateBct,
                        ).toLocaleDateString("fr-FR")
                      : "-"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleCloseModal}
              className="w-full"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal — vérification manuelle (portée *) pour BCT */}
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