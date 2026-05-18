import jsPDF from 'jspdf';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  FileBarChart,
  FileCheck,
  FileLock,
  FileText,
  Filter,
  Search,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';

interface Beneficiaire {
  adresseBenef: string;
  codeAgenceAva: number;
  codeTypeDos: number;
  dateCreation: string;
  dateDossier: string | null;
  datePiece: string;
  dateSuppression: string | null;
  etat: string;
  noPieceBenef: string | null;
  nomBenef: string;
  numDossier: number | null;
  qualite: string;
  typePieceBenef: number | null;
}

interface Document {
  codeOperation: number;
  codeProduitService: number;
  dateDossier: string;
  dateOperation: string;
  extention: string;
  numDossier: number;
  numLigne: number;
  pathAnnee: string;
  pathMois: string;
  refOperation: number;
  referenceFichierJoint: string;
  typeDocument: number;
}

interface DossierAVA {
  numDossier: number;
  typeDossierAva: number;
  dateDossier: string;
  codeAgence: number;
  typePieceClient: number;
  noPieceClient: string;
  numeroCompte: string;
  tel?: string;
  codeActivite?: number;
  declarationFiscale: string;
  codeBanqueProvenance?: number;
  mntAvance: number;
  mntUtilise: number;
  mntAutorise: number;
  mntAutoriseBct: number;
  mntReserve: number;
  mntBlocage: number;
  solde: number;
  mntCa?: number;
  mntCaFiscal?: number;
  mntImportation?: number;
  numeroBct?: number;
  dateBct?: string;
  echeance: string;
  annee?: number;
  dernierNumMvtAva: number;
  etatDossier: string;
  codeEtat?: number;
  dateEtat: string;
  beneficiaires?: Beneficiaire[];
  documents?: Document[];
  // Champs calculés pour l'affichage
  CODE_TYPE_DOS_AVA?: number;
  LIBELLE_TYPE_DOSSIER?: string;
  NUM_DOSSIER?: string;
  DATE_DOSSIER?: string;
  CODE_AGENCE_AVA?: number;
  LIBELLE_AGENCE?: string;
  NO_PIECE_CLIENT?: string;
  nom_client?: string;
  prenom_client?: string;
  DECLARATION_FISCALE?: string;
  SOLDE?: number;
  ETAT_DOSSIER?: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  NUMERO_COMPTE?: string;
  montantAutorise?: number;
  montantUtilise?: number;
  montantReserve?: number;
  devise?: string;
}

type SortColumn = keyof DossierAVA | null;
type SortDirection = 'asc' | 'desc';

export function AVAGenerationDossier() {
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  // États de tri
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // États de filtres
  const [filtres, setFiltres] = useState({
    CODE_TYPE_DOS_AVA: '',
    NUM_DOSSIER: '',
    DATE_DOSSIER: '',
    CODE_AGENCE_AVA: '',
    NO_PIECE_CLIENT: '',
    nom_client: '',
    DECLARATION_FISCALE: '',
    ETAT_DOSSIER: '',
    NUMERO_COMPTE: ''
  });

  // Charger les dossiers au montage
  useEffect(() => {
    fetchDossiers();
  }, []);

  // Charger les dossiers
  const fetchDossiers = async () => {
    setLoading(true);

    // Labels pour les types de dossiers
    const typeDossierLabels: Record<number, string> = {
      1: 'EXPORTATEUR',
      2: 'MARCHE REALISABLE A L\'ETRANGER',
      3: 'AUTRES ACTIVITES (ANNEXE N.2)',
      4: 'IMPORTATEUR',
      5: 'INVESTISSEMENT A L\'ETRANGER',
    };

    // Labels pour les agences
    const agenceLabels: Record<number, string> = {
      9: 'Agence 9',
      17: 'Agence Principale',
      100: 'Agence Tunis Centre',
      200: 'Agence Sfax',
      300: 'Agence Sousse',
      150: 'Agence Bizerte',
    };

    // Mapping des états de dossier
    const etatDossierMapping: Record<string, 'ACTIF' | 'SUSPENDU' | 'CLOTURE'> = {
      'V': 'ACTIF',
      'B': 'SUSPENDU',
      'C': 'CLOTURE'
    };

    try {
      const response = await authenticatedFetch('/api/operations-deleguees');

      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      const data = await safeJsonParse<any[]>(response);

      if (!data || !Array.isArray(data)) {
        throw new Error('JSON_PARSE_ERROR');
      }

      // Mapper les données de l'API vers le format DossierAVA
      const dossiersTransformes: DossierAVA[] = data.map((dto) => {
        // Extraire le nom du client depuis le premier bénéficiaire
        let nomClient = dto.noPieceClient;
        if (dto.beneficiaires && dto.beneficiaires.length > 0) {
          const premierBenef = dto.beneficiaires[0];
          nomClient = premierBenef.nomBenef || dto.noPieceClient;
        }

        const etatDisplay = etatDossierMapping[dto.etatDossier] || 'ACTIF';

        return {
          ...dto,
          // Champs calculés pour l'affichage
          CODE_TYPE_DOS_AVA: dto.typeDossierAva,
          LIBELLE_TYPE_DOSSIER: typeDossierLabels[dto.typeDossierAva] || `Type ${dto.typeDossierAva}`,
          NUM_DOSSIER: `AVA-${dto.numDossier}`,
          DATE_DOSSIER: dto.dateDossier,
          CODE_AGENCE_AVA: dto.codeAgence,
          LIBELLE_AGENCE: agenceLabels[dto.codeAgence] || `Agence ${dto.codeAgence}`,
          NO_PIECE_CLIENT: dto.noPieceClient,
          nom_client: nomClient,
          DECLARATION_FISCALE: dto.declarationFiscale,
          SOLDE: dto.solde || 0,
          ETAT_DOSSIER: etatDisplay,
          NUMERO_COMPTE: dto.numeroCompte || '',
          montantAutorise: dto.mntAutorise || 0,
          montantUtilise: dto.mntUtilise || 0,
          montantReserve: dto.mntReserve || 0,
          devise: 'TND'
        };
      });

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);

      console.log('✅ Dossiers AVA chargés avec succès (' + dossiersTransformes.length + ' dossiers)');
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des dossiers:', error);
      toast.error('Impossible de charger les dossiers', {
        description: 'Veuillez vérifier votre connexion et réessayer',
      });
      setDossiers([]);
      setDossiersFiltres([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de tri
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Appliquer le tri
  useEffect(() => {
    if (sortColumn) {
      const sorted = [...dossiersFiltres].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        
        return sortDirection === 'asc' 
          ? (aVal > bVal ? 1 : -1) 
          : (bVal > aVal ? 1 : -1);
      });
      setDossiersFiltres(sorted);
    }
  }, [sortColumn, sortDirection]);

  // Appliquer les filtres
  const appliquerFiltres = () => {
    let filteredDossiers = [...dossiers];

    Object.keys(filtres).forEach((key) => {
      const filterValue = filtres[key as keyof typeof filtres];
      if (filterValue) {
        filteredDossiers = filteredDossiers.filter((dossier) => {
          const dossierValue = dossier[key as keyof DossierAVA];
          if (dossierValue === undefined || dossierValue === null) return false;
          return String(dossierValue).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    setDossiersFiltres(filteredDossiers);
  };

  // Réinitialiser les filtres
  const reinitialiserFiltres = () => {
    setFiltres({
      CODE_TYPE_DOS_AVA: '',
      NUM_DOSSIER: '',
      DATE_DOSSIER: '',
      CODE_AGENCE_AVA: '',
      NO_PIECE_CLIENT: '',
      nom_client: '',
      DECLARATION_FISCALE: '',
      ETAT_DOSSIER: '',
      NUMERO_COMPTE: ''
    });
    setDossiersFiltres(dossiers);
  };

  // Générer l'attestation d'ouverture
  const genererAttestationOuverture = async (dossier: DossierAVA) => {
    setGeneratingPdf(dossier.NUM_DOSSIER || null);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      let yPosition = 25;

      // Date en haut à droite
      const dateFormatee = new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const dateText = 'Tunis, le ' + dateFormatee;
      const dateTextWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateTextWidth, yPosition);
      yPosition += 12;

      // Titre principal
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const titre1 = 'ATTESTATION D\'OUVERTURE DE DOSSIER';
      const titre1Width = doc.getTextWidth(titre1);
      doc.text(titre1, (pageWidth - titre1Width) / 2, yPosition);
      yPosition += 6;
      const titre2 = 'ALLOCATION POUR VOYAGES D\'AFFAIRES (AVA)';
      const titre2Width = doc.getTextWidth(titre2);
      doc.text(titre2, (pageWidth - titre2Width) / 2, yPosition);
      yPosition += 10;

      // Section titulaire
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.text('Titulaire : ', margin, yPosition);
      doc.setFont('times', 'normal');
      const cinText = 'CIN/' + dossier.NO_PIECE_CLIENT;
      doc.text(cinText, margin + 22, yPosition);
      yPosition += 5;

      doc.setFont('times', 'bold');
      doc.text('Activite : ', margin, yPosition);
      doc.setFont('times', 'normal');
      const activiteText = dossier.LIBELLE_TYPE_DOSSIER || '';
      doc.text(activiteText, margin + 22, yPosition);
      yPosition += 10;

      // Corps du texte
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text('Il est expressement atteste qu\'un dossier AVA a ete ouvert', margin, yPosition);
      yPosition += 5;
      doc.text('au nom du titulaire susmentionne.', margin, yPosition);
      yPosition += 8;

      // Références
      const references = [
        { label: 'Code type dossier AVA', value: String(dossier.CODE_TYPE_DOS_AVA) },
        { label: 'Numero du dossier', value: dossier.NUM_DOSSIER || '' },
        { label: 'Date d\'ouverture', value: dossier.DATE_DOSSIER }
      ];

      for (let i = 0; i < references.length; i++) {
        const ref = references[i];
        doc.setFont('times', 'bold');
        const labelText = ref.label + ' : ';
        doc.text(labelText, margin + 5, yPosition);
        doc.setFont('times', 'normal');
        doc.text(ref.value || '', margin + 55, yPosition);
        yPosition += 5;
      }
      yPosition += 5;

      // Montants
      const montants = [
        { label: 'Montant autorise', value: String((dossier.montantAutorise || 0).toFixed(3)) + ' TND' },
        { label: 'Montant utilise', value: String((dossier.montantUtilise || 0).toFixed(3)) + ' TND' }
      ];

      for (let i = 0; i < montants.length; i++) {
        const mt = montants[i];
        doc.setFont('times', 'bold');
        const mtLabel = mt.label + ' : ';
        doc.text(mtLabel, margin + 5, yPosition);
        doc.setFont('times', 'normal');
        doc.text(mt.value, margin + 65, yPosition);
        yPosition += 5;
      }

      // Solde disponible
      doc.setFont('times', 'bold');
      doc.text('Solde disponible : ', margin + 5, yPosition);
      doc.setFont('times', 'normal');
      const soldeText = String((dossier.SOLDE || 0).toFixed(3)) + ' TND';
      doc.text(soldeText, margin + 65, yPosition);
      yPosition += 10;

      // Paragraphe final
      doc.setFont('times', 'normal');
      doc.text('La presente attestation est delivree au titulaire', margin, yPosition);
      yPosition += 5;
      doc.text('pour servir et valoir ce que de droit.', margin, yPosition);
      yPosition += 10;

      // Signature
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.text('Cachet et signature de l\'Intermediaire Agree', pageWidth - margin - 60, pageHeight - margin - 10);

      // Télécharger le PDF
      const fileName = 'Attestation_Ouverture_' + (dossier.NUM_DOSSIER || '').replace(/\//g, '_') + '.pdf';
      doc.save(fileName);

      toast.success('Attestation d\'ouverture generee', {
        description: 'Le document a ete telecharge avec succes',
      });

      setTimeout(() => {
        setGeneratingPdf(null);
      }, 500);

    } catch (error) {
      console.error('Erreur lors de la generation du PDF:', error);
      toast.error('Erreur lors de la generation du PDF: ' + String(error));
      setGeneratingPdf(null);
    }
  };

  // Générer l'attestation de solde
  const genererAttestationSolde = async (dossier: DossierAVA) => {
    setGeneratingPdf(dossier.NUM_DOSSIER || null);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = 25;

      // Date en haut à droite
      const dateFormatee = new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const dateTextSolde = `Tunis, le ${dateFormatee}`;
      const dateTextSoldeWidth = doc.getTextWidth(dateTextSolde);
      doc.text(dateTextSolde, pageWidth - margin - dateTextSoldeWidth, yPosition);
      yPosition += 12;

      // Titre principal
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const titreSolde1 = 'ATTESTATION DE SOLDE';
      const titreSolde1Width = doc.getTextWidth(titreSolde1);
      doc.text(titreSolde1, (pageWidth - titreSolde1Width) / 2, yPosition);
      yPosition += 6;
      const titreSolde2 = 'DOSSIER ALLOCATION POUR VOYAGES D\'AFFAIRES (AVA)';
      const titreSolde2Width = doc.getTextWidth(titreSolde2);
      doc.text(titreSolde2, (pageWidth - titreSolde2Width) / 2, yPosition);
      yPosition += 8;

      // Sous-titre
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      const circulaireText = '(Conformément à la réglementation des changes en vigueur et à la Circulaire BCT n°2020-03 du 04 février 2020)';
      const circulaireTextSoldeWidth = doc.getTextWidth(circulaireText);
      doc.text(circulaireText, (pageWidth - circulaireTextSoldeWidth) / 2, yPosition);
      yPosition += 10;

      // Paragraphe d'introduction
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const intro = 'Il est certifié par la présente que :';
      doc.text(intro, margin, yPosition);
      yPosition += 6;

      // Section titulaire
      doc.setFont('times', 'bold');
      doc.text('Titulaire : ', margin, yPosition);
      doc.setFont('times', 'normal');
      doc.text(`CIN/${dossier.NO_PIECE_CLIENT}`, margin + 22, yPosition);
      yPosition += 5;

      doc.setFont('times', 'bold');
      doc.text('Activité : ', margin, yPosition);
      doc.setFont('times', 'normal');
      doc.text(dossier.LIBELLE_TYPE_DOSSIER || '', margin + 22, yPosition);
      yPosition += 8;

      // Paragraphe "est titulaire"
      const paragraphe1 = 'est titulaire d\'un dossier d\'Allocation pour Voyages d\'Affaires (AVA) ouvert auprès de notre établissement sous les références suivantes :';
      const lines1 = doc.splitTextToSize(paragraphe1, contentWidth);
      doc.text(lines1, margin, yPosition);
      yPosition += (lines1.length * 4.5) + 3;

      // Puces - Références
      const references = [
        { label: 'Code type dossier AVA', value: String(dossier.CODE_TYPE_DOS_AVA) },
        { label: 'Numéro du dossier', value: dossier.NUM_DOSSIER || '' },
        { label: 'Date d\'ouverture', value: dossier.DATE_DOSSIER }
      ];

      for (let i = 0; i < references.length; i++) {
        const ref = references[i];
        doc.text('•', margin + 5, yPosition);
        doc.setFont('times', 'bold');
        doc.text(`${ref.label} : `, margin + 10, yPosition);
        doc.setFont('times', 'normal');
        doc.text(ref.value || '', margin + 55, yPosition);
        yPosition += 5;
      }
      yPosition += 4;

      // Paragraphe "Après vérification"
      const paragraphe2 = 'Après vérification dans nos systèmes et arrêt des opérations à la génération de la présente attestation, la situation du dossier AVA se présente comme suit :';
      const lines2 = doc.splitTextToSize(paragraphe2, contentWidth);
      doc.text(lines2, margin, yPosition);
      yPosition += (lines2.length * 4.5) + 3;

      // Puces - Montants
      const montantAutorisationBCT = 0; // Valeur par défaut
      const montants = [
        { label: 'Montant autorisé', value: `${(dossier.montantAutorise || 0).toFixed(3)} TND` },
        { label: 'Montant d\'autorisation spécifique BCT', value: `${montantAutorisationBCT.toFixed(3)} TND` },
        { label: 'Montant avancé', value: `${(dossier.montantReserve || 0).toFixed(3)} TND` },
        { label: 'Montant utilisé', value: `${(dossier.montantUtilise || 0).toFixed(3)} TND` },
        { label: 'Montant réservé', value: `${(dossier.montantReserve || 0).toFixed(3)} TND` }
      ];

      for (let i = 0; i < montants.length; i++) {
        const mt = montants[i];
        doc.text('•', margin + 5, yPosition);
        doc.setFont('times', 'bold');
        doc.text(`${mt.label} : `, margin + 10, yPosition);
        doc.setFont('times', 'normal');
        doc.text(mt.value, margin + 85, yPosition);
        yPosition += 5;
      }

      // Solde disponible (en plus grand ou mis en évidence)
      doc.text('•', margin + 5, yPosition);
      doc.setFont('times', 'bold');
      doc.text('Solde disponible : ', margin + 10, yPosition);
      doc.setFont('times', 'bold');
      doc.text(`${(dossier.SOLDE || 0).toFixed(3)} TND`, margin + 85, yPosition);
      yPosition += 8;

      // Paragraphe explicatif sur le solde
      doc.setFont('times', 'normal');
      const paragraphe3 = 'Le solde disponible correspond au montant mobilisable par le titulaire dans la limite des plafonds réglementaires en vigueur et sous réserve du respect des conditions prévues par la réglementation des changes.';
      const lines3 = doc.splitTextToSize(paragraphe3, contentWidth);
      doc.text(lines3, margin, yPosition);
      yPosition += (lines3.length * 4.5) + 7;

      // Paragraphe final
      const paragraphe4 = 'La présente attestation est délivrée au titulaire pour servir et valoir ce que de droit.';
      doc.text(paragraphe4, margin, yPosition);
      yPosition += 6;

      const paragraphe5 = 'Elle est établie sur la base des données enregistrées dans les systèmes de l\'Intermédiaire Agréé à la date de son émission et ne saurait engager la responsabilité de l\'établissement au-delà des obligations résultant de la réglementation applicable.';
      const lines5 = doc.splitTextToSize(paragraphe5, contentWidth);
      doc.text(lines5, margin, yPosition);
      yPosition += (lines5.length * 4.5) + 3;

      const paragraphe6 = 'Toute altération, falsification ou utilisation en dehors de son objet rendrait la présente attestation nulle et non avenue.';
      const lines6 = doc.splitTextToSize(paragraphe6, contentWidth);
      doc.text(lines6, margin, yPosition);
      yPosition += (lines6.length * 4.5) + 8;

      // QR Code
      const qrData = JSON.stringify({
        type: 'ATTESTATION_SOLDE',
        numDossier: dossier.NUM_DOSSIER,
        dateOuverture: dossier.DATE_DOSSIER,
        titulaire: dossier.NO_PIECE_CLIENT || '',
        montantAutorise: dossier.montantAutorise || 0,
        montantUtilise: dossier.montantUtilise || 0,
        solde: dossier.SOLDE || 0,
        dateGeneration: new Date().toISOString()
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, { 
        width: 200,
        margin: 1
      });

      // Positionner le QR code en bas à droite avec plus de place
      const qrSize = 40;
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - qrSize, pageHeight - margin - qrSize - 15, qrSize, qrSize);

      // Signature et cachet
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.text('Cachet et signature de l\'Intermédiaire Agréé', pageWidth - margin - 60, pageHeight - margin - 5);

      // Télécharger le PDF
      const fileName = `Attestation_Solde_${(dossier.NUM_DOSSIER || '').replace(/\//g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('Attestation de solde générée', {
        description: `Le document a été téléchargé avec succès`,
      });

      setTimeout(() => {
        setGeneratingPdf(null);
      }, 500);

    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
      setGeneratingPdf(null);
    }
  };

  // Générer l'attestation de clôture
  const genererAttestationCloture = () => {
    toast.info('Attestation de clôture', {
      description: 'Cette fonctionnalité sera bientôt disponible',
    });
  };

  // Générer le décompte mouvements
  const genererDecompteMouvements = async (dossier: DossierAVA) => {
    setGeneratingPdf(dossier.NUM_DOSSIER || null);

    try {
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = 12;

      // Couleurs modernes
      const primaryColorR = 67;
      const primaryColorG = 91;
      const primaryColorB = 123;
      const lightBlueR = 214;
      const lightBlueG = 228;
      const lightBlueB = 240;
      const darkNavyR = 45;
      const darkNavyG = 62;
      const darkNavyB = 84;

      // Bandeau supérieur
      doc.setFillColor(primaryColorR, primaryColorG, primaryColorB);
      doc.rect(0, 0, pageWidth, 8, 'F');

      // En-tête principal - Partie supérieure du bandeau
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      const titre1 = 'ANNEXE N 5 - CIRCULAIRE AUX INTERMEDIAIRES AGREES N 2016-08 DU 30 DECEMBRE 2016';
      const titre1X = pageWidth / 2 - (doc.getTextWidth(titre1) / 2);
      doc.text(titre1, titre1X, 5);

      // Reset couleur texte
      doc.setTextColor(0, 0, 0);
      yPosition = 13;

      // Titre principal avec encadré moderne
      doc.setFillColor(lightBlueR, lightBlueG, lightBlueB);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 10, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkNavyR, darkNavyG, darkNavyB);
      const titre2 = 'DECOMPTE ANNUEL ALLOCATION POUR VOYAGES D\'AFFAIRES (AVA)';
      const titre2X = pageWidth / 2 - (doc.getTextWidth(titre2) / 2);
      doc.text(titre2, titre2X, yPosition + 6.5);
      
      yPosition += 14;

      // Section informations avec design moderne (2 colonnes)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);

      // Boîte gauche
      const boxWidth = (pageWidth - (margin * 2) - 4) / 2;
      doc.setDrawColor(primaryColorR, primaryColorG, primaryColorB);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, boxWidth, 22, 'S');

      // Boîte droite
      doc.rect(margin + boxWidth + 4, yPosition, boxWidth, 22, 'S');

      // Colonne gauche - avec espacement amélioré
      const col1X = margin + 3;
      let col1Y = yPosition + 4;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Intermédiaire Agréé :', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text('___________________________', col1X + 35, col1Y);
      col1Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Agence :', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text('____________________ Code : __________', col1X + 15, col1Y);
      col1Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Type d\'allocation :', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text('___ / ___ (1)', col1X + 32, col1Y);
      col1Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Année de fonctionnement :', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text('du __ /__ /____ au __ /__ /____', col1X + 45, col1Y);
      col1Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('CA hors taxes (3) :', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text('_____________________', col1X + 32, col1Y);

      // Colonne droite - avec espacement amélioré
      const col2X = margin + boxWidth + 4 + 3;
      let col2Y = yPosition + 4;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Code :', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text('___________________', col2X + 12, col2Y);
      col2Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Titulaire :', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text('_______________________________', col2X + 18, col2Y);
      col2Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Nom/Denomination :', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text('_____________________', col2X + 35, col2Y);
      col2Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Code identification (2) :', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text('__________________', col2X + 38, col2Y);
      col2Y += 4.5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('N demande F2 :', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text('______________________', col2X + 28, col2Y);

      yPosition = yPosition + 24;

      // Tableau simplifié des mouvements
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('TABLEAU DES MOUVEMENTS', margin, yPosition);
      yPosition += 5;

      const tableStartY = yPosition;
      const rowHeight = 8;
      
      // En-tête du tableau
      doc.setFillColor(primaryColorR, primaryColorG, primaryColorB);
      doc.rect(margin, tableStartY, pageWidth - (margin * 2), rowHeight, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      
      let colX = margin + 2;
      doc.text('Date', colX, tableStartY + 5);
      colX += 20;
      doc.text('Nature', colX, tableStartY + 5);
      colX += 45;
      doc.text('Devise', colX, tableStartY + 5);
      colX += 30;
      doc.text('Montant TND', colX, tableStartY + 5);
      colX += 30;
      doc.text('Reference', colX, tableStartY + 5);
      colX += 35;
      doc.text('Observations', colX, tableStartY + 5);

      yPosition = tableStartY + rowHeight;

      // Lignes de données
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      // Ligne 1
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');

      colX = margin + 2;
      doc.text('15/01/2024', colX, yPosition + 5);
      colX += 20;
      doc.text('Ouverture', colX, yPosition + 5);
      colX += 45;
      doc.text('-', colX, yPosition + 5);
      colX += 30;
      doc.text(String((dossier.montantAutorise || 0).toFixed(3)), colX, yPosition + 5);
      colX += 30;
      doc.text(dossier.NUM_DOSSIER || '', colX, yPosition + 5);
      colX += 35;
      doc.text('Allocation initiale', colX, yPosition + 5);

      yPosition += rowHeight;

      // Ligne 2
      doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');

      colX = margin + 2;
      doc.text('20/02/2024', colX, yPosition + 5);
      colX += 20;
      doc.text('Achat devises', colX, yPosition + 5);
      colX += 45;
      doc.text('1,000.000 EUR', colX, yPosition + 5);
      colX += 30;
      doc.text(String(((dossier.montantUtilise || 0) / 2).toFixed(3)), colX, yPosition + 5);
      colX += 30;
      doc.text('OP-2024-001', colX, yPosition + 5);
      colX += 35;
      doc.text('Voyage Paris', colX, yPosition + 5);

      yPosition += rowHeight;

      // Ligne 3
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'F');
      doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, 'S');

      colX = margin + 2;
      doc.text('15/03/2024', colX, yPosition + 5);
      colX += 20;
      doc.text('Achat devises', colX, yPosition + 5);
      colX += 45;
      doc.text('800.000 USD', colX, yPosition + 5);
      colX += 30;
      doc.text(String(((dossier.montantUtilise || 0) / 2).toFixed(3)), colX, yPosition + 5);
      colX += 30;
      doc.text('OP-2024-002', colX, yPosition + 5);
      colX += 35;
      doc.text('Voyage New York', colX, yPosition + 5);

      yPosition += rowHeight + 5;

      // Section signature avec encadré moderne
      yPosition = yPosition + 24;
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      const signatureText = 'Date, signature et cachet de l\'intermédiaire agréé';
      const signatureTextWidth = doc.getTextWidth(signatureText);
      doc.text(signatureText, pageWidth - margin - signatureTextWidth, yPosition);

      // Footer avec informations
      doc.setFillColor(lightBlueR, lightBlueG, lightBlueB);
      doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(darkNavyR, darkNavyG, darkNavyB);
      const footerText = `Document généré le ${new Date().toLocaleDateString('fr-FR')} - Dossier ${dossier.NUM_DOSSIER}`;
      const footerTextWidth = doc.getTextWidth(footerText);
      const footerTextX = (pageWidth - footerTextWidth) / 2;
      doc.text(footerText, footerTextX, pageHeight - 4);

      // Télécharger le PDF
      const fileName = `Decompte_Mouvements_${(dossier.NUM_DOSSIER || '').replace(/\//g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('Décompte mouvements généré', {
        description: `Le document a été téléchargé avec succès`,
      });

      setTimeout(() => {
        setGeneratingPdf(null);
      }, 500);

    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
      setGeneratingPdf(null);
    }
  };

  // Gérer la sélection du type de document
  const handleDocumentSelection = (dossier: DossierAVA, typeDocument: string) => {
    switch (typeDocument) {
      case 'attestation-ouverture':
        genererAttestationOuverture(dossier);
        break;
      case 'attestation-solde':
        genererAttestationSolde(dossier);
        break;
      case 'attestation-cloture':
        genererAttestationCloture();
        break;
      case 'decompte-mouvements':
        genererDecompteMouvements(dossier);
        break;
      default:
        break;
    }
  };

  // Icône de tri
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Badge de statut
  const getBadgeStatut = (etat: string) => {
    switch (etat) {
      case 'ACTIF':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Actif</Badge>;
      case 'SUSPENDU':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Suspendu</Badge>;
      case 'CLOTURE':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Clôturé</Badge>;
      default:
        return <Badge variant="outline">{etat}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Génération dossier</h1>
          <p className="text-muted-foreground mt-2">
            Générer des documents PDF pour les dossiers AVA
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          <FileText className="w-4 h-4 mr-2" />
          {dossiersFiltres.length} dossier{dossiersFiltres.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Card d'information */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900">
                Génération de documents PDF
              </p>
              <p className="text-sm text-blue-700">
                Sélectionnez un dossier dans la liste pour générer un document PDF complet contenant toutes les informations du dossier.
                Le document sera automatiquement téléchargé sur votre appareil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtres de recherche
              </CardTitle>
              <CardDescription>
                Filtrez les dossiers pour affiner votre recherche
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={reinitialiserFiltres}
            >
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">N° Dossier</label>
              <Input
                placeholder="Rechercher..."
                value={filtres.NUM_DOSSIER}
                onChange={(e) => setFiltres({ ...filtres, NUM_DOSSIER: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Input
                placeholder="Nom du client..."
                value={filtres.nom_client}
                onChange={(e) => setFiltres({ ...filtres, nom_client: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">N° Pièce</label>
              <Input
                placeholder="N° pièce client..."
                value={filtres.NO_PIECE_CLIENT}
                onChange={(e) => setFiltres({ ...filtres, NO_PIECE_CLIENT: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type dossier</label>
              <Input
                placeholder="Type..."
                value={filtres.CODE_TYPE_DOS_AVA}
                onChange={(e) => setFiltres({ ...filtres, CODE_TYPE_DOS_AVA: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Agence</label>
              <Input
                placeholder="Code agence..."
                value={filtres.CODE_AGENCE_AVA}
                onChange={(e) => setFiltres({ ...filtres, CODE_AGENCE_AVA: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">État</label>
              <Input
                placeholder="État du dossier..."
                value={filtres.ETAT_DOSSIER}
                onChange={(e) => setFiltres({ ...filtres, ETAT_DOSSIER: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={appliquerFiltres} className="w-full md:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Appliquer les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des dossiers */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des dossiers</CardTitle>
          <CardDescription>
            Cliquez sur "Générer PDF" pour télécharger le document du dossier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement des dossiers...</p>
            </div>
          ) : dossiersFiltres.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun dossier trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">
                      <button
                        onClick={() => handleSort('NUM_DOSSIER')}
                        className="flex items-center font-semibold hover:text-primary"
                      >
                        N° Dossier
                        <SortIcon column="NUM_DOSSIER" />
                      </button>
                    </th>
                    <th className="text-left p-3">
                      <button
                        onClick={() => handleSort('LIBELLE_TYPE_DOSSIER')}
                        className="flex items-center font-semibold hover:text-primary"
                      >
                        Type
                        <SortIcon column="LIBELLE_TYPE_DOSSIER" />
                      </button>
                    </th>
                    <th className="text-left p-3">
                      <button
                        onClick={() => handleSort('nom_client')}
                        className="flex items-center font-semibold hover:text-primary"
                      >
                        Client
                        <SortIcon column="nom_client" />
                      </button>
                    </th>
                    <th className="text-left p-3">
                      <button
                        onClick={() => handleSort('LIBELLE_AGENCE')}
                        className="flex items-center font-semibold hover:text-primary"
                      >
                        Agence
                        <SortIcon column="LIBELLE_AGENCE" />
                      </button>
                    </th>
                    <th className="text-left p-3">
                      <button
                        onClick={() => handleSort('DATE_DOSSIER')}
                        className="flex items-center font-semibold hover:text-primary"
                      >
                        Date
                        <SortIcon column="DATE_DOSSIER" />
                      </button>
                    </th>
                    <th className="text-left p-3">État</th>
                    <th className="text-left p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiersFiltres.map((dossier) => (
                    <tr key={dossier.NUM_DOSSIER} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{dossier.NUM_DOSSIER}</td>
                      <td className="p-3 text-sm">{dossier.LIBELLE_TYPE_DOSSIER}</td>
                      <td className="p-3">
                        {dossier.nom_client} {dossier.prenom_client || ''}
                      </td>
                      <td className="p-3 text-sm">{dossier.LIBELLE_AGENCE}</td>
                      <td className="p-3 text-sm">{dossier.DATE_DOSSIER}</td>
                      <td className="p-3">{getBadgeStatut(dossier.ETAT_DOSSIER || '')}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger 
                            className="w-[220px] h-9 px-4 py-2 inline-flex items-center justify-between rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-gradient-to-r from-[#435B7B] to-[#5B7B9B] hover:from-[#2D3E54] hover:to-[#435B7B] text-white shadow-sm"
                            disabled={generatingPdf === dossier.NUM_DOSSIER}
                          >
                            {generatingPdf === dossier.NUM_DOSSIER ? (
                              <span className="flex items-center gap-2">
                                <span className="animate-spin">⏳</span>
                                Génération...
                              </span>
                            ) : (
                              <>
                                <span className="flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Documents
                                </span>
                                <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[250px]">
                            <DropdownMenuLabel className="flex items-center gap-2">
                              <FileCheck className="w-4 h-4" />
                              Sélectionner un document
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {dossier.ETAT_DOSSIER === 'CLOTURE' ? (
                              // Pour les dossiers clôturés : UNIQUEMENT l'attestation de clôture
                              <DropdownMenuItem 
                                onClick={() => handleDocumentSelection(dossier, 'attestation-cloture')}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gray-100 rounded-md">
                                    <FileLock className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium">Attestation de clôture</span>
                                    <span className="text-xs text-muted-foreground">Dossier clôturé</span>
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ) : (
                              // Pour les dossiers actifs ou suspendus : tous les documents SAUF attestation de clôture
                              <>
                                <DropdownMenuItem 
                                  onClick={() => handleDocumentSelection(dossier, 'attestation-ouverture')}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-md">
                                      <FileCheck className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium">Attestation d'ouverture</span>
                                      <span className="text-xs text-muted-foreground">Document officiel BCT</span>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDocumentSelection(dossier, 'attestation-solde')}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-md">
                                      <FileBarChart className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium">Attestation de solde</span>
                                      <span className="text-xs text-muted-foreground">Situation financière</span>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDocumentSelection(dossier, 'decompte-mouvements')}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-md">
                                      <FileBarChart className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium">Décompte mouvements</span>
                                      <span className="text-xs text-muted-foreground">Historique des opérations</span>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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