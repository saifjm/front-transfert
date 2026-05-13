import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    Filter,
    Search,
    XCircle
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { safeJsonParse } from "../utils";
import { authenticatedFetch } from "../utils/api";
import {
    continueAnnulationReservationDecision,
    startAnnulationReservationDecision,
} from "../utils/workflowApi";
import { useErrorHandler } from './ErrorContext';
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

interface AnnulationReservationDTO {
  reference?: string;
  numDossier?: number;
  mntMvtAva?: number;
  origine?: string;
  dateAnnulation?: string;
}

interface Agence {
  codeAgence: string;
  libelleAgence: string;
}

interface DonneesGeneralesRefDTO {
  codeBanque?: number;
}

interface RefAgenceDTO {
  id?: {
    codeAgenceBct?: number;
  };
  libAgence?: string;
}

interface Reservation {
  dateResa: string;
  mntAnnulation: number;
  mntReserve: number;
  mntUtilise: number;
  numeroDossier: number;
  origine: string;
  referenceRes: string;
}

export function AVAAnnulationReservation({ initialDossierNum }: { initialDossierNum?: string } = {}) {
  const { showError } = useErrorHandler();
  const deepLinked = useRef(false);
  const [etape, setEtape] = useState<
    "recherche" | "annulation"
  >("recherche");
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<
    DossierAVA[]
  >([]);
  const [dossierSelectionne, setDossierSelectionne] =
    useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingReservations, setLoadingReservations] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] =
    useState(false);


  // Filtres de recherche
  const [searchNumeroDossier, setSearchNumeroDossier] =
    useState("");
  const [searchTypeDossier, setSearchTypeDossier] =
    useState("");
  const [searchClient, setSearchClient] = useState("");
  const [searchAgence, setSearchAgence] = useState("");

  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);

  // Liste des réservations
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);

  // États pour l'annulation de réservation
  const [annulation, setAnnulation] =
    useState<AnnulationReservationDTO>({
      dateAnnulation: new Date().toISOString().split("T")[0],
      origine: "FRONT",
    });

  const [wfAnnulationBusinessKey, setWfAnnulationBusinessKey] = useState<string | null>(null);

  // Réservation sélectionnée pour annulation
  const [reservationSelectionnee, setReservationSelectionnee] =
    useState<Reservation | null>(null);
  const [showConfirmModal, setShowConfirmModal] =
    useState(false);
  const [montantAnnulation, setMontantAnnulation] =
    useState<number>(0);
  const [errorMontant, setErrorMontant] = useState<string>("");

  // États de validation
  const [errors, setErrors] = useState<Record<string, string>>(
    {},
  );

  // Charger les dossiers et agences au montage
  useEffect(() => {
    fetchDossiers();
    fetchAgences();
  }, []);

  // Charger les dossiers AVA
  const fetchDossiers = async () => {
    setLoading(true);

    const typeDossierLabels: Record<number, string> = {
      1: "EXPORTATEUR",
      2: "MARCHE REALISABLE A L'ETRANGER",
      3: "AUTRES ACTIVITES (ANNEXE N.2)",
      4: "IMPORTATEUR",
      5: "INVESTISSEMENT",
    };

    try {
      const response = await authenticatedFetch("/api/operations-deleguees/dossiers-valides-avec-nom");

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface DossierValideDTO {
        codeAgence: number;
        typeDossierAva: number;
        numDossier: number;
        dateDossier: string;
        noPieceClient: string;
        nomClient: string | null;
      }

      const data =
        await safeJsonParse<DossierValideDTO[]>(response);

      if (!data || !Array.isArray(data)) {
        throw new Error("JSON_PARSE_ERROR");
      }

      const agenceCodes = Array.from(
        new Set(
          data
            .map((dto) => dto.codeAgence)
            .filter((code) => Number.isFinite(code)),
        ),
      );

      const agenceNameByCode = new Map<number, string>();
      try {
        const donneesGeneralesResponse = await fetch("/api/ref/donnees-generales");
        if (donneesGeneralesResponse.ok) {
          const donneesGenerales = await safeJsonParse<DonneesGeneralesRefDTO[]>(donneesGeneralesResponse);
          const codeBanque = Array.isArray(donneesGenerales)
            ? donneesGenerales.find((item) => typeof item?.codeBanque === "number")?.codeBanque
            : undefined;

          if (typeof codeBanque === "number") {
            const agenceResults = await Promise.all(
              agenceCodes.map(async (codeAgence) => {
                try {
                  const refAgenceResponse = await fetch(
                    `/api/ref/agences/${codeBanque}/${codeAgence}`,
                  );
                  if (!refAgenceResponse.ok) return null;
                  const agence = await safeJsonParse<RefAgenceDTO>(refAgenceResponse);
                  const libelle = agence?.libAgence?.trim();
                  return libelle ? { codeAgence, libelle } : null;
                } catch {
                  return null;
                }
              }),
            );

            agenceResults.forEach((result) => {
              if (result) {
                agenceNameByCode.set(result.codeAgence, result.libelle);
              }
            });
          }
        }
      } catch {
        // Ignore REF errors and keep fallback labels.
      }

      const dossiersTransformes: DossierAVA[] = data.map(
        (dto) => {
          const nomComplet = dto.nomClient?.trim() || "";
          const nomParts = nomComplet.split(" ");
          const prenom = nomParts.length > 1 ? nomParts[0] : "";
          const nom =
            nomParts.length > 1
              ? nomParts.slice(1).join(" ")
              : nomComplet;

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
            numeroDossier: `AVA-${dto.numDossier}`,
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
            statut: "ACTIF",
            typePieceClient: 1,
          };
        },
      );

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
      setAgences(
        agenceCodes.map((code) => ({
          codeAgence: String(code),
          libelleAgence: agenceNameByCode.get(code) || `Agence ${code}`,
        })),
      );

    } catch (error: any) {
      console.error('Erreur lors du chargement des dossiers:', error);
      toast.error('Impossible de charger les dossiers', {
        description: 'Veuillez vérifier votre connexion et réessayer',
      });
      setDossiers([]);
      setDossiersFiltres([]);
      setAgences([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les agences
  const fetchAgences = async () => {
    try {
      const [dossiersResponse, donneesGeneralesResponse] = await Promise.all([
        authenticatedFetch("/api/operations-deleguees/dossiers-valides-avec-nom"),
        fetch("/api/ref/donnees-generales"),
      ]);

      if (!dossiersResponse.ok || !donneesGeneralesResponse.ok) {
        return;
      }

      const dossiersData = await safeJsonParse<Array<{ codeAgence: number }>>(dossiersResponse);
      const donneesGenerales = await safeJsonParse<DonneesGeneralesRefDTO[]>(donneesGeneralesResponse);
      const codeBanque = Array.isArray(donneesGenerales)
        ? donneesGenerales.find((item) => typeof item?.codeBanque === "number")?.codeBanque
        : undefined;

      if (!Array.isArray(dossiersData) || typeof codeBanque !== "number") {
        return;
      }

      const agenceCodes = Array.from(
        new Set(
          dossiersData
            .map((d) => d.codeAgence)
            .filter((code) => Number.isFinite(code)),
        ),
      );

      const mappedAgences = await Promise.all(
        agenceCodes.map(async (codeAgence) => {
          try {
            const response = await fetch(`/api/ref/agences/${codeBanque}/${codeAgence}`);
            if (!response.ok) {
              return { codeAgence: String(codeAgence), libelleAgence: `Agence ${codeAgence}` };
            }
            const agence = await safeJsonParse<RefAgenceDTO>(response);
            return {
              codeAgence: String(codeAgence),
              libelleAgence: agence?.libAgence?.trim() || `Agence ${codeAgence}`,
            };
          } catch {
            return { codeAgence: String(codeAgence), libelleAgence: `Agence ${codeAgence}` };
          }
        }),
      );

      setAgences(mappedAgences);
    } catch {
      // Keep current state from fetchDossiers fallback.
    }
  };

  // Filtrer les dossiers
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

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchNumeroDossier("");
    setSearchTypeDossier("");
    setSearchClient("");
    setSearchAgence("");
  };

  // Deep-link: auto-select dossier navigated from dashboard
  useEffect(() => {
    if (!initialDossierNum || deepLinked.current || dossiers.length === 0) return;
    const found = dossiers.find(d => d.numeroDossier === initialDossierNum);
    if (found) { deepLinked.current = true; handleSelectDossier(found); }
  }, [dossiers, initialDossierNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sélectionner un dossier
  const handleSelectDossier = async (dossier: DossierAVA) => {
    setLoading(true);

    try {
      const numDossier = dossier.numeroDossier.replace(
        "AVA-",
        "",
      );
      const response = await authenticatedFetch(
        `/api/operations-deleguees/${numDossier}/summarybenf`,
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
      }

      const summary =
        await safeJsonParse<OperationsDelegueeSummaryDTO>(
          response,
        );

      if (!summary) {
        throw new Error("JSON_PARSE_ERROR");
      }

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
    } catch (error: any) {
      setDossierSelectionne(dossier);

      if (
        error?.message &&
        !error.message.includes("HTTP_ERROR") &&
        error.message !== "NOT_JSON" &&
        error.message !== "Failed to fetch"
      ) {
        console.info(
          "ℹ️ Mode démonstration - Résumé du dossier",
        );
      }
    } finally {
      setLoading(false);
    }

    setWfAnnulationBusinessKey(null);
    setAnnulation({
      numDossier: Number(
        dossier.numeroDossier.replace("AVA-", ""),
      ),
      dateAnnulation: new Date().toISOString().split("T")[0],
      origine: "virement",
    });
    setErrors({});
    setEtape("annulation");

    // Charger les réservations pour ce dossier
    const numDossierPure = dossier.numeroDossier.replace(
      "AVA-",
      "",
    );
    fetchReservations(numDossierPure);
  };

  // Retour à la recherche
  const handleRetourRecherche = () => {
    setEtape("recherche");
    setDossierSelectionne(null);
    setWfAnnulationBusinessKey(null);
    setAnnulation({
      dateAnnulation: new Date().toISOString().split("T")[0],
      origine: "virement",
    });
    setErrors({});
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!annulation.mntMvtAva || annulation.mntMvtAva <= 0) {
      newErrors.mntMvtAva =
        "Le montant doit être supérieur à 0";
    }

    if (
      dossierSelectionne &&
      annulation.mntMvtAva &&
      annulation.mntMvtAva >
        (dossierSelectionne.mntReserve || 0)
    ) {
      newErrors.mntMvtAva = `Le montant ne peut pas dépasser le montant réservé (${dossierSelectionne.mntReserve?.toLocaleString(
        "fr-FR",
        { minimumFractionDigits: 3, maximumFractionDigits: 3 },
      )} ${dossierSelectionne.devise})`;
    }

    if (
      !annulation.reference ||
      annulation.reference.trim() === ""
    ) {
      newErrors.reference = "La référence est obligatoire";
    }

    if (!annulation.dateAnnulation) {
      newErrors.dateAnnulation =
        "La date d'annulation est obligatoire";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error(
        "Veuillez corriger les erreurs du formulaire",
      );
      return;
    }

    setIsSubmitting(true);

    const payload = {
      reference: annulation.reference,
      numDossier: annulation.numDossier,
      mntMvtAva: annulation.mntMvtAva,
      origine: annulation.origine,
    };

    try {
      toast.info('Soumission au Service Central...', {
        description: 'Communication avec le moteur de workflow...',
      });

      const wfResponse = wfAnnulationBusinessKey
        ? await continueAnnulationReservationDecision(
            wfAnnulationBusinessKey,
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>,
          )
        : await startAnnulationReservationDecision(
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>,
          );

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) setWfAnnulationBusinessKey(newKey);
        toast.success('Annulation de réservation soumise avec succès', {
          description: newKey ? `Référence: ${newKey}` : undefined,
          duration: 5000,
        });
        setShowSuccessDialog(true);
      } else if (wfResponse.result === 'REJECTED') {
        showError(wfResponse.errorMessage || 'La demande a été rejetée par le workflow', undefined, 'Annulation rejetée');
      } else if (wfResponse.result === 'ERROR') {
        showError(wfResponse.errorMessage || 'Une erreur est survenue lors du traitement');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'annulation de réservation:', error);
      toast.error('Erreur du moteur de workflow', {
        description: error?.message || 'Vérifiez que le WF engine (port 8843) est démarré.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir le modal de confirmation pour annuler une réservation
  const handleOpenConfirmModal = (reservation: Reservation) => {
    setReservationSelectionnee(reservation);
    setShowConfirmModal(true);
    setMontantAnnulation(reservation.mntReserve);
    setErrorMontant("");
  };

  // Confirmer l'annulation de la réservation
  const handleConfirmAnnulation = async () => {
    if (!reservationSelectionnee || !dossierSelectionne) {
      return;
    }

    // Validation finale du montant
    if (montantAnnulation <= 0) {
      setErrorMontant("Le montant doit être supérieur à 0");
      return;
    }

    if (
      montantAnnulation > reservationSelectionnee.mntReserve
    ) {
      setErrorMontant(
        `Le montant ne peut pas dépasser ${reservationSelectionnee.mntReserve.toLocaleString(
          "fr-FR",
          {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          },
        )} TND`,
      );
      return;
    }

    setIsSubmitting(true);
    setShowConfirmModal(false);

    const payload = {
      reference: reservationSelectionnee.referenceRes,
      numDossier: Number(
        dossierSelectionne.numeroDossier.replace("AVA-", ""),
      ),
      mntMvtAva: montantAnnulation,
      origine: reservationSelectionnee.origine,
    };

    try {
      toast.info('Soumission au Service Central...', {
        description: 'Communication avec le moteur de workflow...',
      });

      const wfResponse = await startAnnulationReservationDecision(
        'SOUMETTRE',
        payload as unknown as Record<string, unknown>,
      );

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        toast.success('Annulation de réservation soumise avec succès', {
          description: newKey ? `Référence: ${newKey}` : undefined,
          duration: 5000,
        });
        setShowSuccessDialog(true);
        setTimeout(async () => {
          setShowSuccessDialog(false);
          setReservationSelectionnee(null);
          const numDossierPure =
            dossierSelectionne?.numeroDossier.replace("AVA-", "");
          await fetchReservations(numDossierPure);
        }, 3000);
      } else if (wfResponse.result === 'REJECTED') {
        showError(wfResponse.errorMessage || 'La demande a été rejetée par le workflow', undefined, 'Annulation rejetée');
      } else if (wfResponse.result === 'ERROR') {
        showError(wfResponse.errorMessage || 'Une erreur est survenue lors du traitement');
      }
    } catch (error: any) {
      console.error('Erreur lors de la confirmation d\'annulation:', error);
      toast.error('Erreur du moteur de workflow', {
        description: error?.message || 'Vérifiez que le WF engine (port 8843) est démarré.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Charger les réservations
  const fetchReservations = async (
    explicitNumDossier?: string,
  ) => {
    setLoadingReservations(true);

    try {
      const numDossier =
        explicitNumDossier ||
        dossierSelectionne?.numeroDossier.replace("AVA-", "");

      if (!numDossier) {
        throw new Error("Dossier ID is undefined");
      }

      const response = await authenticatedFetch(
        `/api/reservations/numdossier/${numDossier}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      const data = await safeJsonParse<Reservation[]>(response);

      if (!data || !Array.isArray(data)) {
        throw new Error("JSON_PARSE_ERROR");
      }

      // Garder les réservations avec un solde restant > 0
      // Le montant restant = mntReserve - mntAnnulation (déjà annulé)
      const reservationsFiltrees = data
        .filter((r) => r.referenceRes && r.referenceRes.trim() !== "")
        .map((r) => ({
          ...r,
          mntReserve: r.mntReserve - (r.mntAnnulation ?? 0),
        }))
        .filter((r) => r.mntReserve > 0);

      setReservations(reservationsFiltrees);

    } catch (error: any) {
      console.error('Erreur lors du chargement des réservations:', error);
      toast.error('Impossible de charger les réservations', {
        description: 'Veuillez vérifier votre connexion et réessayer',
      });
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  };

  // ========== ÉTAPE 1 : RECHERCHE ==========
  if (etape === "recherche") {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        {/* En-tête */}
        <div className="anim-fade-in-up delay-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}>
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Annulation de Réservation</h1>
              <p className="text-muted-foreground text-sm">
                Rechercher et sélectionner un dossier AVA pour annuler une réservation
              </p>
            </div>
          </div>
        </div>

        {/* Filtres de recherche */}
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

        {/* Liste des dossiers */}
        <Card>
          <CardHeader>
            <CardTitle>
              Dossiers valides ({dossiersFiltres.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez un dossier pour annuler une
              réservation
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
                            disabled={
                              dossier.statut !== "ACTIF"
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

  // ========== ÉTAPE 2 : FORMULAIRE ANNULATION RÉSERVATION ==========
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#d1dce6] border-t-[#435B7B]"></div>
          <p className="font-semibold text-[#2D3E54] text-xl tracking-wide">Annulation en cours...</p>
        </div>
      )}
      {/* Dialog de succès */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-xl">
                Succès
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-base py-4">
            L'annulation de réservation a été enregistrée avec
            succès.
            <br />
            <span className="font-medium">
              Référence: {reservationSelectionnee?.referenceRes}{" "}
              - Montant:{" "}
              {montantAnnulation.toLocaleString("fr-FR", {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}{" "}
              TND
            </span>
          </DialogDescription>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmation d'annulation */}
      <Dialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">
              Confirmer l'annulation de réservation
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-base py-4 space-y-4">
            <p>
              Voulez-vous vraiment annuler cette réservation ?
            </p>
            {reservationSelectionnee && (
              <>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Référence:
                    </span>
                    <span className="font-medium">
                      {reservationSelectionnee.referenceRes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Origine:
                    </span>
                    <span className="font-medium">
                      {reservationSelectionnee.origine.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Montant de la réservation:
                    </span>
                    <span className="font-semibold text-purple-700 dark:text-purple-400">
                      {reservationSelectionnee.mntReserve.toLocaleString(
                        "fr-FR",
                        {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        },
                      )}{" "}
                      TND
                    </span>
                  </div>
                </div>

                {/* Input Montant à annuler */}
                <div className="space-y-2">
                  <Label htmlFor="montantAnnulation">
                    Montant à annuler *
                  </Label>
                  <Input
                    id="montantAnnulation"
                    type="number"
                    min="0"
                    max={reservationSelectionnee.mntReserve}
                    step="0.001"
                    value={montantAnnulation || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setMontantAnnulation(value);

                      // Validation
                      if (value <= 0) {
                        setErrorMontant(
                          "Le montant doit être supérieur à 0",
                        );
                      } else if (
                        value >
                        reservationSelectionnee.mntReserve
                      ) {
                        setErrorMontant(
                          `Le montant ne peut pas dépasser ${reservationSelectionnee.mntReserve.toLocaleString(
                            "fr-FR",
                            {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            },
                          )} TND`,
                        );
                      } else {
                        setErrorMontant("");
                      }
                    }}
                    placeholder="Saisissez le montant à annuler"
                    className={
                      errorMontant ? "border-red-500" : ""
                    }
                  />
                  {errorMontant && (
                    <p className="text-xs text-red-600">
                      {errorMontant}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Maximum :{" "}
                    {reservationSelectionnee.mntReserve.toLocaleString(
                      "fr-FR",
                      {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      },
                    )}{" "}
                    TND
                  </p>
                </div>
              </>
            )}
          </DialogDescription>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false);
                setReservationSelectionnee(null);
                setErrorMontant("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmAnnulation}
              disabled={
                isSubmitting ||
                !!errorMontant ||
                montantAnnulation <= 0
              }
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* En-tête avec retour */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRetourRecherche}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Annulation de Réservation
          </h1>
          <p className="text-muted-foreground mt-1">
            Dossier : {dossierSelectionne?.numeroDossier} -{" "}
            {dossierSelectionne?.prenomClient}{" "}
            {dossierSelectionne?.nomClient}
          </p>
        </div>
      </div>

      {/* Informations du dossier */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations générales */}
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
                  {dossierSelectionne?.libelleAgence}
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

          {/* Montants de référence */}
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
                  {dossierSelectionne?.devise}
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
                  {dossierSelectionne?.devise}
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
                  {dossierSelectionne?.devise}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t"></div>

          {/* Montants utilisés */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Montants utilisés
            </h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
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
                  {dossierSelectionne?.devise}
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
                  {dossierSelectionne?.devise}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">
                  Montant blocage
                </p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntBlocage?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  {dossierSelectionne?.devise}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg border ${
                  (dossierSelectionne?.solde || 0) > 0
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <p className="text-muted-foreground">
                  Solde disponible
                </p>
                <p
                  className={`text-lg font-semibold ${
                    (dossierSelectionne?.solde || 0) > 0
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {dossierSelectionne?.solde?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  {dossierSelectionne?.devise}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des Réservations */}
      <Card>
        <CardHeader>
          <CardTitle>
            Réservations du dossier ({reservations.length})
          </CardTitle>
          <CardDescription>
            Liste des réservations effectuées sur ce dossier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReservations ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#435B7B] mx-auto"></div>
              <p className="text-muted-foreground mt-4">
                Chargement des réservations...
              </p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucune réservation trouvée
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Ce dossier n'a pas de réservations actives
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">
                      Référence
                    </th>
                    <th className="text-left p-3 font-semibold">
                      Origine
                    </th>
                    <th className="text-right p-3 font-semibold">
                      Montant Réservé
                    </th>
                    <th className="text-center p-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 font-medium">
                        {reservation.referenceRes}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {reservation.origine.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-sm font-medium text-purple-700 dark:text-purple-400">
                        {reservation.mntReserve.toLocaleString(
                          "fr-FR",
                          {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          },
                        )}{" "}
                        TND
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleOpenConfirmModal(reservation)
                          }
                          disabled={
                            isSubmitting ||
                            reservation.mntReserve <= 0
                          }
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler
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