import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Search,
  ArrowLeft,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  BookmarkPlus,
  Building2,
  Filter,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { safeJsonParse } from "../utils";

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

interface ReservationDTO {
  reference?: string;
  numDossier?: number;
  mntMvtAva?: number;
  origine?: string;
  dateReservation?: string;
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

export function AVAReservation() {
  const [etape, setEtape] = useState<
    "recherche" | "reservation"
  >("recherche");
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<
    DossierAVA[]
  >([]);
  const [dossierSelectionne, setDossierSelectionne] =
    useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] =
    useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [apiError, setApiError] = useState<{
    error: string;
    message: string;
  } | null>(null);

  // Filtres de recherche
  const [searchNumeroDossier, setSearchNumeroDossier] =
    useState("");
  const [searchTypeDossier, setSearchTypeDossier] =
    useState("");
  const [searchClient, setSearchClient] = useState("");
  const [searchAgence, setSearchAgence] = useState("");

  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);

  // États pour la réservation
  const [reservation, setReservation] =
    useState<ReservationDTO>({
      dateReservation: new Date().toISOString().split("T")[0],
      origine: "FRONT",
    });

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
        statut: "ACTIF",
        echeance: "2024-12-31",
        typePieceClient: 1,
      },
      {
        codeAgence: 200,
        libelleAgence: "Agence Sfax",
        typeDossier: 2,
        codeTypeDossier: 2,
        libelleTypeDossier: "MARCHE REALISABLE A L'ETRANGER",
        numeroDossier: "AVA-2",
        dateDossier: "2024-02-10",
        noPieceClient: "2345678M",
        nomClient: "Martin",
        prenomClient: "Sophie",
        montantAutorise: 200000,
        mntAutorise: 200000,
        montantUtilise: 60000,
        mntUtilise: 60000,
        mntAvance: 100000,
        mntAutorisationBct: 40000,
        mntReserve: 40000,
        mntBlocage: 0,
        solde: 100000,
        devise: "TND",
        statut: "ACTIF",
        echeance: "2024-11-30",
        typePieceClient: 1,
      },
      {
        codeAgence: 300,
        libelleAgence: "Agence Sousse",
        typeDossier: 3,
        codeTypeDossier: 3,
        libelleTypeDossier: "AUTRES ACTIVITES (ANNEXE N.2)",
        numeroDossier: "AVA-3",
        dateDossier: "2024-03-05",
        noPieceClient: "3456789M",
        nomClient: "Ben Ali",
        prenomClient: "Ahmed",
        montantAutorise: 250000,
        mntAutorise: 250000,
        montantUtilise: 75000,
        mntUtilise: 75000,
        mntAvance: 125000,
        mntAutorisationBct: 50000,
        mntReserve: 50000,
        mntBlocage: 0,
        solde: 125000,
        devise: "TND",
        statut: "ACTIF",
        echeance: "2024-10-31",
        typePieceClient: 1,
      },
    ];

    // Labels pour les types de dossiers et agences
    const typeDossierLabels: Record<number, string> = {
      1: "EXPORTATEUR",
      2: "MARCHE REALISABLE A L'ETRANGER",
      3: "AUTRES ACTIVITES (ANNEXE N.2)",
      4: "IMPORTATEUR",
      5: "INVESTISSEMENT",
    };

    try {
      const response = await fetch("/api/operations-deleguees/dossiers-valides-avec-nom");

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
        // Ignore REF errors here and keep graceful fallback labels.
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

      console.log(
        "✅ API: Dossiers AVA chargés avec succès (" +
          dossiersTransformes.length +
          " dossiers)",
      );
    } catch (error: any) {
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);

      if (
        error?.message &&
        !error.message.includes("HTTP_ERROR") &&
        error.message !== "NOT_JSON" &&
        error.message !== "Failed to fetch"
      ) {
        console.info("ℹ️ Mode démonstration - Réservation");
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les agences
  const fetchAgences = async () => {
    try {
      const [dossiersResponse, donneesGeneralesResponse] = await Promise.all([
        fetch("/api/operations-deleguees/dossiers-valides-avec-nom"),
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

  // Sélectionner un dossier
  const handleSelectDossier = async (dossier: DossierAVA) => {
    setLoading(true);

    try {
      const numDossier = dossier.numeroDossier.replace(
        "AVA-",
        "",
      );
      const response = await fetch(
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
      console.log(
        "✅ API: Résumé du dossier chargé avec succès",
      );
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

    setReservation({
      numDossier: Number(
        dossier.numeroDossier.replace("AVA-", ""),
      ),
      dateReservation: new Date().toISOString().split("T")[0],
      origine: "virement",
    });
    setErrors({});
    setEtape("reservation");
  };

  // Retour à la recherche
  const handleRetourRecherche = () => {
    setEtape("recherche");
    setDossierSelectionne(null);
    setReservation({
      dateReservation: new Date().toISOString().split("T")[0],
      origine: "virement",
    });
    setErrors({});
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!reservation.mntMvtAva || reservation.mntMvtAva <= 0) {
      newErrors.mntMvtAva =
        "Le montant doit être supérieur à 0";
    }

    if (
      dossierSelectionne &&
      reservation.mntMvtAva &&
      reservation.mntMvtAva > dossierSelectionne.solde
    ) {
      newErrors.mntMvtAva = `Le montant ne peut pas dépasser le solde disponible (${dossierSelectionne.solde.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${dossierSelectionne.devise})`;
    }

    if (
      !reservation.reference ||
      reservation.reference.trim() === ""
    ) {
      newErrors.reference = "La référence est obligatoire";
    }

    if (!reservation.dateReservation) {
      newErrors.dateReservation =
        "La date de réservation est obligatoire";
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

    try {
      // Préparer les données pour l'API
      const payload = {
        reference: reservation.reference,
        numDossier: reservation.numDossier,
        mntMvtAva: reservation.mntMvtAva,
        origine: reservation.origine,
      };

      console.log("📤 Envoi de la réservation:", payload);

      const response = await fetch(
        "/api/reservation-operations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      console.log("📥 Réponse API status:", response.status);

      // Gestion du succès (200 OK)
      if (response.ok) {
        const result = await safeJsonParse<{
          refOperation?: number;
          numDossier?: number;
          status?: string;
          message?: string;
        }>(response);
        console.log(
          "✅ Réservation créée, passage à la validation:",
          result,
        );

        const refOperation = result?.refOperation;

        // Deuxième étape : Validation via refOperation reçu
        try {
          const validateResponse = await fetch(
            `/api/reservation-operations/validate/${reservation.reference}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
            },
          );

          console.log(
            "📥 Réponse Validation API status:",
            validateResponse.status,
          );

          if (validateResponse.ok) {
            const validateResult =
              await safeJsonParse<any>(validateResponse);
            console.log("✅ Validation réussie:", validateResult);
            setShowSuccessDialog(true);
          } else {
            const errData = await validateResponse.json().catch(() => null);
            setApiError({
              error: "Validation échouée",
              message:
                errData?.message ||
                "La réservation a été créée mais la validation a échoué.",
            });
            setShowErrorDialog(true);
          }
        } catch (valError) {
          console.error(
            "❌ Erreur lors de la validation:",
            valError,
          );
          setApiError({
            error: "Erreur technique de validation",
            message:
              "La réservation a été créée mais impossible de vérifier sa validité.",
          });
          setShowErrorDialog(true);
        }
        return;
      }

      // Gestion des erreurs
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);
        console.error("❌ Erreur API Creation:", errorData);

        setApiError({
          error: errorData?.error || "Erreur de création",
          message:
            errorData?.message ||
            `Impossible de créer la réservation (Code HTTP: ${response.status})`,
        });
        setShowErrorDialog(true);
        return;
      }
    } catch (error: any) {
      console.error("❌ Erreur globale handleSubmit:", error);

      // Mode démonstration en cas d'erreur réseau sur la création
      if (
        error?.message === "Failed to fetch" ||
        error?.name === "TypeError"
      ) {
        console.info("ℹ️ Mode démonstration");
        setShowSuccessDialog(true);
      } else {
        setApiError({
          error: "Erreur inattendue",
          message:
            error?.message ||
            "Une erreur inattendue s'est produite",
        });
        setShowErrorDialog(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    handleRetourRecherche();
    fetchDossiers();
  };

  const handleErrorClose = () => {
    setShowErrorDialog(false);
  };

  // ========== ÉTAPE 1 : RECHERCHE ==========
  if (etape === "recherche") {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        {/* En-tête */}
        <div className="anim-fade-in-up delay-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}>
              <BookmarkPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Réservation</h1>
              <p className="text-muted-foreground text-sm">
                Rechercher et sélectionner un dossier AVA pour effectuer une réservation
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
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des dossiers */}
        <Card className="anim-fade-in-up delay-200 border-[#d1dce6]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: '#435B7B' }} />
                <CardTitle className="text-base">
                  Dossiers valides ({dossiersFiltres.length})
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs" style={{ background: '#EEF3F7', color: '#435B7B' }}>
                {dossiersFiltres.length} résultat{dossiersFiltres.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <CardDescription>
              Sélectionnez un dossier pour effectuer une
              réservation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#d1dce6] border-t-[#435B7B] mx-auto"></div>
                <p className="text-muted-foreground mt-4 text-sm">
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
                    <tr className="border-b" style={{ background: '#F4F8FC' }}>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Code Agence
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Agence
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Type Dossier
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Numéro Dossier
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Date Dossier
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        N° Pièce Client
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Client
                      </th>
                      <th className="text-left p-3 text-xs" style={{ color: '#435B7B' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((dossier, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-[#EEF3F7]/50 transition-all duration-200"
                        style={{ animationDelay: `${index * 30}ms` }}
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

  // ========== ÉTAPE 2 : FORMULAIRE RÉSERVATION ==========
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* En-tête avec retour */}
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
              <BookmarkPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Réservation</h1>
              <p className="text-muted-foreground text-sm">
                Dossier : {dossierSelectionne?.numeroDossier} -{" "}
                {dossierSelectionne?.prenomClient}{" "}
                {dossierSelectionne?.nomClient}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }} className="text-white gap-2 hover:opacity-90 transition-opacity">
          <Save className="w-4 h-4" />
          Enregistrer
        </Button>
      </div>

      {/* Informations du dossier */}
      <Card className="anim-fade-in-up delay-100 border-[#d1dce6]" style={{ borderTop: '3px solid #435B7B' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: '#435B7B' }} />
            <CardTitle className="text-base">Informations du dossier</CardTitle>
          </div>
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

          {/* Montants utilisés et solde */}
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

      {/* Formulaire Réservation */}
      <Card className="anim-fade-in-up delay-200 card-lift border-[#d1dce6]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4" style={{ color: '#435B7B' }} />
            <CardTitle className="text-base">Formulaire Réservation</CardTitle>
          </div>
          <CardDescription>
            Renseignez les informations de réservation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Référence *</Label>
              <Input
                id="reference"
                value={reservation.reference || ""}
                onChange={(e) =>
                  setReservation({
                    ...reservation,
                    reference: e.target.value,
                  })
                }
                placeholder="Référence document"
                className={
                  errors.reference ? "border-red-500" : ""
                }
              />
              {errors.reference && (
                <p className="text-xs text-red-600">
                  {errors.reference}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="origine">Origine *</Label>
              <Select
                value={reservation.origine || "virement"}
                onValueChange={(value) =>
                  setReservation({
                    ...reservation,
                    origine: value,
                  })
                }
              >
                <SelectTrigger id="origine">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONETIQUE">
                    MNQ - MONETIQUE
                  </SelectItem>
                  <SelectItem value="virement">
                    VIR - VIREMENT
                  </SelectItem>
                  <SelectItem value="CHEQUE">
                    CHQ - CHEQUE
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mntMvtAva">Montant *</Label>
              <Input
                id="mntMvtAva"
                type="number"
                min="0"
                step="0.01"
                value={reservation.mntMvtAva || ""}
                onChange={(e) =>
                  setReservation({
                    ...reservation,
                    mntMvtAva:
                      Number(e.target.value) || undefined,
                  })
                }
                placeholder="Montant à réserver"
                className={
                  errors.mntMvtAva ? "border-red-500" : ""
                }
              />
              {errors.mntMvtAva && (
                <p className="text-xs text-red-600">
                  {errors.mntMvtAva}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum :{" "}
                {dossierSelectionne?.solde.toLocaleString(
                  "fr-FR",
                  {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  },
                )}{" "}
                {dossierSelectionne?.devise}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReservation">
                Date Réservation *
              </Label>
              <Input
                id="dateReservation"
                type="date"
                value={reservation.dateReservation}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Date système
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Actions finale */}
      <Card className="anim-fade-in-up delay-300 border-[#d1dce6]">
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
                className="gap-2 border-[#d1dce6]"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la liste
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' }}
                className="text-white gap-2 hover:opacity-90 transition-opacity"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de succès */}
      <Dialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Opération réussie
            </DialogTitle>
            <DialogDescription>
              La réservation a été enregistrée avec succès pour
              le dossier {dossierSelectionne?.numeroDossier}.
              {(reservation.mntMvtAva ?? 0) > 0 && (
                <p className="mt-2 font-semibold">
                  Montant :{" "}
                  {reservation.mntMvtAva?.toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  TND
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessClose}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'erreur */}
      <Dialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              Erreur lors de l'enregistrement
            </DialogTitle>
            <DialogDescription>
              <span className="font-bold">
                {apiError?.error}
              </span>
              <p className="mt-1">{apiError?.message}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleErrorClose}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}