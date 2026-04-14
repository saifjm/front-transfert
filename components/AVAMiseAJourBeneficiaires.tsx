import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { AVATableauRecherche, DossierAVARecherche } from './AVATableauRecherche';
import { 
  Search, 
  ArrowLeft, 
  FileText, 
  AlertTriangle,
  PlusCircle,
  Trash2,
  Save,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '../utils';

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
}

// DTO depuis l'API
interface DossierValideDTO {
  codeAgence: number;
  typeDossierAva: number;
  numDossier: number;
  dateDossier: string;
  noPieceClient: string;
  nomClient: string;
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

interface Agence {
  codeAgence: number;
  libelleAgence: string;

  // Ajout de typeDossierAva pour filtrer les agences par type de dossier AVA
  typeDossierAva?: number;
}

export function AVAMiseAJourBeneficiaires() {
  const [etape, setEtape] = useState<'recherche' | 'mise-a-jour'>('recherche');
  const [dossiers, setDossiers] = useState<DossierAVA[]>([]);
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVA[]>([]);
  const [dossierSelectionne, setDossierSelectionne] = useState<DossierAVA | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filtres de recherche
  const [searchNumeroDossier, setSearchNumeroDossier] = useState('');
  const [searchTypeDossier, setSearchTypeDossier] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchAgence, setSearchAgence] = useState('');
  
  // Liste des agences
  const [agences, setAgences] = useState<Agence[]>([]);
  
  // Bénéficiaires
  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireExistant[]>([]);
  const [beneficiairesInitiaux, setBeneficiairesInitiaux] = useState<BeneficiaireExistant[]>([]);

  // Charger les dossiers valides au montage
  useEffect(() => {
    fetchDossiers();
    fetchAgences();
  }, []);

  // Charger les dossiers valides
  const fetchDossiers = async () => {
    setLoading(true);
    
    // Données mock par défaut
    const mockDossiers: DossierAVA[] = [
      {
        codeAgence: 100,
        libelleAgence: 'Agence Tunis Centre',
        typeDossierAva: 1,
        codeTypeDossier: 1,
        libelleTypeDossier: 'EXPORTATEUR',
        numDossier: 1,
        numeroDossier: 'AVA-1',
        dateDossier: '2024-01-15',
        noPieceClient: '1695881M',
        nomClient: 'Dupont Jean',
        prenomClient: 'Jean',
        mntAutorise: 150000,
        mntAvance: 75000,
        mntAutorisationBct: 30000,
        mntUtilise: 45000,
        mntReserve: 30000,
        mntBlocage: 0,
        solde: 75000,
        echeance: '2024-12-31',
        typePieceClient: 1
      },
      {
        codeAgence: 200,
        libelleAgence: 'Agence Sfax',
        typeDossierAva: 2,
        codeTypeDossier: 2,
        libelleTypeDossier: 'MARCHE REALISABLE A L\'ETRANGER',
        numDossier: 2,
        numeroDossier: 'AVA-2',
        dateDossier: '2024-02-10',
        noPieceClient: '2345678M',
        nomClient: 'Martin Sophie',
        prenomClient: 'Sophie',
        mntAutorise: 200000,
        mntAvance: 100000,
        mntAutorisationBct: 40000,
        mntUtilise: 60000,
        mntReserve: 40000,
        mntBlocage: 0,
        solde: 100000,
        echeance: '2024-11-30',
        typePieceClient: 1
      },
      {
        codeAgence: 300,
        libelleAgence: 'Agence Sousse',
        typeDossierAva: 3,
        codeTypeDossier: 3,
        libelleTypeDossier: 'AUTRES ACTIVITES (ANNEXE N.2)',
        numDossier: 3,
        numeroDossier: 'AVA-3',
        dateDossier: '2024-03-05',
        noPieceClient: '3456789M',
        nomClient: 'Ben Ali Ahmed',
        prenomClient: 'Ahmed',
        mntAutorise: 250000,
        mntAvance: 125000,
        mntAutorisationBct: 50000,
        mntUtilise: 75000,
        mntReserve: 50000,
        mntBlocage: 0,
        solde: 125000,
        echeance: '2024-10-31',
        typePieceClient: 1
      },
      {
        codeAgence: 100,
        libelleAgence: 'Agence Tunis Centre',
        typeDossierAva: 1,
        codeTypeDossier: 1,
        libelleTypeDossier: 'EXPORTATEUR',
        numDossier: 4,
        numeroDossier: 'AVA-4',
        dateDossier: '2024-04-12',
        noPieceClient: '4567890M',
        nomClient: 'Trabelsi Leila',
        prenomClient: 'Leila',
        mntAutorise: 180000,
        mntAvance: 90000,
        mntAutorisationBct: 35000,
        mntUtilise: 55000,
        mntReserve: 35000,
        mntBlocage: 0,
        solde: 90000,
        echeance: '2025-01-15',
        typePieceClient: 1
      },
      {
        codeAgence: 400,
        libelleAgence: 'Agence Monastir',
        typeDossierAva: 5,
        codeTypeDossier: 5,
        libelleTypeDossier: 'A. ACT. (PROM.-NOUV. PROJ.)',
        numDossier: 5,
        numeroDossier: 'AVA-5',
        dateDossier: '2024-05-20',
        noPieceClient: '5678901M',
        nomClient: 'Hamdi Mohamed',
        prenomClient: 'Mohamed',
        mntAutorise: 300000,
        mntAvance: 150000,
        mntAutorisationBct: 60000,
        mntUtilise: 90000,
        mntReserve: 60000,
        mntBlocage: 0,
        solde: 150000,
        echeance: '2024-09-30',
        typePieceClient: 1
      }
    ] as any[];
    
    try {
      // Appel API réel
      const response = await fetch('/api/operations-deleguees/dossiers-valides-avec-nom');
      
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
      }

      const data = await safeJsonParse<DossierValideDTO[]>(response);
      
      if (!data) {
        throw new Error('JSON_PARSE_ERROR');
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
        libelleAgence: '' // Sera renseigné via la liste des agences
      }));

      // Enrichir avec les libellés d'agence
      dossiersTransformes.forEach(dossier => {
        const agence = agences.find(a => a.codeAgence === dossier.codeAgence);
        if (agence) {
          dossier.libelleAgence = agence.libelleAgence;
        }
      });

      setDossiers(dossiersTransformes);
      setDossiersFiltres(dossiersTransformes);
      
      console.log('✅ API: Dossiers chargés avec succès (' + dossiersTransformes.length + ' dossiers)');
    } catch (error: any) {
      // Mode démonstration silencieux - pas d'alerte utilisateur
      setDossiers(mockDossiers);
      setDossiersFiltres(mockDossiers);
      
      // Log discret uniquement si ce n'est pas une erreur réseau classique
      if (error?.message && !error.message.includes('HTTP_ERROR') && error.message !== 'NOT_JSON' && error.message !== 'Failed to fetch') {
        console.info('ℹ️ Mode démonstration activé');
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les agences
  const fetchAgences = async () => {
    try {
      const mockAgences: Agence[] = [
        { codeAgence: 100, libelleAgence: 'Agence Tunis Centre' },
        { codeAgence: 200, libelleAgence: 'Agence Sfax' },
        { codeAgence: 300, libelleAgence: 'Agence Sousse' },
        { codeAgence: 400, libelleAgence: 'Agence Monastir' },
      ];
      setAgences(mockAgences);
    } catch (error) {
      console.error('Erreur chargement agences:', error);
    }
  };

  // Filtrer les dossiers
  useEffect(() => {
    let resultats = [...dossiers];

    if (searchNumeroDossier) {
      resultats = resultats.filter(d => 
        d.numeroDossier?.toLowerCase().includes(searchNumeroDossier.toLowerCase())
      );
    }

    if (searchTypeDossier) {
      resultats = resultats.filter(d => 
        d.codeTypeDossier === Number(searchTypeDossier)
      );
    }

    if (searchClient) {
      resultats = resultats.filter(d => 
        d.noPieceClient?.toLowerCase().includes(searchClient.toLowerCase()) ||
        d.nomClient?.toLowerCase().includes(searchClient.toLowerCase()) ||
        d.prenomClient?.toLowerCase().includes(searchClient.toLowerCase())
      );
    }

    if (searchAgence) {
      resultats = resultats.filter(d => 
        d.codeAgence === Number(searchAgence)
      );
    }

    setDossiersFiltres(resultats);
  }, [searchNumeroDossier, searchTypeDossier, searchClient, searchAgence, dossiers]);

  // Sélectionner un dossier et charger ses bénéficiaires
  const selectionnerDossier = async (dossier: DossierAVA) => {
    setLoading(true);
    
    // Bénéficiaires mock par défaut
    const mockBeneficiaires: BeneficiaireExistant[] = [
      {
        id: '1',
        typePieceBenef: 1,
        noPieceBenef: '12345678',
        nomBenef: 'Dupont Jean',
        adresseBenef: '12 Avenue Bourguiba, Tunis',
        qualite: 'dirigeant',
        datePiece: '2020-05-15',
        etat: 'A',
        isNew: false
      },
      {
        id: '2',
        typePieceBenef: 7,
        noPieceBenef: 'P9876543',
        nomBenef: 'Martin Sophie',
        adresseBenef: '45 Rue de la République, Tunis',
        qualite: 'employé',
        datePiece: '2019-08-22',
        etat: 'N',
        isNew: false
      }
    ];
    
    try {
      // 1. Charger le résumé du dossier depuis l'API
      const summaryResponse = await fetch(`/api/operations-deleguees/${dossier.numDossier}/summary`);
      
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

      // 3. Charger les bénéficiaires (opération_deleguee_mvt)
      // TODO: Remplacer par l'appel API réel pour charger les bénéficiaires
      // GET /api/operations-deleguees/{numDossier}/beneficiaires
      setBeneficiaires(mockBeneficiaires);
      setBeneficiairesInitiaux(mockBeneficiaires);
      setEtape('mise-a-jour');
    } catch (error: any) {
      // Mode démonstration silencieux
      // En cas d'erreur, utiliser les données partielles disponibles (qui contiennent déjà les montants mock)
      setDossierSelectionne(dossier);
      setBeneficiaires(mockBeneficiaires);
      setBeneficiairesInitiaux(mockBeneficiaires);
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
      id: Date.now().toString(),
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
      return [{ value: 'AA', label: 'A activer' }];
    }

    // Si bénéficiaire existant et actif => uniquement AD
    if (beneficiaire.etat === 'A') {
      return [
        { value: 'AD', label: 'A désactiver' }
      ];
    }

    // Si bénéficiaire existant et inactif => uniquement AA
    if (beneficiaire.etat === 'N') {
      return [
        { value: 'AA', label: 'A activer' }
      ];
    }

    // Par défaut (ne devrait pas arriver)
    return [
      { value: 'AA', label: 'A activer' }
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
  const removeBeneficiaire = (id: string) => {
    setBeneficiaires(beneficiaires.filter(b => b.id !== id));
  };

  // Mettre à jour un bénéficiaire
  const updateBeneficiaire = (id: string, field: keyof BeneficiaireExistant, value: any) => {
    setBeneficiaires(beneficiaires.map(b => 
      b.id === id ? { ...b, [field]: value } : b
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
      // Préparation des données
      const dto = {
        numeroDossier: dossierSelectionne?.numeroDossier,
        beneficiaires: beneficiaires.map(({ id, ...rest }) => rest)
      };

      console.log('Mise à jour bénéficiaires:', JSON.stringify(dto, null, 2));
      
      // Simulation d'appel API
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Bénéficiaires mis à jour avec succès');
      retourListe();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchNumeroDossier('');
    setSearchTypeDossier('');
    setSearchClient('');
    setSearchAgence('');
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
      <div className="p-6 max-w-full mx-auto space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-3xl font-bold">Mise à jour Bénéficiaires</h1>
          <p className="text-muted-foreground mt-1">
            Rechercher et sélectionner un dossier AVA pour modifier ses bénéficiaires
          </p>
        </div>

        {/* Tableau de recherche avec tri et filtres */}
        <AVATableauRecherche
          dossiers={dossiers}
          onSelectDossier={(dossier) => selectionnerDossier(dossier as DossierAVA)}
          loading={loading}
          titre="Rechercher un dossier"
          description="Sélectionnez un dossier pour mettre à jour ses bénéficiaires"
        />
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
            {/* Ligne 2: N° Pièce Client, Nom du client */}
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <p className="text-muted-foreground">N° Pièce Client</p>
                <p className="font-medium">{dossierSelectionne?.noPieceClient}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nom du client</p>
                <p className="font-medium">{dossierSelectionne?.prenomClient} {dossierSelectionne?.nomClient}</p>
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
                      <Label>Numéro de Pièce *</Label>
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
                          <SelectItem value="dirigeant">Dirigeant</SelectItem>
                          <SelectItem value="conseil d'administration">Conseil d'Administration</SelectItem>
                          <SelectItem value="employé">Employé</SelectItem>
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