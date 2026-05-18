import { AlertCircle, FileText, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authenticatedFetch } from '../utils/api';
import { startCafDecision } from '../utils/workflowApi';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface DeclarationFiscaleDTO {
  noPieceClient: string;
  typePieceClient: number; // Défaut 3
  annee: number;
  mntCaFiscal: number;
  datePresentation: string; // Format: YYYY-MM-DD
  dateDeclaration: string; // Format: YYYY-MM-DD
}

interface PersonneResponse {
  dateDelPiece: string | null;
  lieuDelPiece: string | null;
  nom: string;
  prenom: string | null;
  adrRes1: string | null;
  adrRes2: string | null;
  adrRes3: string | null;
  adrRes4: string | null;
  nationalite: string | null;
  telephone: string | null;
  email: string | null;
  dateCreation: string | null;
  typRefCltInt: string | null;
  numRefCltInt: string | null;
  npMigration: string | null;
  tpMigration: string | null;
  activite: string | null;
  fax: string | null;
  adrCor4: string | null;
  adrCor1: string | null;
  adrCor2: string | null;
  adrCor3: string | null;
  noPiecePersonne: string;
  typePiecePersonne: number;
}

interface OperationDelegueResponse {
  numDossier: string;
  dateDossier: string;
  numeroCompte: string;
  solde: number;
}

export function DeclarationChiffreAffairesFiscal() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [clientName, setClientName] = useState<string>('');
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);
  const [operationsDelegues, setOperationsDelegues] = useState<OperationDelegueResponse[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<Set<number>>(new Set());

  // État du formulaire
  const [declaration, setDeclaration] = useState<DeclarationFiscaleDTO>({
    noPieceClient: '',
    typePieceClient: 3, // Valeur par défaut
    annee: new Date().getFullYear(),
    mntCaFiscal: 0,
    datePresentation: '',
    dateDeclaration: ''
  });

  useEffect(() => {
    if (!declaration.noPieceClient.trim()) { setClientName(''); return; }
    const id = setTimeout(() => {
      void (async () => {
        setIsLoadingClient(true);
        try {
          const res = await fetch(`/api/ref/personnes/search/${declaration.typePieceClient}/${encodeURIComponent(declaration.noPieceClient)}`);
          if (res.ok) {
            const data: PersonneResponse | PersonneResponse[] = await res.json();
            const c = Array.isArray(data) ? data[0] : data;
            setClientName(c ? (c.prenom ? `${c.nom} ${c.prenom}` : c.nom) : '');
          } else { setClientName(''); }
        } catch { setClientName(''); }
        finally { setIsLoadingClient(false); }
      })();
    }, 500);
    return () => clearTimeout(id);
  }, [declaration.noPieceClient, declaration.typePieceClient]);

  useEffect(() => {
    if (!declaration.noPieceClient.trim()) { setOperationsDelegues([]); return; }
    const id = setTimeout(() => {
      void (async () => {
        setIsLoadingOperations(true);
        try {
          const res = await authenticatedFetch(`/api/operations-deleguees/by-matricule?noPieceClient=${encodeURIComponent(declaration.noPieceClient)}`);
          if (res.ok) { setOperationsDelegues(await res.json()); }
          else { setOperationsDelegues([]); }
        } catch { setOperationsDelegues([]); }
        finally { setIsLoadingOperations(false); }
      })();
    }, 500);
    return () => clearTimeout(id);
  }, [declaration.noPieceClient]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!declaration.noPieceClient.trim()) {
      newErrors.noPieceClient = 'Le numéro de pièce client est obligatoire';
    }

    if (!declaration.annee || declaration.annee < 1900 || declaration.annee > 2100) {
      newErrors.annee = 'L\'année doit être comprise entre 1900 et 2100';
    }

    if (!declaration.mntCaFiscal || declaration.mntCaFiscal <= 0) {
      newErrors.mntCaFiscal = 'Le montant du chiffre d\'affaires fiscal doit être supérieur à 0';
    }

    if (!declaration.datePresentation) {
      newErrors.datePresentation = 'La date de présentation est obligatoire';
    }

    if (!declaration.dateDeclaration) {
      newErrors.dateDeclaration = 'La date de déclaration est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Réinitialiser le formulaire
  const handleReset = () => {
    setDeclaration({
      noPieceClient: '',
      typePieceClient: 3,
      annee: new Date().getFullYear(),
      mntCaFiscal: 0,
      datePresentation: '',
      dateDeclaration: ''
    });
    setErrors({});
    setClientName('');
    setOperationsDelegues([]);
    setSelectedOperations(new Set());
  };

  // Gérer la sélection des opérations
  const toggleOperationSelection = (index: number) => {
    const newSelected = new Set(selectedOperations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedOperations(newSelected);
  };

  // Tout sélectionner / Tout désélectionner
  const toggleAllOperations = () => {
    if (selectedOperations.size === operationsDelegues.length) {
      setSelectedOperations(new Set());
    } else {
      setSelectedOperations(new Set(operationsDelegues.map((_, index) => index)));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }
    if (selectedOperations.size === 0) {
      toast.error('Veuillez sélectionner au moins une opération déléguée');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedIndexes = Array.from(selectedOperations);
      const payload = {
        // DeclarationCAFHT fields
        numDossier: Number(operationsDelegues[selectedIndexes[0]]?.numDossier) || undefined,
        noPieceClient: declaration.noPieceClient,
        typePieceClient: declaration.typePieceClient,
        annee: declaration.annee,
        mntCaFiscal: declaration.mntCaFiscal,
        datePresentation: declaration.datePresentation,
        dateDeclaration: declaration.dateDeclaration,
        etat: 'V',
        // TraitementAva — one entry per selected dossier
        traitements: selectedIndexes.map(idx => ({
          codeTypeDosAva: 3,
          numDossier: operationsDelegues[idx].numDossier,
          dateDossier: operationsDelegues[idx].dateDossier,
          annee: declaration.annee,
          mntCaFiscalHT: declaration.mntCaFiscal,
        })),
      };

      const res = await startCafDecision('ENREGISTRER', payload);

      if (res.result !== 'OK') {
        if (res.result === 'REJECTED' || res.result === 'ERROR') {
          toast.error('Erreur workflow', { description: res.errorMessage ?? 'Opération rejetée' });
        } else {
          toast.warning('Réponse inattendue', { description: res.result });
        }
        return;
      }

      // If the WF moved to TRAITEMENT_AVA (SYSTEM node), auto-advance to trigger TraitementAva
      if (res.state?.currentNodeKey === 'TRAITEMENT_AVA') {
        const res2 = await startCafDecision('EXECUTER', payload);
        if (res2.result !== 'OK') {
          toast.error('Erreur traitement AVA', { description: res2.errorMessage ?? 'Traitement AVA échoué' });
          return;
        }
      }

      toast.success('Déclaration fiscale enregistrée avec succès', {
        description: `Client: ${declaration.noPieceClient} — Année: ${declaration.annee} — ${selectedIndexes.length} dossier(s) traité(s)`,
      });
      setTimeout(() => handleReset(), 1500);
    } catch (err: any) {
      toast.error('Erreur', { description: err?.message ?? 'Une erreur est survenue' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold">Déclaration du chiffre d'affaires fiscal</h1>
        <p className="text-muted-foreground mt-1">
          Enregistrer une nouvelle déclaration du chiffre d'affaires fiscal pour un client
        </p>
      </div>

      {/* Card d'information */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold">Informations importantes :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Cette déclaration n'est pas rattachée à un dossier AVA</li>
                <li>Le montant du chiffre d'affaires fiscal doit être exprimé en TND avec 3 décimales</li>
                <li>Les dates sont au format AAAA-MM-JJ</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de la déclaration</CardTitle>
          <CardDescription>
            Renseignez les informations de la déclaration fiscale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* N° Pièce Client */}
            <div className="space-y-2">
              <Label htmlFor="noPieceClient">N° Pièce Client *</Label>
              <Input
                id="noPieceClient"
                placeholder="Ex: 1695881M"
                value={declaration.noPieceClient}
                onChange={(e) => setDeclaration({ ...declaration, noPieceClient: e.target.value })}
                className={errors.noPieceClient ? 'border-red-500' : ''}
              />
              {errors.noPieceClient && (
                <p className="text-xs text-red-600">{errors.noPieceClient}</p>
              )}
              {isLoadingClient && (
                <p className="text-xs text-muted-foreground mt-2">Recherche en cours...</p>
              )}
              {clientName && (
                <p className="text-xs text-muted-foreground mt-2">Client trouvé: {clientName}</p>
              )}
            </div>

            {/* Année */}
            <div className="space-y-2">
              <Label htmlFor="annee">Année *</Label>
              <Input
                id="annee"
                type="number"
                min="1900"
                max="2100"
                value={declaration.annee}
                onChange={(e) => setDeclaration({ ...declaration, annee: Number(e.target.value) || new Date().getFullYear() })}
                className={errors.annee ? 'border-red-500' : ''}
              />
              {errors.annee && (
                <p className="text-xs text-red-600">{errors.annee}</p>
              )}
            </div>

            {/* Montant CA Fiscal */}
            <div className="space-y-2">
              <Label htmlFor="mntCaFiscal">Montant CA Fiscal (TND) *</Label>
              <Input
                id="mntCaFiscal"
                type="number"
                min="0"
                step="0.001"
                value={declaration.mntCaFiscal || ''}
                onChange={(e) => setDeclaration({ ...declaration, mntCaFiscal: Number(e.target.value) || 0 })}
                placeholder="Ex: 600000.000"
                className={errors.mntCaFiscal ? 'border-red-500' : ''}
              />
              {errors.mntCaFiscal && (
                <p className="text-xs text-red-600">{errors.mntCaFiscal}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: avec 3 décimales (ex: 600000.000)
              </p>
            </div>

            {/* Date de présentation */}
            <div className="space-y-2">
              <Label htmlFor="datePresentation">Date de présentation *</Label>
              <Input
                id="datePresentation"
                type="date"
                value={declaration.datePresentation}
                onChange={(e) => setDeclaration({ ...declaration, datePresentation: e.target.value })}
                className={errors.datePresentation ? 'border-red-500' : ''}
              />
              {errors.datePresentation && (
                <p className="text-xs text-red-600">{errors.datePresentation}</p>
              )}
            </div>

            {/* Date de déclaration */}
            <div className="space-y-2">
              <Label htmlFor="dateDeclaration">Date de déclaration *</Label>
              <Input
                id="dateDeclaration"
                type="date"
                value={declaration.dateDeclaration}
                onChange={(e) => setDeclaration({ ...declaration, dateDeclaration: e.target.value })}
                className={errors.dateDeclaration ? 'border-red-500' : ''}
              />
              {errors.dateDeclaration && (
                <p className="text-xs text-red-600">{errors.dateDeclaration}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloc des opérations déléguées - Déplacé en dessous du formulaire */}
      {(isLoadingOperations || operationsDelegues.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Opérations déléguées</CardTitle>
                <CardDescription>
                  Sélectionnez les dossiers et comptes associés au client
                </CardDescription>
              </div>
              {operationsDelegues.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllOperations}
                >
                  {selectedOperations.size === operationsDelegues.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingOperations ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Chargement des opérations...</p>
              </div>
            ) : operationsDelegues.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Aucune opération déléguée trouvée</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-center py-3 px-4 font-semibold text-sm w-12">
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer"
                            checked={selectedOperations.size === operationsDelegues.length}
                            onChange={toggleAllOperations}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">N° Dossier</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Date Dossier</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">N° Compte</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Solde (TND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationsDelegues.map((operation, index) => (
                        <tr 
                          key={index} 
                          className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                            selectedOperations.has(index) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => toggleOperationSelection(index)}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer"
                              checked={selectedOperations.has(index)}
                              onChange={() => toggleOperationSelection(index)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-3 px-4 text-sm">{operation.numDossier}</td>
                          <td className="py-3 px-4 text-sm">{operation.dateDossier}</td>
                          <td className="py-3 px-4 text-sm font-mono">{operation.numeroCompte}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold">
                            {operation.solde.toLocaleString('fr-TN', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedOperations.size > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <span className="font-semibold">{selectedOperations.size}</span> opération(s) sélectionnée(s)
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * Champs obligatoires
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <FileText className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}