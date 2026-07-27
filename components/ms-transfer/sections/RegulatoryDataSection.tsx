import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { getActiveClientAuthorizations } from '../transfer.api';
import type { BctAuthorization, ClientData, RegulatoryData } from '../transfer.types';
import { FI, FR, SecTitle } from '../transfer.ui';

export function RegulatoryDataSection({
  client,
  value,
  onChange,
}: {
  client: ClientData | null;
  value: RegulatoryData;
  onChange: (value: RegulatoryData) => void;
}) {
  const [authorizations, setAuthorizations] = useState<BctAuthorization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!client) {
      setAuthorizations([]);
      return;
    }

    setLoading(true);
    setError('');
    getActiveClientAuthorizations(client.typePiece, client.noPiece)
      .then(items => {
        if (active) setAuthorizations(items);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Impossible de charger les autorisations BCT.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [client]);

  const selectedAuthorization = authorizations.find(
    authorization => authorization.id === value.selectedAuthorizationId,
  );

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Données règlementaires BCT</h2>
        <p className="text-sm text-[#7A90A4]">
          Renseignez le code nature de l’opération et sélectionnez une autorisation BCT active F1 ou F2 lorsque l’opération l’exige.
        </p>
      </div>

      {!client && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Identifiez d’abord le client pour charger ses autorisations BCT actives.
        </div>
      )}

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
        <SecTitle>Nature de l’opération et autorisation BCT</SecTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FI
            label="Code nature opération"
            value={value.codeNatureOperation}
            onChange={codeNatureOperation => onChange({ ...value, codeNatureOperation })}
            placeholder="Ex : 12"
            required
          />
          <FI
            label="Autorisation BCT requise"
            value={value.authorizationRequired ? 'oui' : 'non'}
            onChange={selection => onChange({
              ...value,
              authorizationRequired: selection === 'oui',
              selectedAuthorizationId: selection === 'oui' ? value.selectedAuthorizationId : '',
            })}
            select
            opts={[
              { value: 'non', label: 'Non' },
              { value: 'oui', label: 'Oui' },
            ]}
          />
          {value.authorizationRequired && (
            <FI
              label="Autorisation active du client"
              value={value.selectedAuthorizationId}
              onChange={selectedAuthorizationId => onChange({ ...value, selectedAuthorizationId })}
              select
              required
              disabled={!client || loading}
              opts={[
                { value: '', label: loading ? 'Chargement…' : 'Sélectionner une autorisation' },
                ...authorizations.map(authorization => ({
                  value: authorization.id,
                  label: `${authorization.reference} — ${authorization.type} — ${authorization.montantDisponible} ${authorization.devise}`,
                })),
              ]}
            />
          )}
        </div>

        {loading && (
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-[#435B7B]">
            <Loader2 size={13} className="animate-spin" />Chargement des autorisations actives…
          </div>
        )}

        {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      </div>

      {selectedAuthorization && (
        <div className="bg-white border border-green-300 rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #22C55E' }}>
          <div className="flex items-center justify-between mb-4">
            <SecTitle>Autorisation BCT sélectionnée</SecTitle>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 -mt-3">
              <CheckCircle2 size={12} />Active
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <FR label="Référence" value={selectedAuthorization.reference} mono />
            <FR label="Type" value={selectedAuthorization.type} />
            <FR label="Date émission" value={selectedAuthorization.dateEmission} />
            <FR label="Date validité" value={selectedAuthorization.dateValidite} />
            <FR label="Montant autorisé" value={`${selectedAuthorization.montantAutorise} ${selectedAuthorization.devise}`} />
            <FR label="Montant disponible" value={`${selectedAuthorization.montantDisponible} ${selectedAuthorization.devise}`} />
            <div className="lg:col-span-2"><FR label="Objet" value={selectedAuthorization.objet} /></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-green-800">
            <ShieldCheck size={14} />Cette autorisation sera transmise dans le dossier MS-TR.
          </div>
        </div>
      )}
    </div>
  );
}
