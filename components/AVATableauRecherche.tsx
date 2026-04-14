import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Eye
} from 'lucide-react';

export interface DossierAVARecherche {
  CODE_TYPE_DOS_AVA: string | number;
  LIBELLE_TYPE_DOSSIER?: string;
  NUM_DOSSIER: string;
  DATE_DOSSIER: string;
  CODE_AGENCE_AVA: string | number;
  LIBELLE_AGENCE?: string;
  NO_PIECE_CLIENT: string;
  nom_client: string;
  prenom_client?: string;
  DECLARATION_FISCALE: string;
  SOLDE: number;
  ETAT_DOSSIER: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  NUMERO_COMPTE: string;
  montantAutorise?: number;
  montantUtilise?: number;
  montantReserve?: number;
  devise?: string;
  
  // Pour compatibilité avec les anciens formats
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
  mntUtilise?: number;
  solde?: number;
}

type SortColumn = keyof DossierAVARecherche | null;
type SortDirection = 'asc' | 'desc';

interface AVATableauRechercheProps {
  dossiers: DossierAVARecherche[];
  onSelectDossier: (dossier: DossierAVARecherche) => void;
  loading?: boolean;
  titre?: string;
  description?: string;
}

export function AVATableauRecherche({ 
  dossiers, 
  onSelectDossier, 
  loading = false,
  titre = "Recherche de dossiers",
  description = "Recherchez et sélectionnez un dossier AVA"
}: AVATableauRechercheProps) {
  const [dossiersFiltres, setDossiersFiltres] = useState<DossierAVARecherche[]>([]);
  
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

  // Normaliser les dossiers pour avoir les champs dans les deux formats
  const dossiersNormalises = dossiers.map(d => ({
    ...d,
    CODE_TYPE_DOS_AVA: d.CODE_TYPE_DOS_AVA || d.typeDossierAva || d.codeTypeDossier || '',
    LIBELLE_TYPE_DOSSIER: d.LIBELLE_TYPE_DOSSIER || d.libelleTypeDossier || '',
    NUM_DOSSIER: d.NUM_DOSSIER || d.numeroDossier || d.numDossier?.toString() || '',
    DATE_DOSSIER: d.DATE_DOSSIER || d.dateDossier || '',
    CODE_AGENCE_AVA: d.CODE_AGENCE_AVA || d.codeAgence || '',
    LIBELLE_AGENCE: d.LIBELLE_AGENCE || d.libelleAgence || '',
    NO_PIECE_CLIENT: d.NO_PIECE_CLIENT || d.noPieceClient || '',
    nom_client: d.nom_client || d.nomClient || '',
    prenom_client: d.prenom_client || d.prenomClient || '',
    DECLARATION_FISCALE: d.DECLARATION_FISCALE || '',
    SOLDE: d.SOLDE ?? d.solde ?? 0,
    ETAT_DOSSIER: d.ETAT_DOSSIER || 'ACTIF',
    NUMERO_COMPTE: d.NUMERO_COMPTE || '',
    montantAutorise: d.montantAutorise || d.mntAutorise || 0,
    montantUtilise: d.montantUtilise || d.mntUtilise || 0,
    devise: d.devise || 'TND'
  }));

  // Appliquer les filtres et le tri
  useEffect(() => {
    let filtered = [...dossiersNormalises];

    // Filtres de colonnes
    Object.entries(filtres).forEach(([key, value]) => {
      if (value.trim()) {
        filtered = filtered.filter(d => {
          const fieldValue = String(d[key as keyof DossierAVARecherche] || '').toLowerCase();
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
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    setDossiersFiltres(filtered);
  }, [filtres, sortColumn, sortDirection, dossiers]);

  // Gérer le tri
  const handleSort = (column: keyof DossierAVARecherche) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Réinitialiser les filtres
  const resetFiltres = () => {
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
    setSortColumn(null);
    setSortDirection('asc');
  };

  // Icône de tri
  const SortIcon = ({ column }: { column: keyof DossierAVARecherche }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-[#435B7B]" />
      : <ArrowDown className="w-4 h-4 text-[#435B7B]" />;
  };

  // Badge statut
  const StatutBadge = ({ statut }: { statut: string }) => {
    const variants: Record<string, string> = {
      ACTIF: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      SUSPENDU: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      CLOTURE: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return (
      <Badge className={variants[statut] || 'bg-gray-100 text-gray-800'}>
        {statut}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filtres de recherche */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{titre}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetFiltres}>
            <X className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterTypeDossier">Type Dossier</Label>
              <Input
                id="filterTypeDossier"
                placeholder="Rechercher..."
                value={filtres.CODE_TYPE_DOS_AVA}
                onChange={(e) => setFiltres({ ...filtres, CODE_TYPE_DOS_AVA: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterNumDossier">N° Dossier</Label>
              <Input
                id="filterNumDossier"
                placeholder="Rechercher..."
                value={filtres.NUM_DOSSIER}
                onChange={(e) => setFiltres({ ...filtres, NUM_DOSSIER: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterDateDossier">Date Dossier</Label>
              <Input
                id="filterDateDossier"
                type="date"
                value={filtres.DATE_DOSSIER}
                onChange={(e) => setFiltres({ ...filtres, DATE_DOSSIER: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterAgence">Code Agence</Label>
              <Input
                id="filterAgence"
                placeholder="Rechercher..."
                value={filtres.CODE_AGENCE_AVA}
                onChange={(e) => setFiltres({ ...filtres, CODE_AGENCE_AVA: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterPieceClient">N° Pièce Client</Label>
              <Input
                id="filterPieceClient"
                placeholder="Rechercher..."
                value={filtres.NO_PIECE_CLIENT}
                onChange={(e) => setFiltres({ ...filtres, NO_PIECE_CLIENT: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterNomClient">Nom Client</Label>
              <Input
                id="filterNomClient"
                placeholder="Rechercher..."
                value={filtres.nom_client}
                onChange={(e) => setFiltres({ ...filtres, nom_client: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterDeclaration">Déclaration Fiscale</Label>
              <Input
                id="filterDeclaration"
                placeholder="Rechercher..."
                value={filtres.DECLARATION_FISCALE}
                onChange={(e) => setFiltres({ ...filtres, DECLARATION_FISCALE: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterEtat">État Dossier</Label>
              <Select
                value={filtres.ETAT_DOSSIER}
                onValueChange={(value) => setFiltres({ ...filtres, ETAT_DOSSIER: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Tous</SelectItem>
                  <SelectItem value="ACTIF">ACTIF</SelectItem>
                  <SelectItem value="SUSPENDU">SUSPENDU</SelectItem>
                  <SelectItem value="CLOTURE">CLOTURE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filterCompte">N° Compte</Label>
              <Input
                id="filterCompte"
                placeholder="Rechercher..."
                value={filtres.NUMERO_COMPTE}
                onChange={(e) => setFiltres({ ...filtres, NUMERO_COMPTE: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des dossiers */}
      <Card>
        <CardHeader>
          <CardTitle>
            Résultats ({dossiersFiltres.length} dossier{dossiersFiltres.length > 1 ? 's' : ''})
          </CardTitle>
          <CardDescription>
            Cliquez sur une ligne pour sélectionner le dossier
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
              <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('CODE_TYPE_DOS_AVA')}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        <SortIcon column="CODE_TYPE_DOS_AVA" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('NUM_DOSSIER')}
                    >
                      <div className="flex items-center gap-2">
                        N° Dossier
                        <SortIcon column="NUM_DOSSIER" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('DATE_DOSSIER')}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        <SortIcon column="DATE_DOSSIER" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('CODE_AGENCE_AVA')}
                    >
                      <div className="flex items-center gap-2">
                        Agence
                        <SortIcon column="CODE_AGENCE_AVA" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('NO_PIECE_CLIENT')}
                    >
                      <div className="flex items-center gap-2">
                        N° Pièce
                        <SortIcon column="NO_PIECE_CLIENT" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('nom_client')}
                    >
                      <div className="flex items-center gap-2">
                        Client
                        <SortIcon column="nom_client" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('DECLARATION_FISCALE')}
                    >
                      <div className="flex items-center gap-2">
                        Décl. Fiscale
                        <SortIcon column="DECLARATION_FISCALE" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('SOLDE')}
                    >
                      <div className="flex items-center gap-2">
                        Solde
                        <SortIcon column="SOLDE" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('ETAT_DOSSIER')}
                    >
                      <div className="flex items-center gap-2">
                        État
                        <SortIcon column="ETAT_DOSSIER" />
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('NUMERO_COMPTE')}
                    >
                      <div className="flex items-center gap-2">
                        N° Compte
                        <SortIcon column="NUMERO_COMPTE" />
                      </div>
                    </th>
                    <th className="text-left p-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiersFiltres.map((dossier, index) => (
                    <tr 
                      key={index} 
                      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onSelectDossier(dossier)}
                    >
                      <td className="p-3">
                        <div>
                          <Badge variant="outline">
                            {dossier.CODE_TYPE_DOS_AVA}
                          </Badge>
                          {dossier.LIBELLE_TYPE_DOSSIER && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {dossier.LIBELLE_TYPE_DOSSIER}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{dossier.NUM_DOSSIER}</td>
                      <td className="p-3 text-sm">
                        {dossier.DATE_DOSSIER ? new Date(dossier.DATE_DOSSIER).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="p-3 text-sm">
                        <div>
                          {dossier.CODE_AGENCE_AVA}
                          {dossier.LIBELLE_AGENCE && (
                            <div className="text-xs text-muted-foreground">
                              {dossier.LIBELLE_AGENCE}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">{dossier.NO_PIECE_CLIENT}</td>
                      <td className="p-3 text-sm">
                        {dossier.prenom_client} {dossier.nom_client}
                      </td>
                      <td className="p-3 text-sm">{dossier.DECLARATION_FISCALE || '-'}</td>
                      <td className="p-3">
                        <span className={`font-semibold ${dossier.SOLDE >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                          {dossier.SOLDE.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND
                        </span>
                      </td>
                      <td className="p-3">
                        <StatutBadge statut={dossier.ETAT_DOSSIER} />
                      </td>
                      <td className="p-3 text-sm font-mono">{dossier.NUMERO_COMPTE || '-'}</td>
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
