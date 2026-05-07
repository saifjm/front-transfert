import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Filter,
  PauseCircle,
  Save,
  Search
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { safeJsonParse } from "../utils";
import { authenticatedFetch } from "../utils/api";
import {
  continueSuspensionDecision,
  startSuspensionDecision,
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

interface SuspensionDTO {
  numeroDossier?: string;
  motifSuspension?: string;
  codeEtat?: number;
  motifEtat?: string;
  dateSuspension?: string;
  observations?: string;
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
}

export function AVASuspension({ initialDossierNum }: { initialDossierNum?: string } = {}) {
  const deepLinked = useRef(false);
  const [etape, setEtape] = useState<
    "recherche" | "suspension"
  >("recherche");
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<
    DossierAVA[]
  >([]);
  const [dossierSelectionne, setDossierSelectionne] =
    useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // État workflow
  const [wfSuspensionBusinessKey, setWfSuspensionBusinessKey] = useState<string | null>(null);

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

  const [suspension, setSuspension] = useState<SuspensionDTO>({
    dateSuspension: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>(
    {},
  );
  const [showSuccessModal, setShowSuccessModal] =
    useState(false);
  const [suspensionEnregistree, setSuspensionEnregistree] =
    useState<SuspensionDTO | null>(null);

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
        numeroDossier: "AVA-2024-001",
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
    ];

    const typeDossierLabels: Record<number, string> = {
      1: "EXPORTATEUR",
      2: "MARCHE REALISABLE A L'ETRANGER",
      3: "AUTRES ACTIVITES (ANNEXE N.2)",
      4: "IMPORTATEUR",
      5: "INVESTISSEMENT",
    };

    try {
      const response = await authenticatedFetch(
        "/api/operations-deleguees/dossiers-valides-avec-nom",
      );

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
      if (data && Array.isArray(data)) {
        // Resolve agence labels from API
        let agenceNameByCode = new Map<number, string>();
        try {
          const dgRes = await fetch("/api/ref/donnees-generales");
          if (dgRes.ok) {
            const dg = await safeJsonParse<Array<{ codeBanque?: number }>>(dgRes);
            const cBanque = Array.isArray(dg) && dg.length > 0 ? Number(dg[0]?.codeBanque) : NaN;
            if (Number.isFinite(cBanque)) {
              const uniqueCodes = Array.from(new Set(data.map((d) => d.codeAgence)));
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

        const dossiersTransformes: DossierAVA[] = data.map(
          (dto) => {
            const nomComplet = dto.nomClient?.trim() || "";
            const nomParts = nomComplet.split(" ");
            const prenom =
              nomParts.length > 1 ? nomParts[0] : "";
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
              statut: "ACTIF",
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
      console.info("ℹ️ Mode démonstration - Suspension");
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
    } finally {
      setLoading(false);
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

  const handleSelectDossier = async (dossier: DossierAVA) => {
    setLoading(true);
    setWfSuspensionBusinessKey(null); // Réinitialiser la clé workflow

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
      setSuspension({
        numeroDossier: dossier.numeroDossier,
        dateSuspension: new Date().toISOString().split("T")[0],
      });
      setErrors({});
      setEtape("suspension");

      // Récupérer le nom de l'agence dynamiquement
      if (codeBanque) {
        fetchAgenceDetail(dossier.codeAgence);
      }
    } catch (error: any) {
      setDossierSelectionne(dossier);
      setSuspension({
        numeroDossier: dossier.numeroDossier,
        dateSuspension: new Date().toISOString().split("T")[0],
      });
      setErrors({});
      setEtape("suspension");

      console.info(
        "ℹ️ Mode démonstration - Suspension avec summarybenf",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetourRecherche = () => {
    setEtape("recherche");
    setDossierSelectionne(null);
    setWfSuspensionBusinessKey(null); // Réinitialiser la clé workflow
    setSuspension({
      dateSuspension: new Date().toISOString().split("T")[0],
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!suspension.dateSuspension) {
      newErrors.dateSuspension =
        "La date de suspension est obligatoire";
    }

    if (
      !suspension.motifSuspension ||
      suspension.motifSuspension.trim() === ""
    ) {
      newErrors.motifSuspension = "Le motif est obligatoire";
    }

    if (
      suspension.motifSuspension === "99" &&
      (!suspension.observations ||
        suspension.observations.trim() === "")
    ) {
      newErrors.observations = "L'observation est obligatoire";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getMotifLibelle = (code: string): string => {
    const motifs: Record<string, string> = {
      "1": "Dépassement Du Montant Autorisé",
      "2": "Déclaration Fiscale Non Présentée",
      "3": "Total Importations Insuffisant",
      "4": "Dossier Non Renouvele",
      "99": "Autre Motif",
    };
    return motifs[code] || code;
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setSuspensionEnregistree(null);
    handleRetourRecherche();
    fetchDossiers();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error(
        "Veuillez corriger les erreurs du formulaire",
      );
      return;
    }

    setIsSubmitting(true);

    const numDossier = parseInt(
      suspension.numeroDossier?.replace("AVA-", "") || "0",
      10,
    );
    const codeEtat = parseInt(
      suspension.motifSuspension || "0",
      10,
    );
    const motifEtat =
      codeEtat === 99
        ? suspension.observations
        : getMotifLibelle(suspension.motifSuspension || "");

    const payload = {
      numDossier,
      codeEtat,
      motifEtat: motifEtat || "",
    };

    try {
      // Utiliser le workflow au lieu de l'appel API direct
      toast.info('Soumission au Service Central...', {
        description: 'Communication avec le moteur de workflow...',
      });

      const wfResponse = wfSuspensionBusinessKey
        ? await continueSuspensionDecision(
            wfSuspensionBusinessKey,
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>
          )
        : await startSuspensionDecision(
            'SOUMETTRE',
            payload as unknown as Record<string, unknown>
          );

      if (wfResponse.result === 'OK') {
        const newKey = wfResponse.state?.businessKey;
        if (newKey) {
          setWfSuspensionBusinessKey(newKey);
        }

        toast.success('Suspension soumise avec succès', {
          description: newKey ? `Dossier: ${newKey}` : undefined,
          duration: 5000,
        });

        // Afficher le Dialog de succès
        setSuspensionEnregistree({ ...suspension });
        setShowSuccessModal(true);

      } else if (wfResponse.result === 'REJECTED') {
        toast.error('Suspension rejetée', {
          description: wfResponse.errorMessage || 'La suspension a été rejetée par le workflow',
        });

      } else if (wfResponse.result === 'ERROR') {
        toast.error('Erreur workflow', {
          description: wfResponse.errorMessage || 'Une erreur est survenue lors du traitement',
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suspension:', error);
      toast.error('Erreur', {
        description: 'Une erreur est survenue lors de la suspension',
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
              <PauseCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Suspension</h1>
              <p className="text-muted-foreground text-sm">
                Rechercher et sélectionner un dossier AVA pour le suspendre
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
              Dossiers actifs ({dossiersFiltres.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez un dossier pour le suspendre
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#d1dce6] border-t-[#435B7B]"></div>
          <p className="font-semibold text-[#2D3E54] text-xl tracking-wide">Suspension en cours...</p>
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
              <PauseCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl" style={{ color: '#2D3E54' }}>Suspension</h1>
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

      <Card className="anim-fade-in-up delay-100 border-[#d1dce6]" style={{ borderTop: '3px solid #435B7B' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: '#435B7B' }} />
            <CardTitle className="text-base">Informations du dossier</CardTitle>
          </div>
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

      <Card className="anim-fade-in-up delay-200 card-lift border-[#d1dce6]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-4 h-4" style={{ color: '#435B7B' }} />
            <CardTitle className="text-base">Formulaire Suspension</CardTitle>
          </div>
          <CardDescription>
            Renseignez les informations de suspension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateSuspension">
                Date de Suspension *
              </Label>
              <Input
                id="dateSuspension"
                type="date"
                value={suspension.dateSuspension || ""}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Date système (sysdate)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motifSuspension">Motif *</Label>
              <Select
                value={suspension.motifSuspension || ""}
                onValueChange={(value) => {
                  setSuspension({
                    ...suspension,
                    motifSuspension: value,
                    observations:
                      value === "99"
                        ? suspension.observations
                        : "",
                  });
                }}
              >
                <SelectTrigger
                  className={
                    errors.motifSuspension
                      ? "border-red-500"
                      : ""
                  }
                >
                  <SelectValue placeholder="<Choisir>" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    Dépassement Du Montant Autorisé
                  </SelectItem>
                  <SelectItem value="2">
                    Déclaration Fiscale Non Présentée
                  </SelectItem>
                  <SelectItem value="3">
                    Total Importations Insuffisant
                  </SelectItem>
                  <SelectItem value="4">
                    Dossier Non Renouvele
                  </SelectItem>
                  <SelectItem value="99">
                    Autre Motif
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.motifSuspension && (
                <p className="text-xs text-red-600">
                  {errors.motifSuspension}
                </p>
              )}
            </div>
          </div>

          {suspension.motifSuspension === "99" && (
            <div className="space-y-2">
              <Label htmlFor="observations">
                Observation *
              </Label>
              <Input
                id="observations"
                value={suspension.observations || ""}
                onChange={(e) =>
                  setSuspension({
                    ...suspension,
                    observations: e.target.value,
                  })
                }
                placeholder="Veuillez préciser le motif..."
                className={
                  errors.observations ? "border-red-500" : ""
                }
              />
              {errors.observations && (
                <p className="text-xs text-red-600">
                  {errors.observations}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                  Suspension Enregistrée
                </DialogTitle>
                <DialogDescription>
                  La suspension a été enregistrée avec succès
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
                  {suspensionEnregistree?.numeroDossier}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  Date de suspension
                </p>
                <p className="font-medium">
                  {suspensionEnregistree?.dateSuspension
                    ? new Date(
                        suspensionEnregistree.dateSuspension,
                      ).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  Motif de suspension
                </p>
                <p className="font-medium text-red-600 dark:text-red-400">
                  {suspensionEnregistree?.motifSuspension
                    ? getMotifLibelle(
                        suspensionEnregistree.motifSuspension,
                      )
                    : "-"}
                </p>
              </div>

              {suspensionEnregistree?.motifSuspension ===
                "99" &&
                suspensionEnregistree?.observations && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">
                      Observation
                    </p>
                    <p className="font-medium">
                      {suspensionEnregistree.observations}
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
    </div>
  );
}