import { useState, useEffect, useRef } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  ArrowLeft,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Users,
  Building2,
  Paperclip,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import { safeJsonParse } from "../utils";
import { authenticatedFetch } from "../utils/api";

interface DocumentJoint {
  numLigne?: number;
  numDossier: number;
  dateOperation: string;
  extention: string;
  referenceFichierJoint: string;
  typeDocument: number;
  refOperation?: number;
  pathAnnee?: string;
  pathMois?: string;
}

interface Beneficiaire {
  adresseBenef: string;
  noPieceBenef: string;
  nomBenef: string;
  qualite: string;
  typePieceBenef: number;
}

interface DossierAVAConsultation {
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
  declarationFiscale?: string;
  numeroCompte?: string;
  codeActivite?: number;
  tel?: string;
  numeroBct?: number | string;
  dateBct?: string;
  beneficiaires?: Beneficiaire[];
  documents?: DocumentJoint[];
}

type SortColumn = keyof DossierAVAConsultation | null;
type SortDirection = "asc" | "desc";

export function ConsultationDossierAVA({ initialNumeroDossier }: { initialNumeroDossier?: string } = {}) {
  const documentsBasePath = String(
    import.meta.env.VITE_DOCUMENTS_BASE_PATH || "",
  ).trim();
  const [etape, setEtape] = useState<"liste" | "detail">(
    "liste",
  );
  const [dossiers, setDossiers] = useState<
    DossierAVAConsultation[]
  >([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<
    DossierAVAConsultation[]
  >([]);
  const [dossierSelectionne, setDossierSelectionne] =
    useState<DossierAVAConsultation | null>(null);
  const [loading, setLoading] = useState(false);

  // États de tri
  const [sortColumn, setSortColumn] =
    useState<SortColumn>(null);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  // États de filtres
  const [filtres, setFiltres] = useState({
    codeTypeDossier: "",
    numeroDossier: "",
    dateDossier: "",
    codeAgence: "",
    noPieceClient: "",
    nomClient: "",
    declarationFiscale: "",
    statut: "",
    numeroCompte: "",
  });

  // Données détail
  const [beneficiaires, setBeneficiaires] = useState<
    Beneficiaire[]
  >([]);
  const [documents, setDocuments] = useState<DocumentJoint[]>(
    [],
  );

  // Charger les dossiers au montage
  useEffect(() => {
    fetchDossiers();
  }, []);

  const deepLinked = useRef(false);

  // Charger les dossiers
  const fetchDossiers = async () => {
    setLoading(true);

    try {
      const [response] = await Promise.all([
        authenticatedFetch("/api/operations-deleguees"),
      ]);

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface OperationsDelegueeDTO {
        numDossier: number;
        typeDossierAva: number;
        dateDossier: string;
        codeAgence: number;
        typePieceClient?: number;
        noPieceClient: string;
        nomClient?: string;
        numeroCompte?: string;
        tel?: string;
        codeActivite?: number;
        declarationFiscale?: string;
        mntAvance?: number;
        mntUtilise?: number;
        mntAutorise?: number;
        mntAutoriseBct?: number;
        mntReserve?: number;
        mntBlocage?: number;
        solde?: number;
        numeroBct?: number | string;
        dateBct?: string;
        echeance?: string;
        etatDossier?: string;
        beneficiaires?: Beneficiaire[];
        documents?: DocumentJoint[];
      }

      const data =
        await safeJsonParse<OperationsDelegueeDTO[]>(response);

      if (!data || !Array.isArray(data)) {
        throw new Error("JSON_PARSE_ERROR");
      }

      let agenceNameByCode = new Map<number, string>();
      try {
        const donneesGeneralesResponse = await fetch(
          "/api/ref/donnees-generales",
        );
        if (donneesGeneralesResponse.ok) {
          const donneesGenerales =
            await safeJsonParse<Array<{ codeBanque?: number }>>(
              donneesGeneralesResponse,
            );
          const codeBanque =
            Array.isArray(donneesGenerales) &&
            donneesGenerales.length > 0
              ? Number(donneesGenerales[0]?.codeBanque)
              : NaN;

          if (Number.isFinite(codeBanque)) {
            const uniqueAgences = Array.from(
              new Set(
                data
                  .map((dto) => Number(dto.codeAgence))
                  .filter((code) => Number.isFinite(code)),
              ),
            ) as number[];

            const agences = await Promise.all(
              uniqueAgences.map(async (codeAgence) => {
                try {
                  const agenceResponse = await fetch(
                    `/api/ref/agences/${codeBanque}/${codeAgence}`,
                  );
                  if (!agenceResponse.ok) return null;
                  const agence = await safeJsonParse<{
                    libAgence?: string;
                  }>(agenceResponse);
                  return {
                    codeAgence,
                    libAgence:
                      agence?.libAgence || `Agence ${codeAgence}`,
                  };
                } catch {
                  return null;
                }
              }),
            );

            agenceNameByCode = new Map(
              agences
                .filter(
                  (
                    item,
                  ): item is {
                    codeAgence: number;
                    libAgence: string;
                  } => Boolean(item),
                )
                .map((item) => [item.codeAgence, item.libAgence]),
            );
          }
        }
      } catch {
        agenceNameByCode = new Map();
      }

      const typeDossierLabels: Record<number, string> = {
        1: "EXPORTATEUR",
        2: "MARCHE REALISABLE A L'ETRANGER",
        3: "AUTRES ACTIVITES (ANNEXE N.2)",
        4: "AUTRES ACTIVITES (BANQUES)",
        5: "A. ACT. (PROM.-NOUV. PROJ.)",
      };

      const dossiersTransformes: DossierAVAConsultation[] =
        data.map((dto) => {
          // Try nomClient first, fallback to first beneficiaire name
          const nomComplet = (
            dto.nomClient ||
            (dto as any).beneficiaires?.[0]?.nomBenef ||
            ""
          ).trim();
          const nomParts = nomComplet.split(" ");
          const prenom = nomParts.length > 1 ? nomParts[0] : "";
          const nom =
            nomParts.length > 1
              ? nomParts.slice(1).join(" ")
              : nomComplet || "-";

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
            nomClient: nom,
            prenomClient: prenom,
            montantAutorise: dto.mntAutorise ?? 0,
            mntAutorise: dto.mntAutorise ?? 0,
            montantUtilise: dto.mntUtilise ?? 0,
            mntUtilise: dto.mntUtilise ?? 0,
            mntAvance: dto.mntAvance ?? 0,
            mntAutorisationBct: dto.mntAutoriseBct ?? 0,
            mntReserve: dto.mntReserve ?? 0,
            mntBlocage: dto.mntBlocage ?? 0,
            solde: dto.solde ?? 0,
            devise: "TND",
            statut:
              dto.etatDossier === "V"
                ? "ACTIF"
                : dto.etatDossier === "C"
                  ? "CLOTURE"
                  : dto.etatDossier === "B"
                    ? "SUSPENDU"
                    : "ACTIF",
            declarationFiscale: dto.declarationFiscale,
            numeroCompte: dto.numeroCompte,
            echeance: dto.echeance,
            tel: dto.tel,
            codeActivite: dto.codeActivite,
            numeroBct: dto.numeroBct,
            dateBct: dto.dateBct,
            beneficiaires: (dto as any).beneficiaires || [],
            documents: (dto as any).documents || [],
          };
        });

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
    } catch (error) {
      console.info(
        "ℹ️ Mode démonstration - Consultation Dossiers",
      );
      setDossiers([]);
      setDossiersFiltres([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les détails du dossier
  const fetchDetailsDossier = async (
    dossier: DossierAVAConsultation,
  ) => {
    // Si on a déjà les bénéficiaires et les documents, on les utilise directement
    if (
      dossier.beneficiaires &&
      dossier.beneficiaires.length > 0
    ) {
      setBeneficiaires(dossier.beneficiaires);
      setDocuments(dossier.documents || []);
      setDossierSelectionne(dossier);
      return;
    }

    setLoading(true);

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
        mntAutoriseBct?: number;
        mntReserve?: number;
        mntBlocage?: number;
        beneficiaires?: Beneficiaire[];
        documents?: DocumentJoint[];
      }

      const summary =
        await safeJsonParse<OperationsDelegueeSummaryDTO>(
          response,
        );

      if (!summary) {
        throw new Error("JSON_PARSE_ERROR");
      }

      // Merge data
      const dossierComplet: DossierAVAConsultation = {
        ...dossier,
        mntAutorise:
          summary.mntAutorise !== undefined
            ? summary.mntAutorise
            : dossier.mntAutorise,
        montantAutorise:
          summary.mntAutorise !== undefined
            ? summary.mntAutorise
            : dossier.montantAutorise,
        mntUtilise:
          summary.mntUtilise !== undefined
            ? summary.mntUtilise
            : dossier.mntUtilise,
        montantUtilise:
          summary.mntUtilise !== undefined
            ? summary.mntUtilise
            : dossier.montantUtilise,
        mntAvance:
          summary.mntAvance !== undefined
            ? summary.mntAvance
            : dossier.mntAvance,
        mntAutorisationBct:
          summary.mntAutoriseBct !== undefined
            ? summary.mntAutoriseBct
            : dossier.mntAutorisationBct,
        mntReserve:
          summary.mntReserve !== undefined
            ? summary.mntReserve
            : dossier.mntReserve,
        mntBlocage:
          summary.mntBlocage !== undefined
            ? summary.mntBlocage
            : dossier.mntBlocage,
        solde:
          summary.solde !== undefined
            ? summary.solde
            : dossier.solde !== undefined
              ? dossier.solde
              : 0,
        echeance: summary.echeance || dossier.echeance,
        beneficiaires:
          summary.beneficiaires || dossier.beneficiaires || [],
        documents: summary.documents || dossier.documents || [],
      };

      setBeneficiaires(dossierComplet.beneficiaires || []);
      setDocuments(dossierComplet.documents || []);
      setDossierSelectionne(dossierComplet);
    } catch (error) {
      console.info(
        "ℹ️ Mode démonstration - Détails dossier (fallback)",
      );
      setDossierSelectionne(dossier);
      setBeneficiaires(dossier.beneficiaires || []);
      setDocuments(dossier.documents || []);
    } finally {
      setLoading(false);
    }
  };

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...dossiers];

    // Filtres de colonnes
    Object.entries(filtres).forEach(([key, value]) => {
      if (value && value.trim()) {
        filtered = filtered.filter((d) => {
          const fieldValue = String(
            d[key as keyof DossierAVAConsultation] || "",
          ).toLowerCase();
          return fieldValue.includes(value.toLowerCase());
        });
      }
    });

    // Tri
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        let comparison = 0;
        if (
          typeof aVal === "number" &&
          typeof bVal === "number"
        ) {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc"
          ? comparison
          : -comparison;
      });
    }

    setDossiersFiltres(filtered);
  }, [filtres, sortColumn, sortDirection, dossiers]);

  const handleSort = (column: keyof DossierAVAConsultation) => {
    if (sortColumn === column) {
      setSortDirection(
        sortDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const resetFiltres = () => {
    setFiltres({
      codeTypeDossier: "",
      numeroDossier: "",
      dateDossier: "",
      codeAgence: "",
      noPieceClient: "",
      nomClient: "",
      declarationFiscale: "",
      statut: "",
      numeroCompte: "",
    });
    setSortColumn(null);
    setSortDirection("asc");
  };

  const handleSelectDossier = async (
    dossier: DossierAVAConsultation,
  ) => {
    await fetchDetailsDossier(dossier);
    setEtape("detail");
  };

  // Auto-ouvrir le dossier si un numéro est passé en deep-link depuis le Dashboard
  useEffect(() => {
    if (!initialNumeroDossier || deepLinked.current || dossiers.length === 0) return;
    const found = dossiers.find(d => d.numeroDossier === initialNumeroDossier);
    if (found) {
      deepLinked.current = true;
      handleSelectDossier(found);
    }
  }, [dossiers, initialNumeroDossier]);

  const handleRetourListe = () => {
    setEtape("liste");
    setDossierSelectionne(null);
    setBeneficiaires([]);
    setDocuments([]);
  };

  const SortIcon = ({
    column,
  }: {
    column: keyof DossierAVAConsultation;
  }) => {
    if (sortColumn !== column) {
      return (
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
      );
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 text-[#435B7B]" />
    ) : (
      <ArrowDown className="w-4 h-4 text-[#435B7B]" />
    );
  };

  const StatutBadge = ({ statut }: { statut: string }) => {
    const variants: Record<string, string> = {
      ACTIF:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      SUSPENDU:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      CLOTURE:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return (
      <Badge
        className={
          variants[statut] || "bg-gray-100 text-gray-800"
        }
      >
        {statut}
      </Badge>
    );
  };

  const buildDocumentUrl = (doc: DocumentJoint) => {
    const cleanBase = documentsBasePath.trim().replace(/[\/\\]+$/, "");
    if (!cleanBase || !doc.pathAnnee || !doc.pathMois) return null;
    const safeFile = encodeURIComponent(doc.referenceFichierJoint);
    const isWindowsAbsolutePath = /^[a-zA-Z]:[\\/]/.test(cleanBase);
    const isUnixAbsolutePath = cleanBase.startsWith("/");
    const isLocalFsPath = isWindowsAbsolutePath || isUnixAbsolutePath;

    if (isLocalFsPath) {
      // In Vite dev, local filesystem files must be served through /@fs.
      const normalized = cleanBase.replace(/\\/g, "/");
      return `/@fs/${normalized}/${doc.pathAnnee}/${doc.pathMois}/${safeFile}`;
    }

    return `${cleanBase}/${doc.pathAnnee}/${doc.pathMois}/${safeFile}`;
  };

  if (etape === "liste") {
    return (
      <div className="p-6 max-w-full mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Consultation Dossiers AVA
          </h1>
          <p className="text-muted-foreground mt-1">
            Recherche multicritères et consultation des dossiers
            AVA
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Filtres de recherche</CardTitle>
              <CardDescription>
                Recherchez par n'importe quelle colonne
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFiltres}
            >
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterTypeDossier">
                  Type Dossier
                </Label>
                <Input
                  id="filterTypeDossier"
                  placeholder="Rechercher..."
                  value={filtres.codeTypeDossier}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      codeTypeDossier: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterNumDossier">
                  N° Dossier
                </Label>
                <Input
                  id="filterNumDossier"
                  placeholder="Rechercher..."
                  value={filtres.numeroDossier}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      numeroDossier: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterDateDossier">
                  Date Dossier
                </Label>
                <Input
                  id="filterDateDossier"
                  type="date"
                  value={filtres.dateDossier}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      dateDossier: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterAgence">
                  Code Agence
                </Label>
                <Input
                  id="filterAgence"
                  placeholder="Rechercher..."
                  value={filtres.codeAgence}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      codeAgence: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterPieceClient">
                  N° Pièce Client
                </Label>
                <Input
                  id="filterPieceClient"
                  placeholder="Rechercher..."
                  value={filtres.noPieceClient}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      noPieceClient: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterNomClient">
                  Nom Client
                </Label>
                <Input
                  id="filterNomClient"
                  placeholder="Rechercher..."
                  value={filtres.nomClient}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      nomClient: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterDeclaration">
                  Déclaration Fiscale
                </Label>
                <Input
                  id="filterDeclaration"
                  placeholder="Rechercher..."
                  value={filtres.declarationFiscale}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      declarationFiscale: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterEtat">État Dossier</Label>
                <Select
                  value={filtres.statut}
                  onValueChange={(value) =>
                    setFiltres({ ...filtres, statut: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Tous</SelectItem>
                    <SelectItem value="ACTIF">ACTIF</SelectItem>
                    <SelectItem value="SUSPENDU">
                      SUSPENDU
                    </SelectItem>
                    <SelectItem value="CLOTURE">
                      CLOTURE
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterCompte">N° Compte</Label>
                <Input
                  id="filterCompte"
                  placeholder="Rechercher..."
                  value={filtres.numeroCompte}
                  onChange={(e) =>
                    setFiltres({
                      ...filtres,
                      numeroCompte: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Résultats ({dossiersFiltres.length} dossier
              {dossiersFiltres.length > 1 ? "s" : ""})
            </CardTitle>
            <CardDescription>
              Cliquez sur une ligne pour voir les détails
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
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          handleSort("codeTypeDossier")
                        }
                      >
                        <div className="flex items-center gap-2">
                          Type
                          <SortIcon column="codeTypeDossier" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          handleSort("numeroDossier")
                        }
                      >
                        <div className="flex items-center gap-2">
                          N° Dossier
                          <SortIcon column="numeroDossier" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          handleSort("dateDossier")
                        }
                      >
                        <div className="flex items-center gap-2">
                          Date
                          <SortIcon column="dateDossier" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("codeAgence")}
                      >
                        <div className="flex items-center gap-2">
                          Agence
                          <SortIcon column="codeAgence" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          handleSort("noPieceClient")
                        }
                      >
                        <div className="flex items-center gap-2">
                          N° Pièce
                          <SortIcon column="noPieceClient" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("nomClient")}
                      >
                        <div className="flex items-center gap-2">
                          Client
                          <SortIcon column="nomClient" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("solde")}
                      >
                        <div className="flex items-center gap-2">
                          Solde
                          <SortIcon column="solde" />
                        </div>
                      </th>
                      <th
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("statut")}
                      >
                        <div className="flex items-center gap-2">
                          État
                          <SortIcon column="statut" />
                        </div>
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
                        className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() =>
                          handleSelectDossier(dossier)
                        }
                      >
                        <td className="p-3">
                          <Badge variant="outline">
                            {dossier.codeTypeDossier}
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
                          {dossier.libelleAgence}
                        </td>
                        <td className="p-3 text-sm">
                          {dossier.noPieceClient}
                        </td>
                        <td className="p-3 text-sm">
                          {[dossier.prenomClient, dossier.nomClient]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-semibold ${(dossier.solde ?? 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                          >
                            {(
                              dossier.solde ?? 0
                            ).toLocaleString("fr-FR", {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}{" "}
                            TND
                          </span>
                        </td>
                        <td className="p-3">
                          <StatutBadge
                            statut={dossier.statut}
                          />
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
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
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleRetourListe}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Détail du Dossier
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {dossierSelectionne?.numeroDossier}
            </Badge>
            <span>•</span>
            <span className="font-semibold">
              {[
                dossierSelectionne?.prenomClient,
                dossierSelectionne?.nomClient,
              ]
                .filter(Boolean)
                .join(" ") || "-"}
            </span>
            <span className="text-xs opacity-70">
              ({dossierSelectionne?.noPieceClient})
            </span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="informations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="informations">
            <FileText className="w-4 h-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="beneficiaires">
            <Users className="w-4 h-4 mr-2" />
            Bénéficiaires
          </TabsTrigger>
          {dossierSelectionne?.codeTypeDossier === 2 && (
            <TabsTrigger value="marche">
              <Building2 className="w-4 h-4 mr-2" />
              Marché
            </TabsTrigger>
          )}
          <TabsTrigger value="documents">
            <Paperclip className="w-4 h-4 mr-2" />
            Documents ({documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="informations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations du dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Informations générales
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      Matricule Fiscal
                    </p>
                    <p className="font-medium font-mono">
                      {dossierSelectionne?.noPieceClient || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Nom Client
                    </p>
                    <p className="font-medium">
                      {[
                        dossierSelectionne?.prenomClient,
                        dossierSelectionne?.nomClient,
                      ]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Type de dossier
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.libelleTypeDossier} (
                      {dossierSelectionne?.codeTypeDossier})
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Numéro de dossier
                    </p>
                    <p className="font-medium font-mono">
                      {dossierSelectionne?.numeroDossier}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Date de dossier
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
                      Code Agence
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.codeAgence}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Libellé Agence
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.libelleAgence}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      État du dossier
                    </p>
                    <StatutBadge
                      statut={
                        dossierSelectionne?.statut || "ACTIF"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Compléments Client
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      Déclaration Fiscale
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.declarationFiscale ===
                      "O"
                        ? "Oui (O)"
                        : dossierSelectionne?.declarationFiscale ===
                            "N"
                          ? "Non (N)"
                          : dossierSelectionne?.declarationFiscale ||
                            "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Téléphone
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.tel || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      N° Compte RIB
                    </p>
                    <p className="font-medium text-sm tracking-normal break-all">
                      {dossierSelectionne?.numeroCompte || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Code Activité
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.codeActivite || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Échéance Dossier
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.echeance
                        ? new Date(
                            dossierSelectionne.echeance,
                          ).toLocaleDateString("fr-FR")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Autorisation BCT
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      Numéro BCT
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.numeroBct || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Date BCT
                    </p>
                    <p className="font-medium">
                      {dossierSelectionne?.dateBct
                        ? new Date(
                            dossierSelectionne.dateBct,
                          ).toLocaleDateString("fr-FR")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      Montant Autorisé BCT
                    </p>
                    <p className="font-medium">
                      {(
                        dossierSelectionne?.mntAutorisationBct ||
                        0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  Situation financière
                </h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200">
                    <p className="text-muted-foreground">
                      Montant autorisé
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      {(
                        dossierSelectionne?.mntAutorise || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200">
                    <p className="text-muted-foreground">
                      Montant avance
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      {(
                        dossierSelectionne?.mntAvance || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200">
                    <p className="text-muted-foreground">
                      Montant autorisé BCT
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      {(
                        dossierSelectionne?.mntAutorisationBct || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200">
                    <p className="text-muted-foreground">
                      Montant utilisé
                    </p>
                    <p className="text-lg font-bold text-purple-700">
                      {(
                        dossierSelectionne?.mntUtilise || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200">
                    <p className="text-muted-foreground">
                      Montant réservé
                    </p>
                    <p className="text-lg font-bold text-purple-700">
                      {(
                        dossierSelectionne?.mntReserve || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200">
                    <p className="text-muted-foreground">
                      Montant blocage
                    </p>
                    <p className="text-lg font-bold text-purple-700">
                      {(
                        dossierSelectionne?.mntBlocage || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-lg border ${(dossierSelectionne?.solde || 0) >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}
                  >
                    <p className="text-muted-foreground">
                      Solde disponible
                    </p>
                    <p
                      className={`text-lg font-bold ${(dossierSelectionne?.solde || 0) >= 0 ? "text-blue-700" : "text-red-700"}`}
                    >
                      {(
                        dossierSelectionne?.solde || 0
                      ).toLocaleString("fr-FR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiaires">
          <Card>
            <CardHeader>
              <CardTitle>Liste des bénéficiaires</CardTitle>
            </CardHeader>
            <CardContent>
              {beneficiaires.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Aucun bénéficiaire enregistré
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">
                          Nom
                        </th>
                        <th className="text-left p-3 font-semibold">
                          N° Pièce
                        </th>
                        <th className="text-left p-3 font-semibold">
                          Qualité
                        </th>
                        <th className="text-left p-3 font-semibold">
                          Adresse
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaires.map((benef, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3 font-medium">
                            {benef.nomBenef}
                          </td>
                          <td className="p-3 text-sm">
                            <Badge
                              variant="outline"
                              className="mr-2"
                            >
                              {benef.typePieceBenef}
                            </Badge>
                            {benef.noPieceBenef}
                          </td>
                          <td className="p-3 text-sm">
                            {benef.qualite}
                          </td>
                          <td className="p-3 text-sm">
                            {benef.adresseBenef}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marche">
          <Card>
            <CardHeader>
              <CardTitle>Détails du marché</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground italic">
                Informations non disponibles pour ce dossier
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>
                Documents numérisés ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Paperclip className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground italic">
                    Aucun document joint à ce dossier
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center p-4 border rounded-xl hover:bg-muted/50 transition-all group"
                    >
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          title={doc.referenceFichierJoint}
                        >
                          {doc.referenceFichierJoint}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.extention?.toUpperCase() ?? '—'} • Type{" "}
                          {doc.typeDocument}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {doc.pathAnnee && doc.pathMois
                            ? `${doc.pathAnnee}/${doc.pathMois}`
                            : "Chemin non renseigné"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {new Date(
                            doc.dateOperation,
                          ).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {buildDocumentUrl(doc) ? (
                          <>
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              title="Prévisualiser"
                            >
                              <a
                                href={buildDocumentUrl(doc) || "#"}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              title="Télécharger"
                            >
                              <a
                                href={buildDocumentUrl(doc) || "#"}
                                target="_blank"
                                rel="noreferrer"
                                download
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Chemin document indisponible"
                            disabled
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {documentsBasePath ? (
                <p className="text-xs text-muted-foreground mt-4">
                  Base documents: {documentsBasePath}
                </p>
              ) : (
                <p className="text-xs text-orange-600 mt-4">
                  Définissez `VITE_DOCUMENTS_BASE_PATH` dans votre `.env` pour activer l'ouverture des fichiers.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}