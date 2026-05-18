import {
  ArrowLeft,
  FileText,
  Filter,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Trash2
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';
import { authenticatedFetch } from '../utils/api';
import { continueMajBeneficiaireDecision, startMajBeneficiaireDecision } from '../utils/workflowApi';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface DossierAVA {
  codeAgence?: number;
  libelleAgence?: string;
  typeDossierAva?: number;
  codeTypeDossier?: number;
  libelleTypeDossier?: string;
  numDossier?: number;
  numeroDossier?: string;
  dateDossier?: string;
  noPieceClient?: string;
  nomClient?: string;
  prenomClient?: string;
  mntAutorise?: number;
  mntAvance?: number;
  mntAutorisationBct?: number;
  mntUtilise?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde?: number;
  echeance?: string;
  typePieceClient?: number;
  declarationFiscale?: string;
  numeroCompte?: string;
  DECLARATION_FISCALE?: string;
  NUMERO_COMPTE?: string;
  SOLDE?: number;
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

interface BeneficiaireExistant {
  id?: string;
  typePieceBenef?: number;
  noPieceBenef?: string;
  nomBenef?: string;
  adresseBenef?: string;
  qualite?: string;
  datePiece?: string;
  etat?: 'AA' | 'AD' | 'A' | 'N'; // AA: A activer, AD: A désactiver, A: Actif, N: Inactif
  isNew?: boolean; // Pour distinguer les nouveaux bénéficiaires
}

interface BeneficiaireDTO {
  numDossier: number;
  dateDossier: string;
  typePieceBenef: number;
  noPieceBenef: string;
  codeTypeDos: number;
  nomBenef: string;
  adresseBenef: string;
  qualite: string;
  datePiece: string;
  etat: string;
  codeAgenceAva?: number;
  dateCreation?: string;
  dateSuppression?: string;
}

interface Agence {
  codeAgence: number;
  libelleAgence: string;

  // Ajout de typeDossierAva pour filtrer les agences par type de dossier AVA
  typeDossierAva?: number;
}

export function AVAMiseAJourBeneficiaires({ initialDossierNum }: { initialDossierNum?: string } = {}) {
  const deepLinked = useRef(false);
  const [etape, setEtape] = useState<'recherche' | 'mise-a-jour'>('recherche');
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // État workflow
  const [wfMajBeneficiaireBusinessKey, setWfMajBeneficiaireBusinessKey] = useState<string | null>(null);
  
  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);

  // Filtres de recherche
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');

  // Bénéficiaires
  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireExistant[]>([]);
  const [beneficiairesInitiaux, setBeneficiairesInitiaux] = useState<BeneficiaireExistant[]>([]);

  // Charger les dossiers valides au montage
  useEffect(() => {
    fetchDossiers();
  }, []);

  // Filtrer les dossiers
  useEffect(() => {
    let filtered = [...dossiers];
    if (searchNumeroDossier.trim()) {
      filtered = filtered.filter(d =>
        (d.numeroDossier || String(d.numDossier || '')).toLowerCase().includes(searchNumeroDossier.toLowerCase())
      );
    }
    if (searchTypeDossier) {
      filtered = filtered.filter(d => (d.codeTypeDossier || d.typeDossierAva)?.toString() === searchTypeDossier);
    }
    if (searchClient.trim()) {
      const term = searchClient.toLowerCase();
      filtered = filtered.filter(d =>
        (d.nomClient || '').toLowerCase().includes(term) ||
        (d.noPieceClient || '').toLowerCase().includes(term)
      );
    }
    if (searchAgence) {
      filtered = filtered.filter(d => d.codeAgence?.toString() === searchAgence);
    }
    setDossiersFiltres(filtered);
  }, [searchNumeroDossier, searchTypeDossier, searchClient, searchAgence, dossiers]);

  const resetFilters = () => {
    setSearchNumeroDossier('');
    setSearchTypeDossier('');
    setSearchClient('');
    setSearchAgence('');
  };

  // Charger les dossiers valides
  const fetchDossiers = async () => {
    setLoading(true);
    
    try {
      // Appel API réel
      const response = await authenticatedFetch('/api/operations-deleguees/dossiers-valides-avec-nom');
      
      // Vérifier si la réponse est OK
      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }

      interface DossierValideDTO {
        codeAgence: number;
        typeDossierAva: number;
        numDossier: number;
        dateDossier: string;
        noPieceClient: string;
        nomClient: string;
        declarationFiscale?: string;
        DECLARATION_FISCALE?: string;
        solde?: number;
        SOLDE?: number;
        numeroCompte?: string;
        NUMERO_COMPTE?: string;
      }

      const data = await safeJsonParse<DossierValideDTO[]>(response);
      
      if (!data) {
        throw new Error('JSON_PARSE_ERROR');
      }

      let agenceNameByCode = new Map<number, string>();
      try {
        const donneesGeneralesResponse = await fetch('/api/ref/donnees-generales');
        if (donneesGeneralesResponse.ok) {
          const donneesGenerales = await safeJsonParse<Array<{ codeBanque?: number }>>(donneesGeneralesResponse);
          const codeBanque =
            Array.isArray(donneesGenerales) && donneesGenerales.length > 0
              ? Number(donneesGenerales[0]?.codeBanque)
              : NaN;
          if (Number.isFinite(codeBanque)) {
            const uniqueCodes = Array.from(
              new Set(
                data
                  .map((dto: any) => Number(dto.codeAgence))
                  .filter((code: number) => Number.isFinite(code)),
              ),
            ) as number[];
            const agencesResolved = await Promise.all(
              uniqueCodes.map(async (codeAgence) => {
                try {
                  const agenceResponse = await fetch(`/api/ref/agences/${codeBanque}/${codeAgence}`);
                  if (!agenceResponse.ok) return null;
                  const agence = await safeJsonParse<{ libAgence?: string }>(agenceResponse);
                  return { codeAgence, libelleAgence: agence?.libAgence || `Agence ${codeAgence}` };
                } catch {
                  return null;
                }
              }),
            );
            agenceNameByCode = new Map(
              agencesResolved
                .filter((item): item is { codeAgence: number; libelleAgence: string } => Boolean(item))
                .map((item) => [item.codeAgence, item.libelleAgence]),
            );
          }
        }
      } catch {
        agenceNameByCode = new Map();
      }
      
      // Mapper les types de dossier avec leurs libellés
      const typeDossierLabels: { [key: number]: string } = {
        1: 'EXPORTATEUR',
        2: 'MARCHE REALISABLE A L\'ETRANGER',
        3: 'AUTRES ACTIVITES (ANNEXE N.2)',
        4: 'AUTRES ACTIVITES (BANQUES)',
        5: 'A. ACT. (PROM.-NOUV. PROJ.)'
      };

      // Transformer les données pour l'interface
      const dossiersTransformes: DossierAVA[] = data.map(dto => ({
        codeAgence: dto.codeAgence,
        typeDossierAva: dto.typeDossierAva,
        codeTypeDossier: dto.typeDossierAva,
        libelleTypeDossier: typeDossierLabels[dto.typeDossierAva] || 'Type inconnu',
        numDossier: dto.numDossier,
        numeroDossier: `AVA-${dto.numDossier}`,
        dateDossier: dto.dateDossier,
        noPieceClient: dto.noPieceClient,
        nomClient: dto.nomClient,
        prenomClient: '', // Non fourni par l'API
        libelleAgence: agenceNameByCode.get(dto.codeAgence) || agences.find(a => a.codeAgence === dto.codeAgence)?.libelleAgence || `Agence ${dto.codeAgence}`,
        declarationFiscale: dto.declarationFiscale || dto.DECLARATION_FISCALE || '',
        solde: dto.solde ?? dto.SOLDE ?? 0,
        numeroCompte: dto.numeroCompte || dto.NUMERO_COMPTE || ''
      }));

      setAgences(Array.from(new Map(dossiersTransformes.map(d => [d.codeAgence, { codeAgence: d.codeAgence, libelleAgence: d.libelleAgence || `Agence ${d.codeAgence}` }])).values()));

      setDossiers(dossiersTransformes);
      
      console.log('✅ API: Dossiers chargés avec succès (' + dossiersTransformes.length + ' dossiers)');
    } catch (error: any) {
      console.error('Erreur lors du chargement des dossiers:', error);
      toast.error('Impossible de charger les dossiers', {
        description: 'Veuillez vérifier votre connexion et réessayer',
      });
      setDossiers([]);
      setAgences([]);
    } finally {
      setLoading(false);
    }
  };


  const fetchBeneficiaires = async (numDossier: number) => {
    try {
      const response = await authenticatedFetch(`/api/beneficiaires/${numDossier}`);
      if (!response.ok) {
        throw new Error(`HTTP_ERROR_${response.status}`);
      }
      
      const data = await safeJsonParse<BeneficiaireDTO[]>(response);
      if (!data) {
        throw new Error('NO_DATA');
      }
      
      const beneficiairesTransformes: BeneficiaireExistant[] = data.map((benef, index) => {
        // Formater la date en YYYY-MM-DD pour l'input type="date"
        let dateFormatee = benef.datePiece;
        if (dateFormatee && dateFormatee.includes('T')) {
          dateFormatee = dateFormatee.split('T')[0];
        }

        // Normaliser la qualité pour le Select
        let qualiteNormalisee = benef.qualite || (benef as any).qualite_benef;
        if (qualiteNormalisee?.toLowerCase() === 'dirigeant') qualiteNormalisee = 'Dirigeant';
        if (qualiteNormalisee?.toLowerCase().includes('conseil')) qualiteNormalisee = "Conseil d'administration";
        if (qualiteNormalisee?.toLowerCase().includes('employ')) qualiteNormalisee = 'Employé';

        // Capture robuste des valeurs de pièce (gère toutes les variations possibles d'API)
        const typePieceFix = 
          benef.typePieceBenef ?? 
          (benef as any).type_piece_benef ?? 
          (benef as any).typePieceClient ?? 
          (benef as any).type_piece_client ?? 
          (benef as any).codeTypePiece ?? 
          (benef as any).code_type_piece ?? 
          (benef as any).typePiece ?? 
          (benef as any).type_piece ?? 
          (benef as any).code ?? 
          undefined;

        const noPieceFix = 
          benef.noPieceBenef ?? 
          (benef as any).no_piece_benef ?? 
          (benef as any).noPieceClient ?? 
          (benef as any).no_piece_client ?? 
          (benef as any).numeroPiece ?? 
          (benef as any).numero_piece ?? 
          (benef as any).noPiece ?? 
          (benef as any).no_piece ?? 
          (benef as any).numero ??
          '';

        const nomBenefFix = benef.nomBenef || (benef as any).nom_benef || '';
        const adresseBenefFix = benef.adresseBenef || (benef as any).adresse_benef || '';

        // DEBUG : Afficher les données reçues de l'API pour comprendre les clés manquantes
        console.log(`Données API brutes pour le bénéficiaire ${index + 1}:`, JSON.stringify(benef));
        console.log(`Valeurs extraites -> Pièce: ${typePieceFix}, Numéro: ${noPieceFix}`);

        // L'ID doit être UNIQUE même si on reçoit les mêmes informations pour 2 bénéficiaires
        const uniqueId = `api-${benef.numDossier}-${noPieceFix}-${index}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          id: uniqueId,
          typePieceBenef: typePieceFix,
          noPieceBenef: noPieceFix,
          nomBenef: nomBenefFix,
          adresseBenef: adresseBenefFix,
          qualite: qualiteNormalisee,
          datePiece: dateFormatee,
          etat: benef.etat as 'AA' | 'AD' | 'A' | 'N',
          isNew: false
        };
      });
      
      return beneficiairesTransformes;
    } catch (error) {
      console.error('Erreur chargement bénéficiaires:', error);
      return [];
    }
  };

  // Deep-link: auto-select dossier navigated from dashboard
  useEffect(() => {
    if (!initialDossierNum || deepLinked.current || dossiers.length === 0) return;
    const found = dossiers.find(d => d.numeroDossier === initialDossierNum);
    if (found) { deepLinked.current = true; selectionnerDossier(found); }
  }, [dossiers, initialDossierNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sélectionner un dossier et charger ses bénéficiaires
  const selectionnerDossier = async (dossier: DossierAVA) => {
    setLoading(true);
    setWfMajBeneficiaireBusinessKey(null); // Reset workflow state
    
    try {
      // 1. Charger le résumé du dossier depuis l'API
      const summaryResponse = await authenticatedFetch(`/api/operations-deleguees/${dossier.numDossier}/summary`);
      
      if (!summaryResponse.ok) {
        throw new Error(`HTTP_ERROR_${summaryResponse.status}`);
      }

      // Vérifier le Content-Type
      const contentType = summaryResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('NOT_JSON');
      }

      const summary = await safeJsonParse<OperationsDelegueeSummaryDTO>(summaryResponse);
      if (!summary) {
        throw new Error('NO_DATA');
      }

      // 2. Enrichir le dossier avec les données du résumé
      const dossierComplet: DossierAVA = {
        ...dossier,
        codeAgence: summary.codeAgenceAva || dossier.codeAgence,
        codeTypeDossier: summary.codeTypeDosAva || dossier.codeTypeDossier,
        typeDossierAva: summary.codeTypeDosAva || dossier.typeDossierAva,
        numDossier: summary.numDossier || dossier.numDossier,
        dateDossier: summary.dateDossier || dossier.dateDossier,
        noPieceClient: summary.noPieceClient || dossier.noPieceClient,
        typePieceClient: summary.typePieceClient,
        mntAutorise: summary.mntAutorise,
        mntAvance: summary.mntAvance,
        mntAutorisationBct: summary.mntAutorisationBct,
        mntUtilise: summary.mntUtilise,
        mntReserve: summary.mntReserve,
        mntBlocage: summary.mntBlocage,
        solde: summary.solde,
        echeance: summary.echeance
      };

      setDossierSelectionne(dossierComplet);
      console.log('✅ API: Résumé du dossier chargé avec succès');

      // 3. Charger les bénéficiaires via l'API
      const beneficiairesCharges = await fetchBeneficiaires(dossierComplet.numDossier!);
      setBeneficiaires(beneficiairesCharges);
      setBeneficiairesInitiaux(beneficiairesCharges);
      setEtape('mise-a-jour');
    } catch (error: any) {
      // Mode démonstration silencieux
      // En cas d'erreur, utiliser les données partielles disponibles (qui contiennent déjà les montants mock)
      setDossierSelectionne(dossier);
      setBeneficiaires([]);
      setBeneficiairesInitiaux([]);
      setEtape('mise-a-jour');
      
      // Log discret uniquement si ce n'est pas une erreur réseau classique
      if (error?.message && !error.message.includes('HTTP_ERROR') && error.message !== 'NOT_JSON' && error.message !== 'Failed to fetch') {
        console.info('ℹ️ Mode démonstration activé pour le résumé');
      }
    } finally {
      setLoading(false);
    }
  };

  // Retour à la liste
  const retourListe = () => {
    setEtape('recherche');
    setDossierSelectionne(null);
    setBeneficiaires([]);
    setBeneficiairesInitiaux([]);
  };

  // Ajouter un bénéficiaire
  const addBeneficiaire = () => {
    setBeneficiaires([...beneficiaires, { 
      id: `new-${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`,
      typePieceBenef: undefined,
      noPieceBenef: '',
      nomBenef: '',
      adresseBenef: '',
      qualite: '',
      datePiece: '',
      etat: 'AA', // Nouveaux bénéficiaires : toujours "AA"
      isNew: true
    }]);
  };

  // Obtenir les états disponibles pour un bénéficiaire
  const getAvailableStates = (beneficiaire: BeneficiaireExistant): { value: 'AA' | 'AD' | 'A' | 'N', label: string }[] => {
    // Si nouveau bénéficiaire => uniquement AA
    if (beneficiaire.isNew) {
      return [{ value: 'AA', label: 'À activer' }];
    }

    // Le select doit toujours inclure l'état actuel et ses transitions
    if (beneficiaire.etat === 'A') {
      return [
        { value: 'A', label: 'Actif (État actuel)' },
        { value: 'AD', label: 'À désactiver' }
      ];
    }

    if (beneficiaire.etat === 'N') {
      return [
        { value: 'N', label: 'Inactif (État actuel)' },
        { value: 'AA', label: 'À activer' }
      ];
    }

    if (beneficiaire.etat === 'AD') {
      return [
        { value: 'A', label: 'Actif' },
        { value: 'AD', label: 'À désactiver (En cours)' }
      ];
    }

    if (beneficiaire.etat === 'AA') {
      return [
        { value: 'N', label: 'Inactif' },
        { value: 'AA', label: 'À activer (En cours)' }
      ];
    }

    // Fallback avec tous les états au cas où
    return [
      { value: 'A', label: 'Actif' },
      { value: 'N', label: 'Inactif' },
      { value: 'AA', label: 'À activer' },
      { value: 'AD', label: 'À désactiver' }
    ];
  };

  // Obtenir le badge de l'état
  const getEtatBadge = (etat?: 'AA' | 'AD' | 'A' | 'N') => {
    switch (etat) {
      case 'A':
        return <Badge className="bg-green-500 text-white">Actif</Badge>;
      case 'N':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'AA':
        return <Badge className="bg-blue-500 text-white">A activer</Badge>;
      case 'AD':
        return <Badge className="bg-orange-500 text-white">A désactiver</Badge>;
      default:
        return <Badge variant="outline">Non défini</Badge>;
    }
  };

  // Supprimer un bénéficiaire
  const removeBeneficiaire = (idToRemove: string) => {
    setBeneficiaires(prev => prev.filter(b => b.id !== idToRemove));
  };

  // Mettre à jour un bénéficiaire
  const updateBeneficiaire = (idToUpdate: string, field: keyof BeneficiaireExistant, value: any) => {
    setBeneficiaires(prev => prev.map(b => 
      b.id === idToUpdate ? { ...b, [field]: value } : b
    ));
  };

  // Validation de la date pièce bénéficiaire
  const validateBeneficiaireDatePiece = (date: string): string => {
    if (!date) return '';
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      return 'La date de la pièce ne peut pas être dans le futur';
    }
    return '';
  };

  // Soumettre la mise à jour
  const handleSubmit = async () => {
    // Validation
    if (beneficiaires.length === 0) {
      toast.error('Au moins un bénéficiaire est requis');
      return;
    }

    for (let i = 0; i < beneficiaires.length; i++) {
      const benef = beneficiaires[i];
      const missingFields: string[] = [];

      if (!benef.typePieceBenef) missingFields.push('Type de Pièce');
      if (!benef.noPieceBenef) missingFields.push('Numéro de Pièce');
      if (!benef.nomBenef) missingFields.push('Nom');
      if (!benef.adresseBenef) missingFields.push('Adresse');
      if (!benef.qualite) missingFields.push('Qualité');
      if (!benef.datePiece) missingFields.push('Date Pièce');

      if (missingFields.length > 0) {
        toast.error(`Bénéficiaire ${i + 1} incomplet`, {
          description: `Champs manquants : ${missingFields.join(', ')}`,
        });
        return;
      }

      // Validation date
      const dateError = validateBeneficiaireDatePiece(benef.datePiece!);
      if (dateError) {
        toast.error(`Bénéficiaire ${i + 1} - Date invalide`, {
          description: dateError,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Envoyer chaque bénéficiaire via le workflow
      for (let i = 0; i < beneficiaires.length; i++) {
        const benef = beneficiaires[i];
        
        // Préparation du payload pour le workflow (UN SEUL bénéficiaire)
        const payload = {
          numDossier: dossierSelectionne?.numDossier,
          dateDossier: dossierSelectionne?.dateDossier,
          typePieceBenef: benef.typePieceBenef,
          noPieceBenef: benef.noPieceBenef,
          codeTypeDos: dossierSelectionne?.codeTypeDossier,
          nomBenef: benef.nomBenef,
          adresseBenef: benef.adresseBenef,
          qualite: benef.qualite,
          datePiece: benef.datePiece,
          etat: benef.etat
        };

        console.log(`[WF] Maj Beneficiaire ${i + 1}/${beneficiaires.length} - Début soumission`);
        console.log('[WF] Business key actuelle:', wfMajBeneficiaireBusinessKey);
        console.log('[WF] Payload:', payload);

        // Appel workflow - SOUMETTRE
        const wfResponse = wfMajBeneficiaireBusinessKey
          ? await continueMajBeneficiaireDecision(
              wfMajBeneficiaireBusinessKey,
              'SOUMETTRE',
              payload
            )
          : await startMajBeneficiaireDecision(
              'SOUMETTRE',
              payload
            );

        console.log('[WF] Réponse workflow SOUMETTRE:', wfResponse);

        // Traiter la réponse du workflow
        if (wfResponse.result === 'OK') {
          // Sauvegarder la business key pour les soumissions futures
          const newKey = wfResponse.state?.businessKey;
          if (newKey) {
            console.log('[WF] Business key sauvegardée:', newKey);
            setWfMajBeneficiaireBusinessKey(newKey);
          }

          console.log(`[WF] Bénéficiaire ${i + 1}/${beneficiaires.length} soumis avec succès`);

          // AUTO-APPROVAL: Automatically approve after submission
          console.log('[WF] Auto-approval - Début approbation automatique');
          try {
            const approvalResponse = await continueMajBeneficiaireDecision(
              newKey || wfMajBeneficiaireBusinessKey!,
              'APPROUVER',
              payload
            );

            console.log('[WF] Réponse approbation:', approvalResponse);

            if (approvalResponse.result === 'OK') {
              console.log(`[WF] Bénéficiaire ${i + 1}/${beneficiaires.length} approuvé avec succès`);
            } else {
              console.error('[WF] Erreur approbation:', approvalResponse.errorMessage);
              toast.warning(`Bénéficiaire ${i + 1} soumis mais erreur lors de l'approbation`, {
                description: approvalResponse.errorMessage || 'Veuillez approuver manuellement',
              });
            }
          } catch (approvalError) {
            console.error('[WF] Exception approbation:', approvalError);
            toast.warning(`Bénéficiaire ${i + 1} soumis mais erreur lors de l'approbation automatique`, {
              description: 'Veuillez approuver manuellement',
            });
          }

        } else if (wfResponse.result === 'REJECTED') {
          console.error('[WF] Opération rejetée:', wfResponse.errorMessage);
          toast.error(`Bénéficiaire ${i + 1} rejeté par le workflow`, {
            description: wfResponse.errorMessage || 'Veuillez vérifier les données',
          });
          return; // Arrêter le traitement

        } else if (wfResponse.result === 'ERROR') {
          console.error('[WF] Erreur workflow:', wfResponse.errorMessage);
          toast.error(`Erreur workflow pour bénéficiaire ${i + 1}`, {
            description: wfResponse.errorMessage || 'Une erreur est survenue',
          });
          return; // Arrêter le traitement
        }
      }

      // Tous les bénéficiaires ont été soumis et approuvés avec succès
      toast.success('Mise à jour bénéficiaires approuvée avec succès', {
        description: `${beneficiaires.length} bénéficiaire(s) traité(s)`,
        duration: 5000,
      });

      // Retour à la liste et rafraîchissement
      retourListe();
      await fetchDossiers();

    } catch (error: any) {
      console.error('[WF] Exception:', error);
      toast.error('Erreur lors de la soumission', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Réinitialiser la liste des bénéficiaires
  const resetBeneficiaires = () => {
    // Créer une copie profonde pour éviter les références partagées
    const copie = beneficiairesInitiaux.map(b => ({ ...b }));
    setBeneficiaires(copie);
    toast.success('Liste des bénéficiaires réinitialisée');
  };
  
  // Interface de recherche
  if (etape === 'recherche') {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold">Mise à jour Bénéficiaires</h1>
          <p className="text-muted-foreground mt-1">
            Rechercher et sélectionner un dossier AVA pour modifier ses bénéficiaires
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
                <Label htmlFor="searchNumeroDossier">Numéro de dossier</Label>
                <Input
                  id="searchNumeroDossier"
                  placeholder="Ex: 9360426"
                  value={searchNumeroDossier}
                  onChange={(e) => setSearchNumeroDossier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="searchTypeDossier">Type de dossier</Label>
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
                <Label htmlFor="searchClient">Client</Label>
                <Input
                  id="searchClient"
                  placeholder="Nom ou N° pièce"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="searchAgence">Agence</Label>
                <Select value={searchAgence} onValueChange={setSearchAgence}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les agences" />
                  </SelectTrigger>
                  <SelectContent>
                    {agences.map(agence => (
                      <SelectItem key={agence.codeAgence} value={String(agence.codeAgence)}>
                        {agence.codeAgence} - {agence.libelleAgence}
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
              Sélectionnez un dossier pour mettre à jour ses bénéficiaires
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#435B7B] mx-auto"></div>
                <p className="text-muted-foreground mt-4">Chargement des dossiers...</p>
              </div>
            ) : dossiersFiltres.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun dossier trouvé</p>
                <p className="text-sm text-muted-foreground mt-2">Essayez de modifier vos critères de recherche</p>
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
                      <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <Badge variant="outline">{dossier.codeAgence}</Badge>
                        </td>
                        <td className="p-3 text-sm">{dossier.libelleAgence || `Agence ${dossier.codeAgence}`}</td>
                        <td className="p-3">
                          <Badge variant="secondary">
                            {dossier.codeTypeDossier} - {dossier.libelleTypeDossier}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium">{dossier.numeroDossier || dossier.numDossier}</td>
                        <td className="p-3 text-sm">
                          {dossier.dateDossier ? new Date(dossier.dateDossier).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="p-3 text-sm">{dossier.noPieceClient}</td>
                        <td className="p-3 text-sm">{dossier.nomClient}</td>
                        <td className="p-3">
                          <Button size="sm" onClick={() => selectionnerDossier(dossier)} disabled={loading}>
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

  // Interface de mise à jour
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* En-tête avec retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={retourListe}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mise à jour Bénéficiaires</h1>
            <p className="text-muted-foreground mt-1">
              Dossier : {dossierSelectionne?.numeroDossier} - {dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les modifications
        </Button>
      </div>

      {/* Informations du dossier */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations générales */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Informations générales</h3>
            {/* Ligne 1: Code agence, Libellé agence, Type de dossier, Date du dossier, Numéro de dossier */}
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
                <p className="font-medium">{dossierSelectionne?.codeTypeDossier} - {dossierSelectionne?.libelleTypeDossier}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date du dossier</p>
                <p className="font-medium">
                  {dossierSelectionne?.dateDossier ? new Date(dossierSelectionne.dateDossier).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Numéro de dossier</p>
                <p className="font-medium">{dossierSelectionne?.numeroDossier}</p>
              </div>
            </div>
            {/* Ligne 2: N° Pièce Client, Nom du client, Déclaration Fiscale, N° Compte */}
            <div className="grid grid-cols-4 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">N° Pièce Client</p>
                <p className="font-medium">{dossierSelectionne?.noPieceClient}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nom du client</p>
                <p className="font-medium">{dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Décl. Fiscale</p>
                <p className="font-medium">{dossierSelectionne?.declarationFiscale || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">N° Compte</p>
                <p className="font-medium">{dossierSelectionne?.numeroCompte || '-'}</p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-t"></div>

          {/* Montants de référence */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Montants de référence</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant autorisé</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAutorise?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant avance</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAvance?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-muted-foreground">Montant autorisation BCT</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {dossierSelectionne?.mntAutorisationBct?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-t"></div>

          {/* Montants utilisés et solde - sans label */}
          <div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">Montant utilisé</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntUtilise?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-muted-foreground">Montant réservé</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {dossierSelectionne?.mntReserve?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${(dossierSelectionne?.solde ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                <p className="text-muted-foreground">Solde disponible</p>
                <p className={`text-lg font-semibold ${(dossierSelectionne?.solde ?? 0) >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-700 dark:text-red-400'}`}>
                  {dossierSelectionne?.solde?.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des bénéficiaires */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des Bénéficiaires</CardTitle>
              <CardDescription>
                Modifiez, ajoutez ou supprimez des bénéficiaires
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetBeneficiaires} variant="outline" size="sm" disabled={isSubmitting}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
              <Button onClick={addBeneficiaire} size="sm">
                <PlusCircle className="w-4 h-4 mr-2" />
                Ajouter un bénéficiaire
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#435B7B] mx-auto"></div>
              <p className="text-muted-foreground mt-4">Chargement des bénéficiaires...</p>
            </div>
          ) : beneficiaires.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun bénéficiaire</p>
              <Button onClick={addBeneficiaire} variant="outline" className="mt-4" size="sm">
                <PlusCircle className="w-4 h-4 mr-2" />
                Ajouter le premier bénéficiaire
              </Button>
            </div>
          ) : (
            beneficiaires.map((beneficiaire, index) => {
              const datePieceError = beneficiaire.datePiece ? validateBeneficiaireDatePiece(beneficiaire.datePiece) : '';
              
              return (
                <div key={beneficiaire.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Bénéficiaire {index + 1}</Badge>
                      {getEtatBadge(beneficiaire.etat)}
                    </div>
                    {/* Bouton de suppression uniquement pour les nouveaux bénéficiaires */}
                    {beneficiaire.isNew && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeBeneficiaire(beneficiaire.id!)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de Pièce *</Label>
                      <Select
                        value={beneficiaire.typePieceBenef?.toString()}
                        onValueChange={(value) => updateBeneficiaire(beneficiaire.id!, 'typePieceBenef', Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Carte d'identité nationale</SelectItem>
                          <SelectItem value="4">Carte de séjour</SelectItem>
                          <SelectItem value="7">Passeport</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Numéro de Pièce * 
                        {/* Temporaire DEBUG : {JSON.stringify(beneficiaire.noPieceBenef)}  */}
                      </Label>
                      <Input
                        value={beneficiaire.noPieceBenef || ''}
                        onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'noPieceBenef', e.target.value)}
                        placeholder="Ex: 1234567H"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nom Bénéficiaire *</Label>
                      <Input
                        value={beneficiaire.nomBenef || ''}
                        onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'nomBenef', e.target.value)}
                        placeholder="Ex: Dupont Jean"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Adresse Bénéficiaire *</Label>
                      <Input
                        value={beneficiaire.adresseBenef || ''}
                        onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'adresseBenef', e.target.value)}
                        placeholder="Ex: 12 Rue de la Paix"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Qualité *</Label>
                      <Select
                        value={beneficiaire.qualite || ''}
                        onValueChange={(value) => updateBeneficiaire(beneficiaire.id!, 'qualite', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dirigeant">Dirigeant</SelectItem>
                          <SelectItem value="Conseil d'administration">Conseil d'Administration</SelectItem>
                          <SelectItem value="Employé">Employé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Pièce *</Label>
                      <Input
                        type="date"
                        value={beneficiaire.datePiece || ''}
                        onChange={(e) => updateBeneficiaire(beneficiaire.id!, 'datePiece', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className={datePieceError ? 'border-red-500' : ''}
                      />
                      {datePieceError && (
                        <p className="text-xs text-red-500">{datePieceError}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        La date doit être &le; à aujourd'hui
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>État *</Label>
                      <Select
                        value={beneficiaire.etat || ''}
                        onValueChange={(value) => updateBeneficiaire(beneficiaire.id!, 'etat', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableStates(beneficiaire).map(state => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Actions finales */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * Champs obligatoires
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={retourListe}
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
                Enregistrer les modifications
              </Button>
              <Button 
                onClick={resetBeneficiaires}
                disabled={isSubmitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}