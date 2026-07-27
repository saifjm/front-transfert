import React, { useState } from 'react';
import { CheckCircle2, Loader2, Search, ShieldCheck, XCircle } from 'lucide-react';
import { getClientCompteCom, getUserAgencies } from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type { AgencyInfo, ClientData, CustomerIdType } from '../transfer.types';
import { FI, FR, HDR, SecTitle } from '../transfer.ui';

export function ClientSection({
  client,
  commissionAccount,
  onClientLoaded,
  onCommissionAccountChange,
}: {
  client: ClientData | null;
  commissionAccount: string;
  onClientLoaded: (client: ClientData) => void;
  onCommissionAccountChange: (account: string) => void;
}) {
  const [typePiece, setTypePiece] = useState<CustomerIdType>('MF');
  const [noPiece, setNoPiece] = useState('');
  const [agencies, setAgencies] = useState<AgencyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!noPiece.trim()) {
      setError('Veuillez saisir le numéro de pièce.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userAgencies = await getUserAgencies(typePiece, noPiece.trim());
      const foundClient = await getClientCompteCom(typePiece, noPiece.trim(), userAgencies);
      setAgencies(userAgencies);
      onClientLoaded(foundClient);
    } catch (reason) {
      setError(getUserMessage(reason, 'La recherche du client n’a pas pu aboutir. Réessayez ultérieurement.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Identification du client donneur d’ordre</h2>
        <p className="text-sm text-[#7A90A4]">
          Vos agences habilitées sont déterminées automatiquement. Saisissez l’identifiant du client pour afficher sa fiche et ses comptes éligibles.
        </p>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
        <SecTitle>Recherche du client</SecTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <FI
            label="Type de pièce"
            value={typePiece}
            onChange={value => setTypePiece(value as CustomerIdType)}
            select
            opts={[
              { value: 'CIN', label: 'CIN' },
              { value: 'PASSPORT', label: 'Passeport' },
              { value: 'MF', label: 'Matricule fiscal' },
              { value: 'RC', label: 'Registre de commerce' },
            ]}
          />
          <FI
            label="Numéro de pièce"
            value={noPiece}
            onChange={setNoPiece}
            placeholder="Ex : 12345678"
            required
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={search}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={HDR}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Recherche…</> : <><Search size={14} />Rechercher client</>}
            </button>
          </div>
        </div>

        {agencies.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[#F4F8FC] border border-[#d1dce6] text-xs text-[#435B7B]">
            Agences habilitées : <strong>{agencies.map(agency => agency.label).join(', ')}</strong>.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <p className="text-xs text-[#7A90A4] mt-2">
          Démonstration : <span className="font-mono font-bold">12345678</span> pour un client non totalement exportateur, <span className="font-mono font-bold">1234</span> pour un client totalement exportateur.
        </p>
      </div>

      {client && (
        <>
          <div className="bg-white border border-green-300 rounded-2xl shadow-sm p-5 anim-fade-in-up delay-100" style={{ borderTop: '3px solid #22C55E' }}>
            <div className="flex items-center justify-between mb-4">
              <SecTitle>Informations client vérifiées</SecTitle>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 -mt-3">
                <CheckCircle2 size={12} />Client vérifié
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <FR label="Référence client" value={client.idClient} />
              <FR label="Numéro de pièce" value={client.noPiece} mono />
              <FR label="Type client" value={client.typeClient} />
              <FR label="Résident" value={client.resident ? 'Oui' : 'Non'} />
              <div className="lg:col-span-2"><FR label="Nom / Raison sociale" value={client.nomRaison} /></div>
              <FR label="Pays de résidence" value={`${client.codePays} — ${client.pays}`} />
              <FR label="Ville" value={client.ville} />
              <FR label="Agence de rattachement" value={client.agence} />
              <FR label="Statut exportateur" value={client.totalementExportatrice ? 'Totalement exportatrice' : 'Non totalement exportatrice'} />
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500" />Statut : {client.statut}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#F4F8FC] text-[#435B7B]">
                <ShieldCheck size={11} />Risque : {client.niveauRisque}
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm overflow-hidden anim-fade-in-up delay-200">
            <div className="p-5 pb-3">
              <SecTitle>Compte commission — comptes TND et comptes principaux actifs</SecTitle>
              <p className="text-xs text-[#7A90A4] -mt-1">
                Seuls les comptes actifs et éligibles sont proposés.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F4F8FC' }}>
                    {['Numéro compte', 'Devise', 'Type', 'Principal', 'Statut', 'Solde disponible', 'Compte commission'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-[#435B7B] uppercase tracking-wide whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {client.comptes.map(account => (
                    <tr
                      key={account.numero}
                      onClick={() => account.eligibleCommission && onCommissionAccountChange(account.numero)}
                      className={`border-t border-[#EEF3F7] transition-all ${
                        account.eligibleCommission ? 'cursor-pointer hover:bg-[#EEF3F7]/50' : 'opacity-60'
                      } ${commissionAccount === account.numero ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#2D3E54]">{account.numero}</td>
                      <td className="px-4 py-3 font-bold text-[#435B7B]">{account.devise}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7A8D]">{account.type}</td>
                      <td className="px-4 py-3 text-xs">{account.principal ? 'Oui' : 'Non'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700">{account.statut}</span></td>
                      <td className="px-4 py-3 font-semibold text-[#2D3E54] whitespace-nowrap">{account.solde} {account.devise}</td>
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          checked={commissionAccount === account.numero}
                          onChange={() => onCommissionAccountChange(account.numero)}
                          disabled={!account.eligibleCommission}
                          className="w-4 h-4 accent-[#435B7B]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
