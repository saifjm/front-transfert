import React, { useState } from 'react';
import {
  Send, ArrowLeft, ArrowRight, Search, CheckCircle2, AlertTriangle, XCircle,
  Building2, FileText, Banknote, ShieldCheck, ClipboardList, ChevronRight,
  Info, Plus, Trash2, RefreshCw, Download, Eye,
  TrendingUp, Clock, Check, Loader2, Globe2, Zap
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
type TransferType = 'commercial' | 'financier';
type WorkspaceView = 'consultation' | 'creation';
type RegulatoryType = 'autorisation_bct' | 'fiche_information' | 'autre_support' | null;

interface ClientData {
  idClient: string; noPiece: string; typePiece: string;
  nomRaison: string; typeClient: string; residence: string;
  pays: string; agence: string; statut: 'ACTIF' | 'SUSPENDU' | 'CLOTURE';
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE'; comptes: AccountRow[];
}
interface AccountRow { numero: string; devise: string; type: string; statut: string; solde: string; }
interface TCEResult {
  state: 'success' | 'warning' | 'error'; codeTitre: string; numDomi: string;
  dateDomi: string; devise: string; montantDispo: string; appartient: boolean;
  typeEchec?: string; codeErreur?: string; libelleErreur?: string;
}
interface Modality {
  id: string; type: string; pourcentage: number; montantCouvert: string;
  devise: string; compte: string; deviseCompte: string; montantDebit: string;
  changeRequis: boolean; cours?: string; refDeal?: string; blocage: boolean;
}
interface TransferOrder {
  montantOrdre: string; deviseOrdre: string; montantTransfert: string; deviseTransfert: string;
  dateValeur: string; coursConversion: string; contreValeurTnd: string; prioriteSwift: string;
  serviceLevel: string; purposeCode: string; motifEconomique: string; refFacture: string;
  chargeBearer: string; compteCommission: string; nomBenef: string; typeBenef: string;
  paysBenef: string; residenceBenef: string; iban: string; bic: string;
  nomBanque: string; paysBanque: string;
}

/* ─── Mock Data ──────────────────────────────────────────── */
const MOCK_CLIENT: ClientData = {
  idClient: '1001', noPiece: '12345678', typePiece: 'CIN',
  nomRaison: 'SOCIETE IMPORTATRICE TUNISIENNE', typeClient: 'PERSONNE MORALE',
  residence: 'Résident', pays: 'Tunisie', agence: 'Agence Tunis Centre — BCT-10',
  statut: 'ACTIF', niveauRisque: 'FAIBLE',
  comptes: [
    { numero: '01001000000000123456', devise: 'TND', type: 'Courant', statut: 'Actif', solde: '245,000.000' },
    { numero: '01001000000000999999', devise: 'EUR', type: 'Devises', statut: 'Actif', solde: '32,500.000' },
    { numero: '01001000000000777777', devise: 'USD', type: 'Devises', statut: 'Actif', solde: '8,200.000' },
  ],
};
const MOCK_TCE: TCEResult = {
  state: 'success', codeTitre: '31', numDomi: 'DOM-2026-0001',
  dateDomi: '30/06/2026', devise: 'EUR', montantDispo: '50,000.000', appartient: true,
};
const INITIAL_ORDER: TransferOrder = {
  montantOrdre: '20000', deviseOrdre: 'EUR', montantTransfert: '20000', deviseTransfert: 'EUR',
  dateValeur: '2026-06-30', coursConversion: '3.35000000', contreValeurTnd: '67,000.000',
  prioriteSwift: 'NORM', serviceLevel: 'SEPA', purposeCode: 'GDDS',
  motifEconomique: 'Import marchandises', refFacture: 'FACT-2026-00123',
  chargeBearer: 'SHAR', compteCommission: '01001000000000123456',
  nomBenef: 'EUROPE SUPPLIER GMBH', typeBenef: 'PERSONNE MORALE',
  paysBenef: 'Allemagne', residenceBenef: 'Non-résident',
  iban: 'DE89370400440532013000', bic: 'DEUTDEFFXXX',
  nomBanque: 'DEUTSCHE BANK AG', paysBanque: 'Allemagne',
};
const RECENT_TRANSFERS = [
  { ref: 'TR-2026-000023', type: 'commercial', client: 'MECANIQUE TUNISIENNE SA', montant: '45,000.000', devise: 'EUR', support: 'TCE DOM-2026-0023', statut: 'en_cours_agence', etape: 'Saisie opérateur', maj: '13/07/2026 09:41' },
  { ref: 'TR-2026-000022', type: 'financier', client: 'BEN ALI KARIM', montant: '8,500.000', devise: 'USD', support: 'Auth BCT 2026/447', statut: 'attente_sc', etape: 'Validation services centraux', maj: '12/07/2026 15:20' },
  { ref: 'TR-2026-000021', type: 'commercial', client: 'AGROTECH IMPORT SARL', montant: '120,000.000', devise: 'EUR', support: 'TCE DOM-2026-0019', statut: 'valide', etape: 'Exécution SWIFT', maj: '11/07/2026 11:05' },
  { ref: 'TR-2026-000020', type: 'financier', client: 'TRABELSI INES', montant: '2,000.000', devise: 'EUR', support: 'Fiche info FI-2026-099', statut: 'rejete', etape: 'Rejeté — motif réglementaire', maj: '10/07/2026 14:32' },
  { ref: 'TR-2026-000019', type: 'commercial', client: 'TEXTILES SFAX EXPORT', montant: '88,000.000', devise: 'GBP', support: 'TCE DOM-2026-0015', statut: 'brouillon', etape: 'Non soumis', maj: '09/07/2026 10:17' },
];
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  brouillon: { label: 'Brouillon', bg: '#F8F9FA', text: '#6B7280', dot: '#9CA3AF' },
  en_cours_agence: { label: 'En cours agence', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  attente_sc: { label: 'En attente SC', bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  attente_bo: { label: 'En attente BO', bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  valide: { label: 'Validé', bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  rejete: { label: 'Rejeté', bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  annule: { label: 'Annulé', bg: '#F9FAFB', text: '#374151', dot: '#6B7280' },
};

/* ─── Shared primitives ──────────────────────────────────── */
const HDR = { background: 'linear-gradient(135deg, #6B8CAE, #435B7B)' };

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}
function TypeBadge({ type }: { type: string }) {
  return type === 'commercial'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#EFF6FF', color: '#1D4ED8' }}><TrendingUp size={10} />Commercial</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#F5F3FF', color: '#7C3AED' }}><Banknote size={10} />Financier</span>;
}
function SecTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold text-[#435B7B] uppercase tracking-wide mb-3 pb-2 border-b border-[#EEF3F7]">{children}</h3>;
}
function FR({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#7A90A4] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-[#2D3E54] ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  );
}
function FI({ label, value, onChange, type = 'text', placeholder = '', required, disabled, select, opts }: {
  label: string; value: string; onChange?: (v: string) => void; type?: string;
  placeholder?: string; required?: boolean; disabled?: boolean; select?: boolean;
  opts?: { value: string; label: string }[];
}) {
  const base = "w-full px-3 py-2 text-sm rounded-lg border border-[#d1dce6] focus:outline-none focus:ring-2 focus:ring-[#435B7B]/30 focus:border-[#435B7B] text-[#2D3E54] transition-all";
  const ro = disabled ? "bg-[#F4F8FC] text-[#6B7A8D] cursor-not-allowed" : "bg-white";
  return (
    <div>
      <label className="block text-xs font-medium text-[#435B7B] mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {select
        ? <select className={`${base} ${ro}`} value={value} onChange={e => onChange?.(e.target.value)} disabled={disabled}>
            {opts?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        : <input type={type} className={`${base} ${ro}`} value={value}
            onChange={e => onChange?.(e.target.value)} placeholder={placeholder} readOnly={disabled} />}
    </div>
  );
}
function KPI({ label, value, color, icon: Icon }: { label: string; value: React.ReactNode; color: string; icon: React.ElementType }) {
  return (
    <div className="bg-white border border-[#d1dce6] rounded-2xl p-5 shadow-sm card-lift" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#7A90A4] font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 0: Type selection ─────────────────────────────── */
function StepType({ onSelect }: { onSelect: (t: TransferType) => void }) {
  return (
    <div className="space-y-6 anim-fade-in-up">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#2D3E54] mb-2">Choix du type de transfert</h2>
        <p className="text-sm text-[#7A90A4]">Sélectionnez le type de transfert à initier. Cette sélection détermine le parcours réglementaire applicable.</p>
      </div>
      <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto">
        {[
          {
            type: 'commercial' as TransferType, color: '#1D4ED8', bg: '#EFF6FF',
            icon: FileText, title: 'Transfert commercial', badge: 'TCE',
            desc: "Transfert lié à une opération commerciale, généralement adossé à un titre de domiciliation import (TCE) géré par MS-DOMI.",
            points: ['TCE import généralement obligatoire', 'Vérification via MS-DOMI', 'Réservation TCE par MS-TR', 'Règlement effectif ultérieur'],
            cta: 'Choisir transfert commercial', grad: HDR,
          },
          {
            type: 'financier' as TransferType, color: '#7C3AED', bg: '#F5F3FF',
            icon: Banknote, title: 'Transfert financier', badge: 'BCT',
            desc: "Transfert non commercial traité selon la nature financière, l'objet économique et les supports réglementaires requis par la BCT.",
            points: ['Pas de TCE par défaut', 'Autorisation BCT possible', "Fiche d'information possible", 'Contrôle BCT selon nature opération'],
            cta: 'Choisir transfert financier', grad: { background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
          },
        ].map(c => (
          <button key={c.type} onClick={() => onSelect(c.type)}
            className="group text-left bg-white border-2 border-[#d1dce6] rounded-2xl p-7 shadow-sm hover:shadow-xl transition-all duration-300 card-lift"
            style={{ '--hover-border': c.color } as React.CSSProperties}
            onMouseEnter={e => (e.currentTarget.style.borderColor = c.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#d1dce6')}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={c.grad}>
              <c.icon size={26} className="text-white" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-[#2D3E54]">{c.title}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: c.bg, color: c.color }}>{c.badge}</span>
            </div>
            <p className="text-sm text-[#7A90A4] mb-5 leading-relaxed">{c.desc}</p>
            <ul className="space-y-2 mb-6">
              {c.points.map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-[#6B7A8D]">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                    <Check size={10} style={{ color: c.color }} />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
            <div className="w-full py-3 rounded-xl text-sm font-semibold text-white text-center" style={c.grad}>{c.cta}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 1: Client ─────────────────────────────────────── */
function StepClient({ client, setClient, selAcc, setSelAcc }: {
  client: ClientData | null; setClient: (c: ClientData | null) => void;
  selAcc: string; setSelAcc: (a: string) => void;
}) {
  const [typePiece, setTypePiece] = useState('MF');
  const [noPiece, setNoPiece] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const search = () => {
    if (!noPiece.trim()) { setErr('Veuillez saisir le numéro de pièce.'); return; }
    setErr(''); setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (['12345678', '1234'].includes(noPiece)) { setClient(MOCK_CLIENT); setSelAcc(MOCK_CLIENT.comptes[0].numero); }
      else { setErr('Client introuvable ou non autorisé pour cette opération.'); setClient(null); }
    }, 1200);
  };

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Identification du client donneur d'ordre</h2>
        <p className="text-sm text-[#7A90A4]">Renseignez l'identifiant du client pour récupérer ses informations depuis MS-REF.</p>
      </div>
      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
        <SecTitle>Recherche client — MS-REF</SecTitle>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <FI label="Type de pièce" value={typePiece} onChange={setTypePiece} select
            opts={[{ value: 'CIN', label: 'CIN' }, { value: 'PASSPORT', label: 'Passeport' }, { value: 'MF', label: 'Matricule fiscal' }, { value: 'RC', label: 'Registre de commerce' }]} />
          <FI label="Numéro de pièce (NO_PIECE_CLIENT)" value={noPiece} onChange={setNoPiece} placeholder="Ex: 12345678" required />
          <div className="flex items-end">
            <button onClick={search} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60" style={HDR}>
              {loading ? <><Loader2 size={14} className="animate-spin" />Recherche…</> : <><Search size={14} />Rechercher client</>}
            </button>
          </div>
        </div>
        {err && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"><XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700">{err}</p></div>}
        <p className="text-xs text-[#7A90A4] mt-2">Essai: saisir <span className="font-mono font-bold">12345678</span> pour charger un client de démonstration.</p>
      </div>

      {client && (
        <>
          <div className="bg-white border border-green-300 rounded-2xl shadow-sm p-5 anim-fade-in-up delay-100" style={{ borderTop: '3px solid #22C55E' }}>
            <div className="flex items-center justify-between mb-4">
              <SecTitle>Informations client vérifiées</SecTitle>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 -mt-3">
                <CheckCircle2 size={12} />Client vérifié — MS-REF
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <FR label="Identifiant client" value={client.idClient} />
              <FR label="Numéro de pièce" value={client.noPiece} mono />
              <FR label="Type client" value={client.typeClient} />
              <FR label="Résidence" value={client.residence} />
              <div className="col-span-2"><FR label="Nom / Raison sociale" value={client.nomRaison} /></div>
              <FR label="Pays" value={client.pays} />
              <FR label="Agence" value={client.agence} />
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700"><span className="w-2 h-2 rounded-full bg-green-500" />Statut: {client.statut}</span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#F4F8FC] text-[#435B7B]"><ShieldCheck size={11} />Risque: {client.niveauRisque}</span>
            </div>
          </div>
          <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm overflow-hidden anim-fade-in-up delay-200">
            <div className="p-5 pb-3"><SecTitle>Comptes disponibles — sélectionnez le compte donneur d'ordre</SecTitle></div>
            <table className="w-full text-sm">
              <thead><tr style={{ background: '#F4F8FC' }}>
                {['Numéro compte', 'Devise', 'Type', 'Statut', 'Solde disponible', 'Sélectionner'].map(h =>
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#435B7B] uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody>
                {client.comptes.map(acc => (
                  <tr key={acc.numero} onClick={() => setSelAcc(acc.numero)} className={`border-t border-[#EEF3F7] cursor-pointer transition-all ${selAcc === acc.numero ? 'bg-blue-50' : 'hover:bg-[#EEF3F7]/50'}`}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#2D3E54]">{acc.numero}</td>
                    <td className="px-4 py-3 font-bold text-[#435B7B]">{acc.devise}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A8D]">{acc.type}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700">{acc.statut}</span></td>
                    <td className="px-4 py-3 font-semibold text-[#2D3E54]">{acc.solde} {acc.devise}</td>
                    <td className="px-4 py-3"><input type="radio" checked={selAcc === acc.numero} onChange={() => setSelAcc(acc.numero)} className="w-4 h-4 accent-[#435B7B]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Step 2A: TCE Verification ──────────────────────────── */
function StepTCE({ tceResult, setTceResult }: { tceResult: TCEResult | null; setTceResult: (r: TCEResult) => void }) {
  const [codeTitre, setCodeTitre] = useState('31');
  const [numDomi, setNumDomi] = useState('DOM-2026-0001');
  const [dateDomi, setDateDomi] = useState('2026-06-30');
  const [loading, setLoading] = useState(false);

  const verify = (simulateError?: boolean) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (simulateError) {
        setTceResult({ state: 'error', codeTitre, numDomi, dateDomi, devise: 'EUR', montantDispo: '0.000', appartient: false, typeEchec: 'Bloquante', codeErreur: 'TCE_NOT_OWNER', libelleErreur: "Le titre de domiciliation n'appartient pas au client donneur d'ordre." });
      } else {
        setTceResult(MOCK_TCE);
      }
    }, 1400);
  };

  const stateColor = tceResult?.state === 'success' ? '#22C55E' : tceResult?.state === 'warning' ? '#F97316' : '#EF4444';

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Vérification du TCE import</h2>
        <p className="text-sm text-[#7A90A4]">Consultez le titre de domiciliation via MS-DOMI avant de soumettre l'ordre.</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Pré-contrôle uniquement.</strong> La réservation effective du TCE sera effectuée par MS-TR via MS-DOMI <span className="font-mono text-xs bg-amber-100 px-1 rounded">/reservation</span> lors de la soumission finale.
        </p>
      </div>
      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
        <SecTitle>Paramètres de vérification — MS-DOMI</SecTitle>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FI label="Code titre" value={codeTitre} onChange={setCodeTitre} required placeholder="Ex: 31" />
          <FI label="Numéro de domiciliation" value={numDomi} onChange={setNumDomi} required placeholder="Ex: DOM-2026-0001" />
          <FI label="Date de domiciliation" value={dateDomi} onChange={setDateDomi} type="date" required />
          <FI label="Identifiant client (auto)" value="1001" disabled />
        </div>
        <div className="flex gap-3">
          <button onClick={() => verify()} disabled={loading}
            className="flex items-center gap-2 py-2 px-5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60" style={HDR}>
            {loading ? <><Loader2 size={14} className="animate-spin" />Vérification…</> : <><Search size={14} />Vérifier TCE</>}
          </button>
          <button onClick={() => verify(true)} disabled={loading}
            className="flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-60">
            Simuler erreur TCE
          </button>
        </div>
      </div>
      {tceResult && (
        <div className={`bg-white rounded-2xl shadow-sm p-5 anim-fade-in-up border`}
          style={{ borderTop: `3px solid ${stateColor}`, borderColor: `${stateColor}40` }}>
          <div className="flex items-center gap-2 mb-4">
            {tceResult.state === 'success' ? <CheckCircle2 size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-600" />}
            <span className="text-sm font-bold" style={{ color: stateColor }}>
              {tceResult.state === 'success' ? 'TCE valide — Consultation réussie' : `Erreur bloquante — ${tceResult.codeErreur}`}
            </span>
          </div>
          {tceResult.state === 'success' ? (
            <div className="grid grid-cols-3 gap-4">
              <FR label="Code titre" value={tceResult.codeTitre} />
              <FR label="Numéro domiciliation" value={tceResult.numDomi} mono />
              <FR label="Date domiciliation" value={tceResult.dateDomi} />
              <FR label="Devise" value={tceResult.devise} />
              <FR label="Montant disponible" value={`${tceResult.montantDispo} ${tceResult.devise}`} />
              <FR label="Appartient au client" value={tceResult.appartient ? '✓ Oui' : '✗ Non'} />
            </div>
          ) : (
            <div className="space-y-3">
              <FR label="Type d'échec" value={tceResult.typeEchec} />
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-sm text-red-700">{tceResult.libelleErreur}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Step 2B: Regulatory Support ───────────────────────── */
function StepRegSupport({ regType, setRegType }: { regType: RegulatoryType; setRegType: (t: RegulatoryType) => void }) {
  const [codeNature, setCodeNature] = useState('12');
  const [objet, setObjet] = useState('Frais de scolarité');
  const [supportRequis, setSupportRequis] = useState('oui');
  const [numAuth, setNumAuth] = useState('BCT-2026/447');
  const [dateAuth, setDateAuth] = useState('2026-03-15');
  const [montantAuth, setMontantAuth] = useState('10000');

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Support réglementaire du transfert financier</h2>
        <p className="text-sm text-[#7A90A4]">Renseignez la nature de l'opération et le support réglementaire requis.</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">Un transfert financier n'est pas adossé à un TCE par défaut. Selon la nature de l'opération, une autorisation BCT, une fiche d'information ou un autre support réglementaire peut être requis.</p>
      </div>
      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
        <SecTitle>Nature de l'opération</SecTitle>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <FI label="Code nature opération" value={codeNature} onChange={setCodeNature} required placeholder="Ex: 12" />
          <FI label="Code recette / dépense" value="DEP" onChange={() => {}} select opts={[{ value: 'DEP', label: 'Dépense' }, { value: 'REC', label: 'Recette' }]} />
          <FI label="Pays bénéficiaire" value="Allemagne" onChange={() => {}} required />
          <FI label="Devise" value="EUR" onChange={() => {}} required />
          <div className="col-span-2"><FI label="Objet économique" value={objet} onChange={setObjet} required placeholder="Ex: Frais de scolarité, dividendes…" /></div>
          <FI label="Support réglementaire requis" value={supportRequis} onChange={setSupportRequis} select opts={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]} />
        </div>
        {supportRequis === 'oui' && (
          <div className="border-t border-[#EEF3F7] pt-4 space-y-4">
            <p className="text-xs font-bold text-[#435B7B] uppercase tracking-wide">Type de support réglementaire</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'autorisation_bct', label: 'Autorisation BCT', icon: ShieldCheck, color: '#435B7B' },
                { val: 'fiche_information', label: "Fiche d'information", icon: FileText, color: '#0D9488' },
                { val: 'autre_support', label: 'Autre support', icon: ClipboardList, color: '#7C3AED' },
              ].map(s => (
                <button key={s.val} onClick={() => setRegType(s.val as RegulatoryType)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all"
                  style={regType === s.val ? { borderColor: s.color, background: `${s.color}08` } : { borderColor: '#d1dce6' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <span className="text-xs font-semibold text-[#2D3E54]">{s.label}</span>
                </button>
              ))}
            </div>
            {regType === 'autorisation_bct' && (
              <div className="grid grid-cols-3 gap-4 anim-fade-in-up">
                <FI label="Numéro autorisation BCT" value={numAuth} onChange={setNumAuth} required />
                <FI label="Date autorisation BCT" value={dateAuth} onChange={setDateAuth} type="date" required />
                <FI label="Autorité émettrice" value="Banque Centrale de Tunisie" disabled />
                <FI label="Montant autorisé" value={montantAuth} onChange={setMontantAuth} required />
                <FI label="Devise" value="EUR" disabled />
                <FI label="Date de validité" value="2026-12-31" onChange={() => {}} type="date" required />
              </div>
            )}
            {regType === 'fiche_information' && (
              <div className="grid grid-cols-3 gap-4 anim-fade-in-up">
                <FI label="Numéro fiche" value="FI-2026-099" onChange={() => {}} required />
                <FI label="Date fiche" value="2026-04-10" onChange={() => {}} type="date" required />
                <FI label="Objet déclaré" value={objet} onChange={setObjet} />
                <FI label="Montant déclaré" value={montantAuth} onChange={setMontantAuth} />
                <FI label="Devise" value="EUR" disabled />
                <FI label="Commentaire réglementaire" value="" onChange={() => {}} placeholder="Optionnel" />
              </div>
            )}
            {regType === 'autre_support' && (
              <div className="grid grid-cols-3 gap-4 anim-fade-in-up">
                <FI label="Type de support" value="" onChange={() => {}} required placeholder="Ex: Décision ministérielle" />
                <FI label="Numéro support" value="" onChange={() => {}} required />
                <FI label="Date support" value="" onChange={() => {}} type="date" required />
                <div className="col-span-3"><FI label="Commentaire" value="" onChange={() => {}} placeholder="Description du support réglementaire" /></div>
              </div>
            )}
            {regType && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-xs font-semibold text-green-800">Support réglementaire complet</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3: Transfer Order ─────────────────────────────── */
function StepOrder({ order, setOrder }: { order: TransferOrder; setOrder: (o: TransferOrder) => void }) {
  const up = (k: keyof TransferOrder, v: string) => setOrder({ ...order, [k]: v });
  const calcCV = () => {
    const amt = parseFloat(order.montantTransfert) || 0;
    const cours = parseFloat(order.coursConversion) || 0;
    setOrder({ ...order, contreValeurTnd: (amt * cours).toLocaleString('fr-TN', { minimumFractionDigits: 3 }) });
  };

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Données de l'ordre de transfert</h2>
        <p className="text-sm text-[#7A90A4]">Renseignez les montants, la date valeur, l'instruction ISO 20022 et les données du bénéficiaire.</p>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
        <SecTitle>Montants & change</SecTitle>
        <div className="grid grid-cols-4 gap-4 mb-3">
          <FI label="Montant de l'ordre" value={order.montantOrdre} onChange={v => up('montantOrdre', v)} required placeholder="20000.000" />
          <FI label="Devise ordre" value={order.deviseOrdre} onChange={v => up('deviseOrdre', v)} select opts={['EUR', 'USD', 'GBP', 'CHF'].map(d => ({ value: d, label: d }))} />
          <FI label="Montant transfert" value={order.montantTransfert} onChange={v => up('montantTransfert', v)} required />
          <FI label="Devise transfert" value={order.deviseTransfert} onChange={v => up('deviseTransfert', v)} select opts={['EUR', 'USD', 'GBP', 'TND'].map(d => ({ value: d, label: d }))} />
          <FI label="Date valeur" value={order.dateValeur} onChange={v => up('dateValeur', v)} type="date" required />
          <FI label="Cours de conversion" value={order.coursConversion} onChange={v => up('coursConversion', v)} placeholder="3.35000000" />
          <div className="col-span-2 flex gap-2 items-end">
            <div className="flex-1"><FI label="Contre-valeur TND (calculée)" value={order.contreValeurTnd} disabled /></div>
            <button onClick={calcCV} className="mb-0.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] flex items-center gap-1">
              <RefreshCw size={12} />Calc
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl text-xs" style={{ background: '#F4F8FC' }}>
          <span className="text-[#7A90A4]">Résumé FX:</span>
          <span className="font-bold text-[#2D3E54]">{order.montantOrdre} {order.deviseOrdre}</span>
          <ChevronRight size={12} className="text-[#A8C0D9]" />
          <span className="font-mono font-bold text-[#435B7B]">× {order.coursConversion}</span>
          <ChevronRight size={12} className="text-[#A8C0D9]" />
          <span className="font-bold text-[#2D3E54]">{order.contreValeurTnd} TND</span>
        </div>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #0D9488' }}>
        <SecTitle>Instruction ISO 20022</SecTitle>
        <div className="grid grid-cols-3 gap-4">
          <FI label="Priorité SWIFT" value={order.prioriteSwift} onChange={v => up('prioriteSwift', v)} select opts={[{ value: 'NORM', label: 'Normal (NORM)' }, { value: 'HIGH', label: 'Haute priorité (HIGH)' }, { value: 'URGP', label: 'Urgent (URGP)' }]} />
          <FI label="Service level" value={order.serviceLevel} onChange={v => up('serviceLevel', v)} select opts={[{ value: 'SEPA', label: 'SEPA' }, { value: 'SDVA', label: 'Same Day (SDVA)' }, { value: 'NURG', label: 'Non urgent (NURG)' }]} />
          <FI label="Purpose code ISO 20022" value={order.purposeCode} onChange={v => up('purposeCode', v)} select opts={[{ value: 'GDDS', label: 'GDDS — Biens' }, { value: 'SVCS', label: 'SVCS — Services' }, { value: 'FEES', label: 'FEES — Honoraires' }, { value: 'SALA', label: 'SALA — Salaire' }, { value: 'DIVD', label: 'DIVD — Dividendes' }]} />
          <FI label="Motif économique" value={order.motifEconomique} onChange={v => up('motifEconomique', v)} required placeholder="Import marchandises" />
          <FI label="Référence facture / justificatif" value={order.refFacture} onChange={v => up('refFacture', v)} placeholder="FACT-2026-00123" />
          <FI label="Frais (charge bearer)" value={order.chargeBearer} onChange={v => up('chargeBearer', v)} select opts={[{ value: 'SHAR', label: 'SHAR — Partagés' }, { value: 'DEBT', label: "DEBT — Donneur d'ordre" }, { value: 'CRED', label: 'CRED — Bénéficiaire' }]} />
          <div className="col-span-3"><FI label="Compte commission" value={order.compteCommission} onChange={v => up('compteCommission', v)} /></div>
        </div>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
        <SecTitle>Bénéficiaire & banque créancière</SecTitle>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2"><FI label="Nom / Raison sociale bénéficiaire" value={order.nomBenef} onChange={v => up('nomBenef', v)} required /></div>
          <FI label="Type bénéficiaire" value={order.typeBenef} onChange={v => up('typeBenef', v)} select opts={[{ value: 'PERSONNE MORALE', label: 'Personne morale' }, { value: 'PERSONNE PHYSIQUE', label: 'Personne physique' }]} />
          <FI label="Pays bénéficiaire" value={order.paysBenef} onChange={v => up('paysBenef', v)} required />
          <FI label="Résidence bénéficiaire" value={order.residenceBenef} onChange={v => up('residenceBenef', v)} select opts={[{ value: 'Non-résident', label: 'Non-résident' }, { value: 'Résident', label: 'Résident' }]} />
          <FI label="IBAN / Compte bénéficiaire" value={order.iban} onChange={v => up('iban', v)} required placeholder="DE89370400440532013000" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <FI label="BIC banque bénéficiaire" value={order.bic} onChange={v => up('bic', v)} required placeholder="DEUTDEFFXXX" />
          <FI label="Nom banque bénéficiaire" value={order.nomBanque} onChange={v => up('nomBanque', v)} required />
          <FI label="Pays banque" value={order.paysBanque} onChange={v => up('paysBanque', v)} required />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#d1dce6] text-xs" style={{ background: '#F4F8FC' }}>
          <Globe2 size={14} className="text-[#435B7B]" />
          <span className="font-mono font-bold text-[#2D3E54]">{order.iban}</span>
          <span className="text-[#A8C0D9]">→</span>
          <span className="font-mono font-bold text-[#435B7B]">{order.bic}</span>
          <span className="text-[#A8C0D9]">—</span>
          <span className="text-[#6B7A8D]">{order.nomBanque}, {order.paysBanque}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Payment Modalities ─────────────────────────── */
function StepModalities({ modalities, setModalities, transferAmount }: {
  modalities: Modality[]; setModalities: (m: Modality[]) => void; transferAmount: string;
}) {
  const total = parseFloat(transferAmount) || 20000;
  const covered = modalities.reduce((s, m) => s + (parseFloat(m.montantCouvert.replace(/,/g, '')) || 0), 0);
  const pct = Math.min(100, total > 0 ? Math.round((covered / total) * 100) : 0);
  const barColor = pct === 100 ? '#22C55E' : pct > 50 ? '#F97316' : '#EF4444';

  const add = () => setModalities([...modalities, {
    id: Date.now().toString(), type: 'Achat devise compte TND', pourcentage: 100,
    montantCouvert: String(total), devise: 'EUR',
    compte: '01001000000000123456', deviseCompte: 'TND',
    montantDebit: (total * 3.35).toFixed(3), changeRequis: true,
    cours: '3.35000000', refDeal: '', blocage: true,
  }]);
  const remove = (id: string) => setModalities(modalities.filter(m => m.id !== id));
  const upd = (id: string, k: keyof Modality, v: any) => setModalities(modalities.map(m => m.id === id ? { ...m, [k]: v } : m));

  const TYPES = ['Achat devise compte TND', 'Débit compte devise', 'Contrat à terme', 'Financement import', "Fonds reçus d'une autre banque", 'Négociation interbancaire'];

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Modalités de paiement</h2>
        <p className="text-sm text-[#7A90A4]">Définissez les ressources de financement du transfert. La couverture doit atteindre 100%.</p>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: `3px solid ${barColor}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-[#2D3E54]">Couverture du transfert</span>
          <span className="text-sm font-bold" style={{ color: barColor }}>{covered.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} EUR / {total.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} EUR — {pct}%</span>
        </div>
        <div className="w-full h-4 bg-[#F4F8FC] rounded-full overflow-hidden border border-[#d1dce6] mb-3">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}BB, ${barColor})` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ ok: pct === 100, l: 'Couverture 100%' }, { ok: modalities.length > 0, l: 'Modalité définie' }, { ok: modalities.every(m => !!m.compte), l: 'Compte débiteur renseigné' }, { ok: modalities.every(m => !m.changeRequis || !!m.cours), l: 'FX complet si requis' }, { ok: modalities.every(m => m.blocage !== undefined), l: 'Blocage renseigné' }].map((c, i) => (
            <span key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${c.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {c.ok ? <Check size={10} /> : <Clock size={10} />}{c.l}
            </span>
          ))}
        </div>
      </div>

      {modalities.map((mod, idx) => (
        <div key={mod.id} className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5 anim-fade-in-up" style={{ borderTop: '3px solid #0D9488' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-[#2D3E54]">Modalité #{idx + 1}</span>
            <button onClick={() => remove(mod.id)} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-all">
              <Trash2 size={12} />Supprimer
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <FI label="Type de modalité" value={mod.type} onChange={v => upd(mod.id, 'type', v)} select opts={TYPES.map(t => ({ value: t, label: t }))} />
            <FI label="Montant couvert" value={mod.montantCouvert} onChange={v => upd(mod.id, 'montantCouvert', v)} required />
            <FI label="Devise couverte" value={mod.devise} onChange={v => upd(mod.id, 'devise', v)} select opts={['EUR', 'USD', 'TND'].map(d => ({ value: d, label: d }))} />
            <FI label="Compte à débiter" value={mod.compte} onChange={v => upd(mod.id, 'compte', v)} required />
            <FI label="Devise compte" value={mod.deviseCompte} onChange={v => upd(mod.id, 'deviseCompte', v)} select opts={['TND', 'EUR', 'USD'].map(d => ({ value: d, label: d }))} />
            <FI label="Montant à débiter" value={mod.montantDebit} onChange={v => upd(mod.id, 'montantDebit', v)} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-[#2D3E54] cursor-pointer">
              <input type="checkbox" checked={mod.changeRequis} onChange={e => upd(mod.id, 'changeRequis', e.target.checked)} className="w-4 h-4 accent-[#435B7B]" />
              Change requis
            </label>
            {mod.changeRequis && (
              <div className="w-40"><FI label="Cours" value={mod.cours || ''} onChange={v => upd(mod.id, 'cours', v)} placeholder="3.35000000" /></div>
            )}
            <div className="w-48"><FI label="Réf. deal / contrat" value={mod.refDeal || ''} onChange={v => upd(mod.id, 'refDeal', v)} placeholder="Optionnel" /></div>
            <label className="flex items-center gap-2 text-xs text-[#2D3E54] cursor-pointer">
              <input type="checkbox" checked={mod.blocage} onChange={e => upd(mod.id, 'blocage', e.target.checked)} className="w-4 h-4 accent-[#435B7B]" />
              Blocage requis
            </label>
          </div>
        </div>
      ))}

      <button onClick={add}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#A8C0D9] text-sm font-semibold text-[#435B7B] hover:border-[#435B7B] hover:bg-[#F4F8FC] transition-all">
        <Plus size={16} />Ajouter une modalité de paiement
      </button>
    </div>
  );
}

/* ─── Step 5: Recap ──────────────────────────────────────── */
function StepRecap({ transferType, client, tceResult, regType, order, modalities, onSubmit, submitting }: {
  transferType: TransferType | null; client: ClientData | null; tceResult: TCEResult | null;
  regType: RegulatoryType; order: TransferOrder; modalities: Modality[];
  onSubmit: () => void; submitting: boolean;
}) {
  const checks = [
    { ok: !!client && client.statut === 'ACTIF', label: 'Client vérifié et actif' },
    ...(transferType === 'commercial' ? [
      { ok: !!tceResult, label: 'TCE consulté via MS-DOMI' },
      { ok: !!tceResult && tceResult.appartient, label: 'TCE appartient au client' },
      { ok: !!tceResult && tceResult.state === 'success', label: 'Montant disponible suffisant' },
    ] : [
      { ok: !!order.motifEconomique, label: 'Nature opération renseignée' },
      { ok: regType !== null, label: 'Support réglementaire renseigné' },
    ]),
    { ok: modalities.length > 0, label: 'Modalités définies' },
    { ok: !!order.iban && !!order.bic, label: 'Données bénéficiaire complètes' },
    { ok: !!order.motifEconomique, label: 'Motif économique renseigné' },
    { ok: true, label: 'Prêt pour soumission MS-TR' },
  ];

  return (
    <div className="space-y-5 anim-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-[#2D3E54] mb-1">Récapitulatif avant soumission</h2>
        <p className="text-sm text-[#7A90A4]">Vérifiez toutes les informations avant de soumettre l'ordre au workflow MS-TR.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
          <SecTitle>Type & client donneur d'ordre</SecTitle>
          <div className="space-y-3">
            <FR label="Type de transfert" value={<TypeBadge type={transferType || 'commercial'} />} />
            <FR label="Client" value={client?.nomRaison} />
            <FR label="Identifiant" value={client?.idClient} />
            <FR label="Compte D/O" value={<span className="font-mono text-xs">{order.compteCommission}</span>} />
          </div>
        </div>
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #0D9488' }}>
          <SecTitle>{transferType === 'commercial' ? 'TCE import — MS-DOMI' : 'Support réglementaire'}</SecTitle>
          {transferType === 'commercial' && tceResult ? (
            <div className="space-y-3">
              <FR label="Numéro domiciliation" value={<span className="font-mono text-xs">{tceResult.numDomi}</span>} />
              <FR label="Devise / Montant dispo" value={`${tceResult.montantDispo} ${tceResult.devise}`} />
              <FR label="État" value={<span className="text-green-700 font-semibold text-xs">Valide ✓</span>} />
            </div>
          ) : (
            <div className="space-y-3">
              <FR label="Type support" value={regType === 'autorisation_bct' ? 'Autorisation BCT' : regType === 'fiche_information' ? "Fiche d'information" : regType === 'autre_support' ? 'Autre support' : 'Non requis'} />
              {regType === 'autorisation_bct' && <FR label="Référence" value={<span className="font-mono text-xs">BCT-2026/447</span>} />}
            </div>
          )}
        </div>
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #7C3AED' }}>
          <SecTitle>Bénéficiaire & banque</SecTitle>
          <div className="space-y-3">
            <FR label="Bénéficiaire" value={order.nomBenef} />
            <FR label="IBAN" value={<span className="font-mono text-xs">{order.iban}</span>} />
            <FR label="BIC / Banque" value={`${order.bic} — ${order.nomBanque}`} />
            <FR label="Pays" value={order.paysBanque} />
          </div>
        </div>
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #F97316' }}>
          <SecTitle>Ordre de transfert</SecTitle>
          <div className="space-y-3">
            <FR label="Montant transfert" value={`${order.montantTransfert} ${order.deviseTransfert}`} />
            <FR label="Contre-valeur TND" value={`${order.contreValeurTnd} TND`} />
            <FR label="Date valeur" value={order.dateValeur} />
            <FR label="Purpose / Motif" value={`${order.purposeCode} — ${order.motifEconomique}`} />
          </div>
        </div>
      </div>

      {modalities.length > 0 && (
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm overflow-hidden" style={{ borderTop: '3px solid #22C55E' }}>
          <div className="px-5 pt-5 pb-2"><SecTitle>Modalités de paiement</SecTitle></div>
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#F4F8FC' }}>
              {['#', 'Type', 'Montant couvert', 'Compte débiteur', 'Montant débit', 'FX', 'Blocage'].map(h =>
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[#435B7B] uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {modalities.map((m, i) => (
                <tr key={m.id} className="border-t border-[#EEF3F7]">
                  <td className="px-4 py-3 text-xs font-bold text-[#6B7A8D]">{i + 1}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#2D3E54]">{m.type}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{m.montantCouvert} {m.devise}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#6B7A8D]">{m.compte}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{m.montantDebit} {m.deviseCompte}</td>
                  <td className="px-4 py-3 text-xs">{m.changeRequis ? `Oui — ${m.cours}` : 'Non'}</td>
                  <td className="px-4 py-3 text-xs">{m.blocage ? <span className="text-green-700 font-semibold">Oui</span> : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #435B7B' }}>
          <SecTitle>Contrôles effectués</SecTitle>
          <div className="divide-y divide-[#EEF3F7]">
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                {c.ok ? <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" /> : <Clock size={14} className="text-amber-500 flex-shrink-0" />}
                <span className={`text-xs ${c.ok ? 'text-green-800' : 'text-amber-700'}`}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5" style={{ borderTop: '3px solid #6B7A8D' }}>
          <SecTitle>Traçabilité technique</SecTitle>
          <div className="divide-y divide-[#EEF3F7]">
            {[
              { l: 'Consultation client', s: 'MS-REF', show: true },
              { l: 'Consultation TCE', s: 'MS-DOMI', show: transferType === 'commercial' },
              { l: 'Création transfert', s: 'MS-TR', show: true },
              { l: 'Routage workflow', s: 'MS-WORKFLOW', show: true },
              { l: 'Réservation TCE', s: 'MS-TR → MS-DOMI /reservation', show: transferType === 'commercial' },
              { l: 'Règlement effectif', s: 'MS-TR → MS-DOMI /reglement', show: true },
              { l: 'Calcul commission', s: 'MS-TR → RECOM', show: true },
            ].filter(r => r.show).map(r => (
              <div key={r.l} className="flex items-center gap-2 py-1.5">
                <Zap size={12} className="text-[#435B7B] flex-shrink-0" />
                <span className="text-[10px] text-[#6B7A8D]">{r.l}:</span>
                <span className="text-[10px] font-mono font-bold text-[#435B7B]">{r.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#d1dce6] text-sm font-semibold text-[#435B7B] hover:bg-[#F4F8FC] transition-all">
          <Download size={14} />Enregistrer brouillon
        </button>
        <button onClick={onSubmit} disabled={submitting}
          className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 shadow-md hover:shadow-lg ml-auto" style={HDR}>
          {submitting ? <><Loader2 size={14} className="animate-spin" />Soumission MS-TR…</> : <><Send size={14} />Soumettre au workflow</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Simple section navigation ─────────────────────────── */
const NAVIGATION_ITEMS = [
  { label: 'Type', icon: FileText },
  { label: 'Client', icon: Building2 },
  { label: 'Support', icon: ShieldCheck },
  { label: 'Ordre', icon: Send },
  { label: 'Paiement', icon: Banknote },
  { label: 'Récapitulatif', icon: ClipboardList },
];

function SimpleSectionNavigation({
  current,
  transferType,
  onChange,
}: {
  current: number;
  transferType: TransferType | null;
  onChange: (section: number) => void;
}) {
  return (
    <nav
      aria-label="Navigation du dossier transfert"
      className="bg-white border border-[#d1dce6] rounded-xl p-1.5 shadow-sm overflow-x-auto"
    >
      <div className="flex items-center gap-1 min-w-max">
        {NAVIGATION_ITEMS.map((item, index) => {
          const active = current === index;
          const label = index === 2 && transferType
            ? transferType === 'commercial' ? 'TCE' : 'Support BCT'
            : item.label;
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(index)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-[#435B7B] hover:bg-[#F4F8FC]'
              }`}
              style={active ? HDR : undefined}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Summary Panel ──────────────────────────────────────── */
function SummaryPanel({ transferType, client, selAcc, tceResult, regType, order, modalities, step }: {
  transferType: TransferType | null; client: ClientData | null; selAcc: string;
  tceResult: TCEResult | null; regType: RegulatoryType; order: TransferOrder;
  modalities: Modality[]; step: number;
}) {
  const total = parseFloat(order.montantTransfert) || 0;
  const covered = modalities.reduce((s, m) => s + (parseFloat(m.montantCouvert.replace(/,/g, '')) || 0), 0);
  const pct = total > 0 ? Math.min(100, Math.round((covered / total) * 100)) : 0;

  const rows = [
    { label: 'Type transfert', value: transferType ? <TypeBadge type={transferType} /> : '—', show: true },
    { label: 'Client', value: <span className="text-[10px]">{client?.nomRaison ?? '—'}</span>, show: step >= 1 },
    { label: 'Compte D/O', value: selAcc ? <span className="font-mono text-[10px]">…{selAcc.slice(-8)}</span> : '—', show: step >= 1 },
    {
      label: transferType === 'commercial' ? 'TCE' : 'Support BCT',
      value: transferType === 'commercial'
        ? (tceResult?.state === 'success' ? <span className="text-green-700 text-[10px] font-bold">✓ {tceResult.numDomi}</span> : '—')
        : (regType ? <span className="text-purple-700 text-[10px] font-bold">✓ {regType === 'autorisation_bct' ? 'Auth BCT' : regType === 'fiche_information' ? 'Fiche info' : 'Autre'}</span> : '—'),
      show: step >= 2,
    },
    { label: 'Montant ordre', value: order.montantOrdre ? `${parseFloat(order.montantOrdre).toLocaleString('fr-TN')} ${order.deviseOrdre}` : '—', show: step >= 3 },
    { label: 'Contre-valeur', value: order.contreValeurTnd ? `${order.contreValeurTnd} TND` : '—', show: step >= 3 },
    { label: 'Bénéficiaire', value: <span className="text-[10px]">{order.nomBenef || '—'}</span>, show: step >= 3 },
    { label: 'Couverture', value: modalities.length > 0 ? <span className="font-bold" style={{ color: pct === 100 ? '#15803D' : '#C2410C' }}>{pct}%</span> : '—', show: step >= 4 },
    { label: 'Statut', value: step >= 5 ? <span className="text-green-700 font-semibold text-[10px]">Prêt ✓</span> : <span className="text-amber-600 text-[10px]">En cours…</span>, show: step >= 1 },
  ];

  return (
    <div className="w-56 flex-shrink-0 space-y-3">
      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-4" style={{ borderTop: '3px solid #435B7B' }}>
        <p className="text-[10px] font-bold text-[#435B7B] uppercase tracking-wide mb-3">Récapitulatif en cours</p>
        <div className="space-y-3 divide-y divide-[#EEF3F7]">
          {rows.filter(r => r.show).map((r, i) => (
            <div key={i} className="pt-2 first:pt-0">
              <p className="text-[9px] text-[#7A90A4] uppercase tracking-wide mb-0.5">{r.label}</p>
              <div className="text-xs font-semibold text-[#2D3E54]">{r.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#F4F8FC] border border-[#d1dce6] rounded-xl p-3">
        <p className="text-[9px] font-bold text-[#435B7B] uppercase tracking-wide mb-2">Architecture MS</p>
        {[['MS-REF', 'Client', '#435B7B'], ['MS-DOMI', 'TCE', '#0D9488'], ['MS-TR', 'Transfert', '#7C3AED'], ['MS-WORKFLOW', 'Routage', '#F97316']].map(([label, desc, color]) => (
          <div key={label} className="flex items-center gap-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-mono font-bold text-[#2D3E54]">{label}</span>
            <span className="text-[10px] text-[#7A90A4]">— {desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Success Modal ──────────────────────────────────────── */
function SuccessModal({ transferType, onClose, onNew }: { transferType: TransferType | null; onClose: () => void; onNew: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 anim-fade-in-up">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #22C55E, #15803D)' }}>
            <CheckCircle2 size={30} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-[#2D3E54] mb-1">Transfert créé avec succès</h2>
          <p className="text-sm text-[#7A90A4]">L'ordre a été transmis à MS-TR et acheminé par MS-WORKFLOW.</p>
        </div>
        <div className="bg-[#F4F8FC] rounded-2xl p-4 mb-4 space-y-3">
          {[
            { l: 'Référence opération', v: <span className="font-mono text-sm font-bold text-[#435B7B]">TR-2026-000001</span> },
            { l: 'Type transfert', v: <TypeBadge type={transferType || 'commercial'} /> },
            { l: 'Statut', v: <StatusBadge status="en_cours_agence" /> },
            { l: 'Prochaine étape', v: <span className="text-xs font-semibold text-[#2D3E54]">Services centraux</span> },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-[#7A90A4]">{r.l}</span>
              {r.v}
            </div>
          ))}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-xs text-blue-800 leading-relaxed">
            L'opération a été transmise à MS-TR. Le workflow déterminera la prochaine étape de validation.
            {transferType === 'commercial' && <><br /><strong className="mt-1 block">Important:</strong> La réservation effective du TCE sera effectuée par MS-TR via MS-DOMI <span className="font-mono">/reservation</span>.</>}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#d1dce6] text-sm font-semibold text-[#435B7B] hover:bg-[#F4F8FC] transition-all">
            <Eye size={14} />Consulter dossier
          </button>
          <button onClick={onNew} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={HDR}>
            <Plus size={14} />Nouveau transfert
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Consultation sub-component ───────────────────────── */
function TransferConsultation({ onNew }: { onNew: () => void }) {
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredTransfers = RECENT_TRANSFERS.filter(transfer => {
    const matchesSearch = !normalizedSearch
      || transfer.ref.toLowerCase().includes(normalizedSearch)
      || transfer.client.toLowerCase().includes(normalizedSearch)
      || transfer.support.toLowerCase().includes(normalizedSearch);
    const matchesType = typeFilter === 'all' || transfer.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || transfer.statut === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 page-transition">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 anim-fade-in-up">
        <KPI label="Commerciaux en cours" value={7} color="#1D4ED8" icon={TrendingUp} />
        <KPI label="Financiers en cours" value={3} color="#7C3AED" icon={Banknote} />
        <KPI label="Dossiers avec alerte" value={2} color="#F97316" icon={AlertTriangle} />
        <KPI label="En attente SC" value={4} color="#0D9488" icon={Clock} />
        <KPI label="Rejetés ce mois" value={1} color="#EF4444" icon={XCircle} />
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5 anim-fade-in-up delay-100" style={{ borderTop: '3px solid #435B7B' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#2D3E54]">Consultation des dossiers de transfert</h2>
            <p className="text-xs text-[#7A90A4] mt-0.5">Recherchez les transferts enregistrés dans l'agence.</p>
          </div>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-sm"
            style={HDR}
          >
            <Plus size={16} />Nouveau transfert
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <FI
              label="Référence, client ou support"
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Rechercher un dossier..."
            />
          </div>
          <FI
            label="Type de transfert"
            value={typeFilter}
            onChange={setTypeFilter}
            select
            opts={[
              { value: 'all', label: 'Tous les types' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'financier', label: 'Financier' },
            ]}
          />
          <FI
            label="Statut"
            value={statusFilter}
            onChange={setStatusFilter}
            select
            opts={[
              { value: 'all', label: 'Tous les statuts' },
              { value: 'brouillon', label: 'Brouillon' },
              { value: 'en_cours_agence', label: 'En cours agence' },
              { value: 'attente_sc', label: 'En attente SC' },
              { value: 'valide', label: 'Validé' },
              { value: 'rejete', label: 'Rejeté' },
            ]}
          />
        </div>
      </div>

      <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm overflow-hidden anim-fade-in-up delay-200">
        <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#2D3E54]">Dossiers de transfert</h2>
            <p className="text-xs text-[#7A90A4] mt-0.5">{filteredTransfers.length} dossier(s) trouvé(s)</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] transition-all"><RefreshCw size={12} />Actualiser</button>
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] transition-all"><Download size={12} />Exporter</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ background: '#F4F8FC' }}>
              {['Référence', 'Type', 'Client', 'Montant', 'Support', 'Statut', 'Étape workflow', 'Dernière MAJ', 'Action'].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#435B7B] uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {filteredTransfers.map(tr => (
                <tr key={tr.ref} className="border-t border-[#EEF3F7] hover:bg-[#EEF3F7]/50 transition-all">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#435B7B]">{tr.ref}</td>
                  <td className="px-4 py-3"><TypeBadge type={tr.type} /></td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#2D3E54] max-w-[150px] truncate">{tr.client}</td>
                  <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">{tr.montant} {tr.devise}</td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D] max-w-[120px] truncate">{tr.support}</td>
                  <td className="px-4 py-3"><StatusBadge status={tr.statut} /></td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D]">{tr.etape}</td>
                  <td className="px-4 py-3 text-xs text-[#7A90A4] whitespace-nowrap">{tr.maj}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#d1dce6] text-[#435B7B] hover:bg-[#F4F8FC] transition-all"><Eye size={11} />Voir</button>
                  </td>
                </tr>
              ))}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#7A90A4]">
                    Aucun dossier ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export function MSTransferCreate() {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('consultation');
  const [currentSection, setCurrentSection] = useState(0);
  const [transferType, setTransferType] = useState<TransferType | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [selAcc, setSelAcc] = useState('');
  const [tceResult, setTceResult] = useState<TCEResult | null>(null);
  const [regType, setRegType] = useState<RegulatoryType>(null);
  const [order, setOrder] = useState<TransferOrder>(INITIAL_ORDER);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const canProceed = () => {
    if (currentSection === 0) return transferType !== null;
    if (currentSection === 1) return client !== null && selAcc.length > 0;
    if (currentSection === 2) {
      return transferType === 'commercial'
        ? tceResult?.state === 'success'
        : regType !== null;
    }
    if (currentSection === 3) {
      return Boolean(order.montantOrdre && order.iban && order.bic);
    }
    if (currentSection === 4) return modalities.length > 0;
    return true;
  };

  const resetForm = () => {
    setCurrentSection(0);
    setTransferType(null);
    setClient(null);
    setSelAcc('');
    setTceResult(null);
    setRegType(null);
    setOrder(INITIAL_ORDER);
    setModalities([]);
    setSubmitting(false);
    setShowSuccess(false);
  };

  const openCreation = () => {
    resetForm();
    setWorkspaceView('creation');
  };

  const openConsultation = () => {
    setShowSuccess(false);
    setWorkspaceView('consultation');
  };

  const handlePrevious = () => {
    if (currentSection === 0) {
      openConsultation();
      return;
    }
    setCurrentSection(section => section - 1);
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setCurrentSection(section => Math.min(NAVIGATION_ITEMS.length - 1, section + 1));
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowSuccess(true);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 page-transition">
      {showSuccess && (
        <SuccessModal
          transferType={transferType}
          onClose={openConsultation}
          onNew={() => {
            resetForm();
            setWorkspaceView('creation');
          }}
        />
      )}

      <div className="rounded-2xl p-5 text-white anim-fade-in-up" style={HDR}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Send size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Dossier Transfert</h1>
              <p className="text-xs text-white/70 mt-0.5">
                Transferts commerciaux et financiers émis vers l'étranger — Agence BCT-10
              </p>
            </div>
          </div>

          {workspaceView === 'consultation' && (
            <button
              type="button"
              onClick={openCreation}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/20 hover:bg-white/30 transition-all border border-white/20"
            >
              <Plus size={16} />Nouveau transfert
            </button>
          )}
        </div>
      </div>

      <div className="inline-flex bg-white border border-[#d1dce6] rounded-xl p-1 shadow-sm">
        <button
          type="button"
          onClick={openConsultation}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            workspaceView === 'consultation'
              ? 'text-white shadow-sm'
              : 'text-[#435B7B] hover:bg-[#F4F8FC]'
          }`}
          style={workspaceView === 'consultation' ? HDR : undefined}
        >
          <Search size={14} />Consultation
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceView('creation')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            workspaceView === 'creation'
              ? 'text-white shadow-sm'
              : 'text-[#435B7B] hover:bg-[#F4F8FC]'
          }`}
          style={workspaceView === 'creation' ? HDR : undefined}
        >
          <Plus size={14} />Nouveau dossier
        </button>
      </div>

      {workspaceView === 'consultation' && (
        <TransferConsultation onNew={openCreation} />
      )}

      {workspaceView === 'creation' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#d1dce6] rounded-2xl shadow-sm p-5 anim-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openConsultation}
                  className="w-9 h-9 rounded-xl border border-[#d1dce6] hover:bg-[#F4F8FC] flex items-center justify-center transition-all"
                  aria-label="Retour à la consultation"
                >
                  <ArrowLeft size={16} className="text-[#435B7B]" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-[#2D3E54]">Saisie d'un ordre de transfert</h2>
                  <p className="text-xs text-[#7A90A4]">Naviguez librement entre les rubriques du dossier.</p>
                </div>
              </div>
              {transferType && <TypeBadge type={transferType} />}
            </div>
          </div>

          <SimpleSectionNavigation
            current={currentSection}
            transferType={transferType}
            onChange={setCurrentSection}
          />

          <div className={`flex gap-5 anim-fade-in-up delay-100 ${currentSection > 0 ? '' : 'justify-center'}`}>
            <div className="flex-1 min-w-0">
              {currentSection === 0 && (
                <StepType
                  onSelect={type => {
                    setTransferType(type);
                    setTceResult(null);
                    setRegType(null);
                    setCurrentSection(1);
                  }}
                />
              )}
              {currentSection === 1 && (
                <StepClient
                  client={client}
                  setClient={setClient}
                  selAcc={selAcc}
                  setSelAcc={setSelAcc}
                />
              )}
              {currentSection === 2 && !transferType && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Sélectionnez d'abord le type de transfert dans la rubrique « Type ».
                  </p>
                </div>
              )}
              {currentSection === 2 && transferType === 'commercial' && (
                <StepTCE tceResult={tceResult} setTceResult={setTceResult} />
              )}
              {currentSection === 2 && transferType === 'financier' && (
                <StepRegSupport regType={regType} setRegType={setRegType} />
              )}
              {currentSection === 3 && <StepOrder order={order} setOrder={setOrder} />}
              {currentSection === 4 && (
                <StepModalities
                  modalities={modalities}
                  setModalities={setModalities}
                  transferAmount={order.montantTransfert}
                />
              )}
              {currentSection === 5 && (
                <StepRecap
                  transferType={transferType}
                  client={client}
                  tceResult={tceResult}
                  regType={regType}
                  order={order}
                  modalities={modalities}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              )}

              {currentSection < NAVIGATION_ITEMS.length - 1 && (
                <div className="flex items-center justify-between mt-5">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d1dce6] text-sm font-semibold text-[#435B7B] hover:bg-[#F4F8FC] transition-all"
                  >
                    <ArrowLeft size={14} />
                    {currentSection === 0 ? 'Consultation' : 'Précédent'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    style={HDR}
                  >
                    Suivant <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {currentSection > 0 && (
              <SummaryPanel
                transferType={transferType}
                client={client}
                selAcc={selAcc}
                tceResult={tceResult}
                regType={regType}
                order={order}
                modalities={modalities}
                step={currentSection}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
