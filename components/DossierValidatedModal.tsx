import React from 'react';
import { X, CheckCircle, FileText, Users, DollarSign, Calendar, Building2 } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';

interface BeneficiaireDTO {
  numDossier?: number;
  dateDossier?: string;
  typePieceBenef?: number;
  noPieceBenef?: string;
  codeTypeDos?: number;
  codeAgenceAva?: number;
  nomBenef?: string;
  adresseBenef?: string;
  qualite?: string;
}

interface DocumentDTO {
  ligne?: number;
  nomImage?: string;
  cheminFichier?: string;
  typeDocument?: number;
}

interface AvaMarcheDTO {
  numMarche?: number;
  refContrat?: string;
  dateContrat?: string;
  montantMarche?: number;
  montantDevise?: number;
  contractant?: string;
  dateFin?: string;
  codeDevise?: number;
}

interface OuvertureDossierDTO {
  numDossier?: number;
  codeTypeDosAva?: number;
  dateDossier?: string;
  codeAgenceAva?: number;
  typePieceClient?: number;
  noPieceClient?: string;
  numeroCompte?: string;
  tel?: string;
  codeActivite?: number;
  codeSousActivite?: number;
  declarationFiscale?: string;
  dateUltDeclCaf?: string;
  mntAvance?: number;
  mntUtilise?: number;
  mntAutorise?: number;
  mntAutoriseBct?: number;
  mntReserve?: number;
  mntBlocage?: number;
  solde?: number;
  beneficiaires?: BeneficiaireDTO[];
  documents?: DocumentDTO[];
  avaMarche?: AvaMarcheDTO;
}

interface DossierValidatedModalProps {
  isOpen: boolean;
  dossier: OuvertureDossierDTO | null;
  onClose: () => void;
}

export function DossierValidatedModal({ isOpen, dossier, onClose }: DossierValidatedModalProps) {
  if (!isOpen || !dossier) return null;

  // Formatter les montants en TND avec 3 décimales
  const formatMontant = (montant?: number): string => {
    if (montant === undefined || montant === null) return '0.000';
    return montant.toFixed(3);
  };

  // Formatter la date
  const formatDate = (date?: string): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Mapping type de pièce
  const getTypePieceLabel = (type?: number): string => {
    const types: { [key: number]: string } = {
      1: 'Carte d\'Identité Nationale',
      3: 'Matricule Fiscal',
      4: 'Passeport',
      7: 'Autre'
    };
    return types[type || 0] || 'Non spécifié';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#435B7B] to-[#2D3E54] text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Dossier AVA Créé avec Succès</h2>
              <p className="text-sm text-white/80">Numéro de dossier : {dossier.numDossier}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Informations Générales */}
          <div className="bg-gradient-to-br from-[#D6E4F0] to-white rounded-lg border border-[#B8CFDF] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-[#435B7B]" />
              <h3 className="text-lg font-bold text-[#2D3E54]">Informations Générales</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Numéro de dossier</p>
                <p className="font-semibold text-[#435B7B]">{dossier.numDossier || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date de création</p>
                <p className="font-semibold text-[#435B7B]">{formatDate(dossier.dateDossier)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type de dossier</p>
                <p className="font-semibold text-[#435B7B]">{dossier.codeTypeDosAva || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Code agence</p>
                <p className="font-semibold text-[#435B7B]">{dossier.codeAgenceAva || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type pièce client</p>
                <p className="font-semibold text-[#435B7B]">{getTypePieceLabel(dossier.typePieceClient)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Numéro pièce (RNE)</p>
                <p className="font-semibold text-[#435B7B]">{dossier.noPieceClient || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Numéro de compte</p>
                <p className="font-semibold text-[#435B7B]">{dossier.numeroCompte || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Téléphone</p>
                <p className="font-semibold text-[#435B7B]">{dossier.tel || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Code activité</p>
                <p className="font-semibold text-[#435B7B]">{dossier.codeActivite || 'N/A'}</p>
              </div>
              {dossier.codeSousActivite && (
                <div>
                  <p className="text-sm text-gray-600">Code sous-activité</p>
                  <p className="font-semibold text-[#435B7B]">{dossier.codeSousActivite}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Déclaration fiscale</p>
                <p className="font-semibold text-[#435B7B]">{dossier.declarationFiscale || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-gradient-to-br from-[#D6E4F0] to-white rounded-lg border border-[#B8CFDF] p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-[#435B7B]" />
              <h3 className="text-lg font-bold text-[#2D3E54]">Détails des Montants (TND)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">Montant Avancé</p>
                <p className="text-xl font-bold text-green-800">{formatMontant(dossier.mntAvance)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">Montant Autorisé</p>
                <p className="text-xl font-bold text-blue-800">{formatMontant(dossier.mntAutorise)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-700 font-medium">Montant Utilisé</p>
                <p className="text-xl font-bold text-purple-800">{formatMontant(dossier.mntUtilise)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-700 font-medium">Montant Autorisé BCT</p>
                <p className="text-xl font-bold text-orange-800">{formatMontant(dossier.mntAutoriseBct)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium">Montant Réservé</p>
                <p className="text-xl font-bold text-gray-800">{formatMontant(dossier.mntReserve)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium">Montant Blocage</p>
                <p className="text-xl font-bold text-gray-800">{formatMontant(dossier.mntBlocage)}</p>
              </div>
              <div className="bg-[#435B7B]/10 border border-[#435B7B] rounded-lg p-3 md:col-span-2">
                <p className="text-sm text-[#435B7B] font-medium">Solde Final</p>
                <p className="text-2xl font-bold text-[#2D3E54]">{formatMontant(dossier.solde)}</p>
              </div>
            </div>
          </div>

          {/* Bénéficiaires */}
          {dossier.beneficiaires && dossier.beneficiaires.length > 0 && (
            <div className="bg-gradient-to-br from-[#D6E4F0] to-white rounded-lg border border-[#B8CFDF] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#435B7B]" />
                <h3 className="text-lg font-bold text-[#2D3E54]">
                  Bénéficiaires ({dossier.beneficiaires.length})
                </h3>
              </div>
              <div className="space-y-3">
                {dossier.beneficiaires.map((benef, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Nom</p>
                        <p className="font-semibold text-gray-800">{benef.nomBenef || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type pièce</p>
                        <p className="text-sm text-gray-700">{getTypePieceLabel(benef.typePieceBenef)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">N° pièce</p>
                        <p className="text-sm text-gray-700">{benef.noPieceBenef || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Qualité</p>
                        <p className="text-sm text-gray-700">{benef.qualite || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2 lg:col-span-4">
                        <p className="text-xs text-gray-500">Adresse</p>
                        <p className="text-sm text-gray-700">{benef.adresseBenef || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {dossier.documents && dossier.documents.length > 0 && (
            <div className="bg-gradient-to-br from-[#D6E4F0] to-white rounded-lg border border-[#B8CFDF] p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#435B7B]" />
                <h3 className="text-lg font-bold text-[#2D3E54]">
                  Documents Joints ({dossier.documents.length})
                </h3>
              </div>
              <div className="space-y-2">
                {dossier.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-[#435B7B]/10 rounded p-2">
                        <FileText className="w-4 h-4 text-[#435B7B]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{doc.nomImage || 'Document sans nom'}</p>
                        <p className="text-xs text-gray-500">Type: {doc.typeDocument || 'N/A'}</p>
                      </div>
                    </div>
                    {doc.cheminFichier && (
                      <p className="text-xs text-gray-400 max-w-xs truncate">{doc.cheminFichier}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marché AVA */}
          {dossier.avaMarche && (
            <div className="bg-gradient-to-br from-[#D6E4F0] to-white rounded-lg border border-[#B8CFDF] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-[#435B7B]" />
                <h3 className="text-lg font-bold text-[#2D3E54]">Informations du Marché AVA</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Numéro de marché</p>
                  <p className="font-semibold text-[#435B7B]">{dossier.avaMarche.numMarche || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Référence contrat</p>
                  <p className="font-semibold text-[#435B7B]">{dossier.avaMarche.refContrat || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date contrat</p>
                  <p className="font-semibold text-[#435B7B]">{formatDate(dossier.avaMarche.dateContrat)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contractant</p>
                  <p className="font-semibold text-[#435B7B]">{dossier.avaMarche.contractant || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant marché (TND)</p>
                  <p className="font-semibold text-[#435B7B]">{formatMontant(dossier.avaMarche.montantMarche)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Montant devise</p>
                  <p className="font-semibold text-[#435B7B]">{formatMontant(dossier.avaMarche.montantDevise)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Code devise</p>
                  <p className="font-semibold text-[#435B7B]">{dossier.avaMarche.codeDevise || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date fin</p>
                  <p className="font-semibold text-[#435B7B]">{formatDate(dossier.avaMarche.dateFin)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#435B7B] text-white rounded-lg hover:bg-[#2D3E54] transition-colors font-medium"
          >
            Fermer et Nouveau Dossier
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
