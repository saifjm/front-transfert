import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { verifyTce } from '../transfer.api';
import { getUserMessage } from '../transfer.errors';
import type {
  ClientData,
  RegulatorySupportData,
  SupportType,
  TransferOrder,
  TransferType,
} from '../transfer.types';
import { FI, FR, HDR, SecTitle } from '../transfer.ui';
import { resolveSupportRule } from '../transfer.utils';

export function RegulatorySupportSection({
  transferType,
  client,
  order,
  value,
  onChange,
}: {
  transferType: TransferType | null;
  client: ClientData | null;
  order: TransferOrder;
  value: RegulatorySupportData;
  onChange: (value: RegulatorySupportData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const rule = resolveSupportRule(transferType, client);

  useEffect(() => {
    if (rule === 'FI' && value.type !== 'FI') {
      onChange({
        ...value,
        type: 'FI',
        ficheInformation: {
          ...value.ficheInformation,
          objet: value.ficheInformation.objet || order.motifPaiement,
          montant: value.ficheInformation.montant || order.montantOrdre,
          devise: order.deviseOrdre,
        },
        tceResult: null,
      });
    }
    if (rule === 'TCE' && value.type !== 'TCE') {
      onChange({ ...value, type: 'TCE' });
    }
  }, [rule, order.deviseOrdre, order.montantOrdre, order.motifPaiement]);

  const selectType = (type: SupportType) => {
    onChange({
      ...value,
      type,
      tceResult: type === 'TCE' ? value.tceResult : null,
      ficheInformation: {
        ...value.ficheInformation,
        objet: value.ficheInformation.objet || order.motifPaiement,
        montant: value.ficheInformation.montant || order.montantOrdre,
        devise: order.deviseOrdre,
      },
    });
  };

  const runTceVerification = async () => {
    if (!client) {
      setError('Le client doit être identifié avant la vérification du TCE.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tceResult = await verifyTce(value.tceSearch, client);
      onChange({ ...value, tceResult });
    } catch (reason) {
      setError(getUserMessage(reason, 'La vérification du TCE n’a pas pu aboutir. Réessayez ultérieurement.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Support règlementaire</h2>
        <p className="text-sm text-[#7A90A4]">
          Le support est déterminé par le type de transfert et, pour un transfert commercial, par le statut totalement exportateur du client.
        </p>
      </div>

      {!transferType || !client ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Sélectionnez le type de transfert et identifiez le client pour déterminer le support applicable.</p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            {rule === 'FI' && <p><strong>Transfert financier :</strong> la fiche d’information (FI) est le support règlementaire.</p>}
            {rule === 'TCE' && <p><strong>Transfert commercial — client non totalement exportateur :</strong> le TCE est obligatoire.</p>}
            {rule === 'CHOICE' && <p><strong>Transfert commercial — client totalement exportateur :</strong> choisissez TCE ou FI.</p>}
          </div>
        </div>
      )}

      {rule === 'CHOICE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { type: 'TCE' as const, title: 'Titre de commerce extérieur', icon: FileText, color: '#0D9488' },
            { type: 'FI' as const, title: "Fiche d'information", icon: ClipboardList, color: '#7C3AED' },
          ].map(item => {
            const Icon = item.icon;
            const selected = value.type === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => selectType(item.type)}
                className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 text-left shadow-sm transition-all"
                style={{ borderColor: selected ? item.color : '#d1dce6' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                  <Icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2D3E54]">{item.title}</p>
                  <p className="text-xs text-[#7A90A4] mt-1">{selected ? 'Support sélectionné' : 'Sélectionner ce support'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {value.type === 'FI' && (
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
          <SecTitle>Fiche d’information</SecTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FI
              label="Numéro FI"
              value={value.ficheInformation.numero}
              onChange={numero => onChange({ ...value, ficheInformation: { ...value.ficheInformation, numero } })}
              required
              placeholder="FI-2026-000099"
            />
            <FI
              label="Date FI"
              value={value.ficheInformation.date}
              onChange={date => onChange({ ...value, ficheInformation: { ...value.ficheInformation, date } })}
              type="date"
              required
            />
            <FI label="Devise" value={value.ficheInformation.devise} disabled />
            <FI
              label="Objet déclaré"
              value={value.ficheInformation.objet}
              onChange={objet => onChange({ ...value, ficheInformation: { ...value.ficheInformation, objet } })}
              required
            />
            <FI
              label="Montant déclaré"
              value={value.ficheInformation.montant}
              onChange={montant => onChange({ ...value, ficheInformation: { ...value.ficheInformation, montant } })}
            />
            <div className="md:col-span-3">
              <FI
                label="Commentaire règlementaire"
                value={value.ficheInformation.commentaire}
                onChange={commentaire => onChange({ ...value, ficheInformation: { ...value.ficheInformation, commentaire } })}
                multiline
              />
            </div>
          </div>
          {value.ficheInformation.numero && value.ficheInformation.date && value.ficheInformation.objet && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-800">
              <CheckCircle2 size={14} />Fiche d’information complète
            </div>
          )}
        </div>
      )}

      {value.type === 'TCE' && (
        <>
          <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #0D9488' }}>
            <SecTitle>Consultation du titre de commerce extérieur</SecTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FI
                label="Code titre"
                value={value.tceSearch.codeTitre}
                onChange={codeTitre => onChange({ ...value, tceSearch: { ...value.tceSearch, codeTitre }, tceResult: null })}
                required
              />
              <FI
                label="Numéro de domiciliation"
                value={value.tceSearch.numDomi}
                onChange={numDomi => onChange({ ...value, tceSearch: { ...value.tceSearch, numDomi }, tceResult: null })}
                required
                placeholder="DOM-2026-0001"
              />
              <FI
                label="Date de domiciliation"
                value={value.tceSearch.dateDomi}
                onChange={dateDomi => onChange({ ...value, tceSearch: { ...value.tceSearch, dateDomi }, tceResult: null })}
                type="date"
                required
              />
            </div>
            <button
              type="button"
              onClick={runTceVerification}
              disabled={loading}
              className="inline-flex items-center gap-2 py-2 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={HDR}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Vérifier le TCE
            </button>
            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
          </div>

          {value.tceResult && (
            <div
              className="bg-white rounded-2xl shadow-sm p-5 border"
              style={{
                borderTop: `3px solid ${value.tceResult.state === 'success' ? '#22C55E' : '#EF4444'}`,
                borderColor: value.tceResult.state === 'success' ? '#BBF7D0' : '#FECACA',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                {value.tceResult.state === 'success'
                  ? <CheckCircle2 size={18} className="text-green-600" />
                  : <XCircle size={18} className="text-red-600" />}
                <span className={`text-sm font-bold ${value.tceResult.state === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {value.tceResult.state === 'success' ? 'TCE valide — consultation réussie' : 'Vérification impossible'}
                </span>
              </div>
              {value.tceResult.state === 'success' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <FR label="Code titre" value={value.tceResult.codeTitre} />
                  <FR label="Numéro domiciliation" value={value.tceResult.numDomi} mono />
                  <FR label="Date domiciliation" value={value.tceResult.dateDomi} />
                  <FR label="Devise" value={value.tceResult.devise} />
                  <FR label="Montant disponible" value={`${value.tceResult.montantDispo} ${value.tceResult.devise}`} />
                  <FR label="Appartient au client" value={value.tceResult.appartient ? 'Oui' : 'Non'} />
                </div>
              ) : (
                <p className="text-sm text-red-700">{value.tceResult.libelleErreur}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
