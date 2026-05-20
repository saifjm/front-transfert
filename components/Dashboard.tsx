import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    BarChart3,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    DollarSign,
    FileOutput,
    FileText,
    FolderOpen,
    Globe,
    Lock,
    PauseCircle,
    Plane,
    Play,
    RefreshCw,
    Repeat2,
    Search,
    ShieldAlert,
    Users,
    XCircle
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis
} from 'recharts';
import { safeJsonParse } from '../utils';
import { authenticatedFetch } from '../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

// ── Mocked Data ───────────────────────────────────────────────────────────────

const evolutionMensuelle = [
  { mois: 'Mai', ouvertures: 94,  clotures: 61, suspensions: 8  },
  { mois: 'Juin', ouvertures: 108, clotures: 72, suspensions: 11 },
  { mois: 'Juil', ouvertures: 87,  clotures: 68, suspensions: 6  },
  { mois: 'Août', ouvertures: 76,  clotures: 55, suspensions: 9  },
  { mois: 'Sep',  ouvertures: 112, clotures: 79, suspensions: 13 },
  { mois: 'Oct',  ouvertures: 130, clotures: 88, suspensions: 10 },
  { mois: 'Nov',  ouvertures: 119, clotures: 91, suspensions: 7  },
  { mois: 'Déc',  ouvertures: 97,  clotures: 74, suspensions: 12 },
  { mois: 'Jan',  ouvertures: 121, clotures: 83, suspensions: 9  },
  { mois: 'Fév',  ouvertures: 143, clotures: 97, suspensions: 14 },
  { mois: 'Mar',  ouvertures: 136, clotures: 89, suspensions: 11 },
  { mois: 'Avr',  ouvertures: 158, clotures: 89, suspensions: 23 },
];

const montantsMensuels = [
  { mois: 'Oct', montant: 3820000 },
  { mois: 'Nov', montant: 4150000 },
  { mois: 'Déc', montant: 3650000 },
  { mois: 'Jan', montant: 4780000 },
  { mois: 'Fév', montant: 5230000 },
  { mois: 'Mar', montant: 4920000 },
  { mois: 'Avr', montant: 6140000 },
];

const repartitionOperations = [
  { name: 'Alimentation Export.', value: 312, color: '#435B7B' },
  { name: 'Réservation',          value: 218, color: '#6B8CAE' },
  { name: 'Frais de voyage',      value: 187, color: '#A8C0D9' },
  { name: 'Rétrocession',         value: 143, color: '#2D3E54' },
  { name: 'Ouverture',            value: 158, color: '#1e6091' },
  { name: 'Autres',               value: 229, color: '#D6E4F0' },
];

const repartitionDevises = [
  { devise: 'EUR', dossiers: 487, montant: 21_450_000, pct: 44.3 },
  { devise: 'USD', dossiers: 334, montant: 14_820_000, pct: 30.6 },
  { devise: 'GBP', dossiers: 198, montant:  7_650_000, pct: 15.8 },
  { devise: 'JPY', dossiers:  87, montant:  2_840_000, pct:  5.9 },
  { devise: 'CHF', dossiers: 141, montant:  1_632_650, pct:  3.4 },
];

const derniersDossiers = [
  { num: '2024-00847', client: 'STEG INTERNATIONAL',    mf: '0001234M/A/M/000', agence: 'Tunis Principal', devise: 'EUR', montant: 285_000, statut: 'Actif',    date: '10/04/2026', op: 'Alimentation'  },
  { num: '2024-00846', client: 'TUNISAIR TECHNICS',     mf: '0005678B/A/M/000', agence: 'Sfax',            devise: 'USD', montant: 148_500, statut: 'Réservé',  date: '10/04/2026', op: 'Réservation'   },
  { num: '2024-00845', client: 'BIAT LEASING',          mf: '0009876C/A/P/000', agence: 'Sousse',          devise: 'EUR', montant: 420_000, statut: 'Actif',    date: '09/04/2026', op: 'Rétrocession'  },
  { num: '2024-00844', client: 'SOTUPHARMA SA',         mf: '0002345D/A/M/000', agence: 'Tunis Principal', devise: 'GBP', montant:  93_200, statut: 'Clôturé',  date: '09/04/2026', op: 'Clôture'       },
  { num: '2024-00843', client: 'POULINA GROUP',         mf: '0003456E/A/M/000', agence: 'Monastir',        devise: 'USD', montant: 675_000, statut: 'Suspendu', date: '08/04/2026', op: 'Suspension'    },
  { num: '2024-00842', client: 'GROUPE CHIMIQUE TUN.', mf: '0007890F/A/M/000',  agence: 'Gabès',           devise: 'EUR', montant: 510_000, statut: 'Actif',    date: '08/04/2026', op: 'Frais voyage'  },
  { num: '2024-00841', client: 'DÉLICE HOLDING',        mf: '0004321G/A/M/000', agence: 'Tunis Principal', devise: 'USD', montant: 234_750, statut: 'Actif',    date: '07/04/2026', op: 'Alimentation'  },
];

const alertes = [
  { type: 'warning', msg: '12 dossiers arrivent à échéance dans les 7 prochains jours',        action: 'Consulter', actionSection: 'ava-consultation-dossier', icon: Clock       },
  { type: 'error',   msg: '3 dossiers suspendus dépassent 30 jours sans levée de suspension',  action: 'Traiter',   actionSection: 'ava-levee-suspension',     icon: ShieldAlert },
  { type: 'info',    msg: '5 demandes de réservation en attente de validation BCT',             action: 'Réviser',   actionSection: 'ava-reservation',          icon: AlertTriangle },
  { type: 'success', msg: '89 dossiers clôturés avec succès ce mois — record mensuel',         action: 'Détails',   actionSection: 'ava-consultation-dossier', icon: CheckCircle2  },
];

const statAgences = [
  { agence: 'Tunis Principal', dossiers: 423, montant: 19_840_000, actifs: 387, pct: 91.5 },
  { agence: 'Sfax',            dossiers: 218, montant:  9_230_000, actifs: 195, pct: 89.4 },
  { agence: 'Sousse',          dossiers: 187, montant:  7_610_000, actifs: 164, pct: 87.7 },
  { agence: 'Monastir',        dossiers: 156, montant:  5_920_000, actifs: 138, pct: 88.5 },
  { agence: 'Gabès',           dossiers: 143, montant:  4_420_000, actifs: 124, pct: 86.7 },
  { agence: 'Autres',          dossiers: 120, montant:  1_372_650, actifs: 101, pct: 84.2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTND = (n: number) =>
  n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const fmtM = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K';
  return n.toString();
};

const statutStyle: Record<string, { bg: string; text: string; dot: string }> = {
  Actif:    { bg: '#DCFCE7', text: '#166534', dot: '#22c55e' },
  Réservé:  { bg: '#DBEAFE', text: '#1e40af', dot: '#3b82f6' },
  Suspendu: { bg: '#FEF3C7', text: '#92400e', dot: '#F59E0B' },
  Clôturé:  { bg: '#F3F4F6', text: '#374151', dot: '#9ca3af' },
};

const alerteStyle: Record<string, { border: string; bg: string; icon: string; actionBg: string; actionColor: string }> = {
  warning: { border: '#f59e0b', bg: '#fffbeb', icon: '#d97706', actionBg: 'rgba(245,158,11,0.1)', actionColor: '#b45309' },
  error:   { border: '#ef4444', bg: '#fff1f2', icon: '#dc2626', actionBg: 'rgba(239,68,68,0.1)',  actionColor: '#b91c1c' },
  info:    { border: '#3b82f6', bg: '#eff6ff', icon: '#2563eb', actionBg: 'rgba(59,130,246,0.1)', actionColor: '#1d4ed8' },
  success: { border: '#22c55e', bg: '#f0fdf4', icon: '#16a34a', actionBg: 'rgba(34,197,94,0.1)',  actionColor: '#15803d' },
};

// ── Animated Counter Hook ─────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      started.current = true;
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardData {
  label: string;
  value: number;
  display: string;
  sub?: string;
  trend: string;
  pct: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  accent: string;
  gradStart: string;
  gradEnd: string;
  unit?: string;
}

function KpiCard({ k, index }: { k: KpiCardData; index: number }) {
  const Icon = k.icon;
  const isUp = k.trend === 'up';
  const animated = useCountUp(k.value, 1200, index * 120);

  const displayVal = k.unit
    ? animated.toLocaleString('fr-TN')
    : animated.toLocaleString('fr-TN');

  return (
    <div
      className={`card-lift anim-fade-in-up delay-${index * 100}`}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '22px 22px 18px',
        border: '1px solid #e8edf2',
        boxShadow: '0 2px 8px rgba(67,91,123,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${k.gradStart}, ${k.gradEnd})`,
        borderRadius: '16px 16px 0 0',
      }} />

      {/* Watermark icon */}
      <div style={{
        position: 'absolute', right: -10, bottom: -14,
        opacity: 0.04,
      }}>
        <Icon style={{ width: 88, height: 88, color: k.accent }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${k.gradStart}, ${k.gradEnd})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${k.accent}30`,
        }}>
          <Icon style={{ width: 20, height: 20, color: '#fff' }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5,
          color: isUp ? '#16a34a' : '#d97706',
          background: isUp ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${isUp ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: 20, padding: '3px 9px',
        }}>
          {isUp
            ? <ArrowUpRight style={{ width: 12, height: 12 }} />
            : <ArrowDownRight style={{ width: 12, height: 12 }} />}
          {k.pct}
        </div>
      </div>

      <div className="anim-count-up" style={{ fontSize: 28, fontWeight: 800, color: '#2D3E54', lineHeight: 1, marginBottom: 3 }}>
        {displayVal}
        {k.unit && <span style={{ fontSize: 12, fontWeight: 600, color: '#6B8CAE', marginLeft: 5 }}>{k.unit}</span>}
      </div>
      <div style={{ fontSize: 12, color: '#6B8CAE', marginBottom: 6, fontWeight: 500 }}>{k.label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: isUp ? '#16a34a' : '#d97706' }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isUp ? '#22c55e' : '#f59e0b',
        }} />
        {k.sub}
      </div>
    </div>
  );
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#2D3E54', borderRadius: 10, padding: '10px 14px', color: '#f4f7f9', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '1px solid rgba(107,140,174,0.2)' }}>
      <p style={{ marginBottom: 6, color: '#A8C0D9', fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '3px 0' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: '#D6E4F0' }}>{p.name}:</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#2D3E54', borderRadius: 10, padding: '10px 14px', color: '#f4f7f9', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <p style={{ color: '#A8C0D9', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#6B8CAE' }}>{fmtTND(payload[0].value)} <span style={{ color: '#A8C0D9' }}>TND</span></p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#2D3E54', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#f4f7f9', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
      <p style={{ color: '#A8C0D9', fontWeight: 600 }}>{payload[0].name}</p>
      <p><span style={{ color: '#6B8CAE' }}>Opérations: </span><span style={{ color: '#fff', fontWeight: 700 }}>{payload[0].value}</span></p>
    </div>
  );
};

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e8edf2',
        boxShadow: '0 2px 8px rgba(67,91,123,0.05)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PanelHeader({ title, subtitle, action, icon }: {
  title: string; subtitle?: string;
  action?: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: '18px 22px',
      borderBottom: '1px solid #f0f3f7',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#EEF3F7,#E0EAF3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
        <div>
          <h3 style={{ color: '#2D3E54', margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
          {subtitle && <p style={{ color: '#6B8CAE', fontSize: 11.5, margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface DashboardProps {
  onNavigate?: (section: string, dossierNum?: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const [activeTab, setActiveTab] = useState<'evolution' | 'montants'>('evolution');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiDossiers, setApiDossiers] = useState<any[]>([]);
  const [agenceMap, setAgenceMap] = useState<Map<number, string>>(new Map());
  const [clientMapByDossier, setClientMapByDossier] = useState<Map<number, string>>(new Map());
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dossiersResponse, donneesGeneralesResponse, dossiersAvecNomResponse] = await Promise.all([
        authenticatedFetch('/api/operations-deleguees'),
        fetch('/api/ref/donnees-generales'),
        authenticatedFetch('/api/operations-deleguees/dossiers-valides-avec-nom'),
      ]);

      if (!dossiersResponse.ok) {
        throw new Error(`HTTP_ERROR_${dossiersResponse.status}`);
      }

      const data = await safeJsonParse<any[]>(dossiersResponse);
      setApiDossiers(Array.isArray(data) ? data : []);

      if (dossiersAvecNomResponse.ok) {
        const dossiersAvecNom = await safeJsonParse<Array<{ numDossier?: number; nomClient?: string; noPieceClient?: string }>>(dossiersAvecNomResponse);
        if (Array.isArray(dossiersAvecNom)) {
          const map = new Map<number, string>();
          for (const item of dossiersAvecNom) {
            const num = Number(item?.numDossier);
            if (!Number.isFinite(num)) continue;
            map.set(num, (item?.nomClient || '').trim() || (item?.noPieceClient || '-'));
          }
          setClientMapByDossier(map);
        } else {
          setClientMapByDossier(new Map());
        }
      } else {
        setClientMapByDossier(new Map());
      }

      const donneesGenerales = donneesGeneralesResponse.ok
        ? await safeJsonParse<Array<{ codeBanque?: number }>>(donneesGeneralesResponse)
        : null;
      const currentCodeBanque =
        Array.isArray(donneesGenerales) && donneesGenerales.length > 0
          ? Number(donneesGenerales[0]?.codeBanque)
          : null;

      if (Array.isArray(data) && Number.isFinite(currentCodeBanque as number)) {
        const uniqueCodes = Array.from(
          new Set(
            data
              .map((d) => Number(d?.codeAgence))
              .filter((code) => Number.isFinite(code)),
          ),
        ) as number[];

        const agencesResponses = await Promise.all(
          uniqueCodes.map(async (codeAgence) => {
            try {
              const resp = await fetch(`/api/ref/agences/${currentCodeBanque}/${codeAgence}`);
              if (!resp.ok) return null;
              const agence = await safeJsonParse<{ libAgence?: string }>(resp);
              return {
                codeAgence,
                libAgence: agence?.libAgence || `Agence ${codeAgence}`,
              };
            } catch {
              return null;
            }
          }),
        );

        const nextMap = new Map<number, string>();
        for (const agence of agencesResponses) {
          if (!agence) continue;
          nextMap.set(agence.codeAgence, agence.libAgence);
        }
        setAgenceMap(nextMap);
      } else {
        setAgenceMap(new Map());
      }
    } catch {
      setApiDossiers([]);
      setAgenceMap(new Map());
      setClientMapByDossier(new Map());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const monthlyKeys = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      };
    });
  }, []);

  const getAgenceLabel = (rawCodeAgence: unknown) => {
    const code = Number(rawCodeAgence);
    if (!Number.isFinite(code)) return '-';
    return agenceMap.get(code) || `Agence ${code}`;
  };

  const getClientLabel = (d: any) => {
    const dossierNum = Number(d?.numDossier);
    if (Number.isFinite(dossierNum) && clientMapByDossier.has(dossierNum)) {
      return clientMapByDossier.get(dossierNum) || '-';
    }
    return d?.nomClient || d?.noPieceClient || '-';
  };

  const dataDriven = useMemo(() => {
    const toNum = (v: unknown) => (typeof v === 'number' ? v : Number(v || 0));
    const total = apiDossiers.length;
    const active = apiDossiers.filter((d) => d.etatDossier === 'V').length;
    const suspended = apiDossiers.filter((d) => d.etatDossier === 'B').length;
    const closed = apiDossiers.filter((d) => d.etatDossier === 'C').length;
    const totalEngaged = apiDossiers.reduce((sum, d) => sum + toNum(d.mntAutorise) + toNum(d.mntAutoriseBct), 0);

    const byMonth = new Map(monthlyKeys.map((m) => [m.key, { mois: m.label, ouvertures: 0, clotures: 0, suspensions: 0, montant: 0 }]));
    for (const d of apiDossiers) {
      const date = d.dateDossier ? new Date(d.dateDossier) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const row = byMonth.get(key);
      if (!row) continue;
      row.ouvertures += 1;
      row.montant += toNum(d.mntAutorise) + toNum(d.mntAutoriseBct);
      if (d.etatDossier === 'C') row.clotures += 1;
      if (d.etatDossier === 'B') row.suspensions += 1;
    }

    const evolution = Array.from(byMonth.values());
    const montants = evolution.map((e) => ({ mois: e.mois, montant: e.montant }));

    const typeCounts = new Map<number, number>();
    for (const d of apiDossiers) {
      const t = toNum(d.typeDossierAva);
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    const typeLabel: Record<number, string> = { 1: 'Exportateur', 2: 'Marchés à l\'étranger', 3: 'Autres activités', 4: 'Autres activités banques', 5: 'Promoteurs immobiliers' };
    const colors = ['#435B7B', '#6B8CAE', '#A8C0D9', '#2D3E54', '#1e6091', '#D6E4F0'];
    const repartition = Array.from(typeCounts.entries()).map(([type, value], i) => ({
      name: typeLabel[type] || `Type ${type}`,
      value,
      color: colors[i % colors.length],
    }));

    const latest = [...apiDossiers]
      .sort((a, b) => new Date(b.dateDossier || 0).getTime() - new Date(a.dateDossier || 0).getTime())
      .slice(0, 7)
      .map((d) => ({
        num: `AVA-${d.numDossier}`,
        client: getClientLabel(d),
        agence: getAgenceLabel(d.codeAgence),
        devise: 'TND',
        montant: toNum(d.mntAutorise),
        solde: toNum(d.solde),
        statut: d.etatDossier === 'V' ? 'Actif' : d.etatDossier === 'B' ? 'Suspendu' : d.etatDossier === 'C' ? 'Clôturé' : 'Réservé',
        date: d.dateDossier ? new Date(d.dateDossier).toLocaleDateString('fr-FR') : '-',
        op: typeLabel[toNum(d.typeDossierAva)] || `Type ${d.typeDossierAva || '-'}`,
      }));

    const byAgence = new Map<string, { dossiers: number; montant: number; actifs: number }>();
    for (const d of apiDossiers) {
      const key = getAgenceLabel(d.codeAgence);
      const prev = byAgence.get(key) || { dossiers: 0, montant: 0, actifs: 0 };
      prev.dossiers += 1;
      prev.montant += toNum(d.mntAutorise);
      if (d.etatDossier === 'V') prev.actifs += 1;
      byAgence.set(key, prev);
    }
    const agences = Array.from(byAgence.entries())
      .map(([agence, v]) => ({ agence, dossiers: v.dossiers, montant: v.montant, actifs: v.actifs, pct: v.dossiers ? Number(((v.actifs / v.dossiers) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.dossiers - a.dossiers)
      .slice(0, 6);

    const byDevise = new Map<string, { dossiers: number; montant: number }>();
    for (const d of apiDossiers) {
      const devise = String(d.devise || 'TND');
      const prev = byDevise.get(devise) || { dossiers: 0, montant: 0 };
      prev.dossiers += 1;
      prev.montant += toNum(d.mntAutorise) + toNum(d.mntAutoriseBct);
      byDevise.set(devise, prev);
    }
    const devises = Array.from(byDevise.entries())
      .map(([devise, v]) => ({
        devise,
        dossiers: v.dossiers,
        montant: v.montant,
        pct: total ? Number(((v.dossiers / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.montant - a.montant);

    return { total, active, suspended, closed, totalEngaged, evolution, montants, repartition, latest, agences, devises };
  }, [apiDossiers, monthlyKeys, agenceMap, clientMapByDossier]);

  const liveKpiData = [
    {
      label: 'Dossiers AVA Actifs',
      value: dataDriven.active,
      display: dataDriven.active.toLocaleString('fr-TN'),
      sub: '+83 ce mois',
      trend: 'up', pct: '+7.1%',
      icon: FolderOpen,
      color: '#435B7B', bg: '#EEF3F7',
      accent: '#435B7B',
      gradStart: '#6B8CAE', gradEnd: '#435B7B',
    },
    {
      label: 'Montant Total Engagé',
      value: dataDriven.totalEngaged,
      display: fmtTND(dataDriven.totalEngaged),
      unit: 'TND',
      sub: '+12.4% vs mois préc.',
      trend: 'up', pct: '+12.4%',
      icon: DollarSign,
      color: '#435B7B', bg: '#EEF3F7',
      accent: '#435B7B',
      gradStart: '#6B8CAE', gradEnd: '#435B7B',
    },
    {
      label: 'Clôtures ce mois',
      value: dataDriven.closed,
      display: dataDriven.closed.toLocaleString('fr-TN'),
      sub: '+15 vs mois préc.',
      trend: 'up', pct: '+20.2%',
      icon: CheckCircle2,
      color: '#435B7B', bg: '#EEF3F7',
      accent: '#435B7B',
      gradStart: '#6B8CAE', gradEnd: '#435B7B',
    },
    {
      label: 'Dossiers Suspendus',
      value: dataDriven.suspended,
      display: dataDriven.suspended.toLocaleString('fr-TN'),
      sub: '−5 depuis 30 jours',
      trend: 'down', pct: '−17.9%',
      icon: PauseCircle,
      color: '#435B7B', bg: '#EEF3F7',
      accent: '#435B7B',
      gradStart: '#6B8CAE', gradEnd: '#435B7B',
    },
  ];

  const liveAlertes = [
    { type: 'info',    msg: `${dataDriven.total} dossiers chargés depuis l'API`,           action: 'Rafraîchir', actionSection: '',                       icon: Activity   },
    { type: 'warning', msg: `${dataDriven.suspended} dossiers actuellement suspendus`,     action: 'Consulter',  actionSection: 'ava-levee-suspension',    icon: ShieldAlert },
    { type: 'success', msg: `${dataDriven.active} dossiers actifs et exploitables`,        action: 'Voir',       actionSection: 'ava-consultation-dossier', icon: CheckCircle2 },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setTimeout(() => setRefreshing(false), 600));
  };

  const handleRowClick = (op: any) => {
    if (op.statut === 'Clôturé') return;
    setSelectedOperation(op);
    setShowActionModal(true);
  };

  return (
    <>
    <div style={{ padding: '24px', background: '#f4f7fa', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div className="anim-fade-in-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#6B8CAE,#2D3E54)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(67,91,123,0.3)',
            }}>
              <BarChart3 style={{ width: 19, height: 19, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ color: '#2D3E54', margin: 0, fontSize: 20, fontWeight: 800 }}>Tableau de bord</h1>
              <p style={{ color: '#6B8CAE', fontSize: 12.5, margin: 0, textTransform: 'capitalize' }}>
                {today}{loading ? ' • Chargement API...' : ''}
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid #d1dce6', background: '#fff',
              color: '#435B7B', fontSize: 12.5, cursor: 'pointer',
              transition: 'all 0.15s', fontWeight: 500,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF3F7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: refreshing ? 'spin-slow 0.7s linear infinite' : 'none' }} />
            Actualiser
          </button>
          <button
            onClick={() => onNavigate?.('ava-generation-dossier')}
            style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg,#435B7B,#2D3E54)',
            color: '#fff', fontSize: 12.5, cursor: 'pointer',
            fontWeight: 600,
            boxShadow: '0 2px 10px rgba(45,62,84,0.2)',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(45,62,84,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(45,62,84,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            <FileText style={{ width: 14, height: 14 }} />
            Exporter rapport
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 22 }}>
        {liveKpiData.map((k, i) => {
          const kpiNav: Record<string, string> = {
            'Dossiers AVA Actifs':  'ava-consultation-dossier',
            'Montant Total Engagé': 'ava-consultation-dossier',
            'Clôtures ce mois':     'ava-cloture-dossier',
            'Dossiers Suspendus':   'ava-levee-suspension',
          };
          return (
            <div key={k.label} style={{ cursor: 'pointer' }} onClick={() => onNavigate?.(kpiNav[k.label] || 'ava-consultation-dossier')}>
              <KpiCard k={k} index={i} />
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="anim-fade-in-up delay-300" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, marginBottom: 22 }}>

        {/* Evolution Chart */}
        <Panel>
          <PanelHeader
            title="Évolution des Dossiers AVA"
            subtitle="12 derniers mois — ouvertures, clôtures, suspensions"
            icon={<Activity style={{ width: 15, height: 15, color: '#435B7B' }} />}
            action={
              <div style={{ display: 'flex', gap: 5, background: '#f4f7fa', borderRadius: 9, padding: 3 }}>
                {(['evolution', 'montants'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    style={{
                      padding: '5px 13px', borderRadius: 7, border: 'none', fontSize: 12, cursor: 'pointer',
                      background: activeTab === t ? '#fff' : 'transparent',
                      color: activeTab === t ? '#2D3E54' : '#6B8CAE',
                      fontWeight: activeTab === t ? 600 : 400,
                      boxShadow: activeTab === t ? '0 1px 4px rgba(67,91,123,0.12)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                    {t === 'evolution' ? 'Dossiers' : 'Montants'}
                  </button>
                ))}
              </div>
            }
          />
          <div style={{ padding: '16px 10px 12px' }}>
            {activeTab === 'evolution' ? (
              <ResponsiveContainer width="100%" height={245}>
                <BarChart data={dataDriven.evolution} barGap={2} barCategoryGap="32%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6B8CAE' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B8CAE' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(67,91,123,0.04)', radius: 6 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#6B8CAE', paddingTop: 6 }} />
                  <Bar dataKey="ouvertures"  name="Ouvertures"  fill="#435B7B" radius={[5,5,0,0]} />
                  <Bar dataKey="clotures"    name="Clôtures"    fill="#6B8CAE" radius={[5,5,0,0]} />
                  <Bar dataKey="suspensions" name="Suspensions" fill="#f59e0b" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={245}>
                <AreaChart data={dataDriven.montants}>
                  <defs>
                    <linearGradient id="montGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#435B7B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#435B7B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6B8CAE' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B8CAE' }} axisLine={false} tickLine={false} width={55} tickFormatter={fmtM} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area type="monotone" dataKey="montant" name="Montant TND" stroke="#435B7B" strokeWidth={2.5}
                    fill="url(#montGrad)" dot={{ fill: '#435B7B', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2D3E54', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        {/* Pie Chart */}
        <Panel>
          <PanelHeader
            title="Répartition par Opération"
            subtitle={`Distribution des ${(dataDriven.total).toLocaleString('fr-TN')} dossiers`}
            icon={<Globe style={{ width: 15, height: 15, color: '#435B7B' }} />}
          />
          <div style={{ padding: '12px 20px 8px' }}>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={dataDriven.repartition} cx="50%" cy="50%" innerRadius={48} outerRadius={76}
                  dataKey="value" paddingAngle={4} strokeWidth={0}>
                  {dataDriven.repartition.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
              {dataDriven.repartition.map((e) => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#435B7B' }}>{e.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2D3E54' }}>{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Table + Devises ── */}
      <div className="anim-fade-in-up delay-400" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, marginBottom: 22 }}>

        {/* Derniers Dossiers */}
        <Panel>
          <PanelHeader
            title="Dernières Opérations"
            subtitle="7 opérations les plus récentes"
            icon={<FileText style={{ width: 15, height: 15, color: '#435B7B' }} />}
            action={
              <button
                onClick={() => onNavigate?.('ava-consultation-dossier')}
                style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                color: '#435B7B', background: '#EEF3F7', border: '1px solid #D6E4F0',
                borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                fontWeight: 600, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E0EAF3'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#EEF3F7'; }}
              >
                Voir tout <ChevronRight style={{ width: 13, height: 13 }} />
              </button>
            }
          />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafb' }}>
                  {['N° Dossier', 'Client', 'Agence', 'Opération', 'Statut', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#6B8CAE', fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1px solid #f0f3f7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dataDriven.latest.length ? dataDriven.latest : derniersDossiers).map((d, i) => {
                  const s = statutStyle[d.statut] || statutStyle['Actif'];
                  return (
                    <tr
                      key={d.num}
                      style={{
                        borderBottom: '1px solid #f8fafb',
                        background: i % 2 === 0 ? '#fff' : '#fafbfc',
                        transition: 'background 0.12s, transform 0.1s',
                        cursor: d.statut === 'Clôturé' ? 'default' : 'pointer',
                      }}
                      onClick={() => handleRowClick(d)}
                      onMouseEnter={e => { if (d.statut !== 'Clôturé') (e.currentTarget as HTMLElement).style.background = '#EEF3F7'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#fafbfc'; }}
                    >
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#435B7B', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {d.num}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#2D3E54', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {d.client}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6B8CAE', whiteSpace: 'nowrap' }}>
                        {d.agence}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6B8CAE', whiteSpace: 'nowrap' }}>
                        {d.op}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, background: s.bg, color: s.text,
                          borderRadius: 20, padding: '3px 10px',
                          display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                        }}>
                          <span className={d.statut === 'Actif' ? 'pulse-dot' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                          {d.statut}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 11.5, color: '#A8C0D9', whiteSpace: 'nowrap' }}>
                        {d.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Répartition Devises */}
        <Panel>
          <PanelHeader
            title="Répartition par Devise"
            subtitle="Part des engagements"
            icon={<DollarSign style={{ width: 15, height: 15, color: '#435B7B' }} />}
          />
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(dataDriven.devises.length ? dataDriven.devises : []).map((d) => (
                <div key={d.devise}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 36, fontSize: 11, fontWeight: 800, color: '#435B7B',
                        background: 'linear-gradient(135deg,#EEF3F7,#E0EAF3)',
                        border: '1px solid #D6E4F0',
                        borderRadius: 6, padding: '2px 6px', textAlign: 'center',
                      }}>{d.devise}</span>
                      <span style={{ fontSize: 12, color: '#6B8CAE' }}>{d.dossiers} dossiers</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2D3E54' }}>{d.pct}%</span>
                  </div>
                  <div style={{ height: 7, background: '#EEF3F7', borderRadius: 10, overflow: 'hidden' }}>
                    <div
                      className="progress-animated"
                      style={{
                        height: '100%', width: `${d.pct}%`,
                        background: 'linear-gradient(90deg,#435B7B,#6B8CAE)',
                        borderRadius: 10,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: '#A8C0D9', marginTop: 3 }}>{fmtTND(d.montant)} TND</div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f3f7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6B8CAE', marginBottom: 2 }}>Total engagé</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#2D3E54', lineHeight: 1 }}>{fmtTND(dataDriven.totalEngaged)}</div>
                  <div style={{ fontSize: 11, color: '#A8C0D9', marginTop: 2 }}>TND</div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: '#16a34a', background: '#f0fdf4',
                  border: '1px solid #bbf7d0', borderRadius: 8, padding: '4px 10px',
                }}>
                  <ArrowUpRight style={{ width: 12, height: 12 }} />
                  {dataDriven.total > 0 ? `${dataDriven.active} actifs` : '0 actif'}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Alertes + Stats Agences ── */}
      <div className="anim-fade-in-up delay-500" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Alertes */}
        <Panel>
          <PanelHeader
            title="Alertes & Notifications"
            subtitle="Actions en attente"
            icon={<Activity style={{ width: 15, height: 15, color: '#435B7B' }} />}
          />
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(liveAlertes.length ? liveAlertes : alertes).map((a, i) => {
              const st = alerteStyle[a.type];
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className={`anim-fade-in-up delay-${i * 100 + 500}`}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 12,
                    background: st.bg,
                    border: `1px solid ${st.border}22`,
                    borderLeft: `3px solid ${st.border}`,
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 3px 12px ${st.border}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${st.border}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 15, height: 15, color: st.icon }} />
                  </div>
                  <p style={{ fontSize: 12.5, color: '#2D3E54', margin: 0, lineHeight: 1.5, flex: 1 }}>{a.msg}</p>
                  <button
                    onClick={() => {
                      if (a.action === 'Rafraîchir') handleRefresh();
                      else if ((a as any).actionSection) onNavigate?.((a as any).actionSection);
                    }}
                    style={{
                    fontSize: 11, color: st.actionColor, background: st.actionBg,
                    border: 'none', borderRadius: 7, padding: '4px 10px',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    {a.action}
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Statistiques par Agence */}
        <Panel>
          <PanelHeader
            title="Statistiques par Agence"
            subtitle="Performance et taux d'activité"
            icon={<Building2 style={{ width: 15, height: 15, color: '#435B7B' }} />}
          />
          <div style={{ padding: '0 0 4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafb' }}>
                  {['Agence', 'Dossiers', 'Montant', 'Taux actifs'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#6B8CAE', fontWeight: 700, borderBottom: '1px solid #f0f3f7', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dataDriven.agences.length ? dataDriven.agences : statAgences).map((a, i) => (
                  <tr
                    key={a.agence}
                    style={{
                      borderBottom: '1px solid #f8fafb',
                      background: i === 0 ? '#FAFCFF' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF3F7'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i === 0 ? '#FAFCFF' : 'transparent'; }}
                  >
                    <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#2D3E54', fontWeight: i === 0 ? 700 : 500 }}>
                      {i === 0 && <span style={{ display: 'inline-block', width: 5, height: 5, background: '#22c55e', borderRadius: '50%', marginRight: 7, verticalAlign: 'middle' }} />}
                      {a.agence}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#435B7B', fontWeight: 700 }}>
                      {a.dossiers.toLocaleString('fr-TN')}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#6B8CAE' }}>
                      {fmtM(a.montant)}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#EEF3F7', borderRadius: 10, overflow: 'hidden', minWidth: 55 }}>
                          <div
                            className="progress-animated"
                            style={{
                              height: '100%', width: `${a.pct}%`,
                              background: a.pct >= 90 ? 'linear-gradient(90deg,#34d399,#22c55e)' : a.pct >= 85 ? 'linear-gradient(90deg,#6B8CAE,#435B7B)' : 'linear-gradient(90deg,#fbbf24,#f59e0b)',
                              borderRadius: 10,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11.5, color: '#2D3E54', fontWeight: 600, minWidth: 36 }}>{a.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer totaux */}
          <div style={{
            margin: '0 16px 16px',
            padding: '14px 16px', borderRadius: 12,
            background: 'linear-gradient(135deg,#EEF3F7,#F4F8FC)',
            border: '1px solid #D6E4F0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 12,
          }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6B8CAE', marginBottom: 2 }}>Total dossiers</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2D3E54', lineHeight: 1 }}>{dataDriven.total.toLocaleString('fr-TN')}</div>
              </div>
              <div style={{ width: 1, background: '#D6E4F0' }} />
              <div>
                <div style={{ fontSize: 11, color: '#6B8CAE', marginBottom: 2 }}>Agences actives</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2D3E54', lineHeight: 1 }}>{dataDriven.agences.length.toLocaleString('fr-TN')}</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: '#16a34a', background: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px',
            }}>
              <CheckCircle2 style={{ width: 13, height: 13 }} />
              <span style={{ fontWeight: 600 }}>Nominal</span>
            </div>
          </div>
        </Panel>
      </div>

    </div>

    {/* ── Actions Rapides Modal ── */}
    <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
      <DialogContent style={{ maxWidth: 580 }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#2D3E54', fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Actions Rapides
          </DialogTitle>
        </DialogHeader>

        {/* Dossier summary */}
        {selectedOperation && (
          <div style={{
            background: 'linear-gradient(135deg,#EEF3F7,#f8fafc)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            border: '1px solid #d1dce8', display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12,
          }}>
            {[
              { label: 'Dossier',          value: selectedOperation.num,   mono: true  },
              { label: 'Client',           value: selectedOperation.client, mono: false },
              { label: 'Agence',           value: selectedOperation.agence, mono: false },
              { label: 'Solde disponible', value: `${fmtTND(selectedOperation.solde ?? selectedOperation.montant ?? 0)} TND`, mono: false, highlight: true },
            ].map(({ label, value, mono, highlight }) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: '#6B8CAE', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2, letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: highlight ? 800 : 600, color: highlight ? '#435B7B' : '#2D3E54', fontFamily: mono ? 'monospace' : 'inherit', lineHeight: 1.3 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Action grid */}
        {(() => {
          const isSuspendu = selectedOperation?.statut === 'Suspendu';
          const allActions: { label: string; section: string; Icon: React.ElementType; color: string }[] = [
            { label: 'Frais de Voyage',        section: 'ava-frais-voyage',            Icon: Plane,       color: '#3B82F6' },
            { label: 'Réservation',             section: 'ava-reservation',             Icon: Calendar,    color: '#8B5CF6' },
            { label: 'Annulation Réservation',  section: 'ava-annulation-reservation',  Icon: XCircle,     color: '#EF4444' },
            { label: 'Suspension',              section: 'ava-suspension',              Icon: PauseCircle, color: '#F59E0B' },
            { label: 'Levée de Suspension',     section: 'ava-levee-suspension',        Icon: Play,        color: '#10B981' },
            { label: 'Alimentation BCT',        section: 'ava-alimentation-accord-bct', Icon: Banknote,    color: '#06B6D4' },
            { label: 'Rétrocession',            section: 'ava-retrocession',            Icon: Repeat2,     color: '#6366F1' },
            { label: 'Mise à jour Bénéf.',      section: 'ava-beneficiaires',           Icon: Users,       color: '#0EA5E9' },
            { label: 'Clôture Dossier',         section: 'ava-cloture-dossier',         Icon: Lock,        color: '#64748B' },
            { label: 'Alimentation Export.',    section: 'ava-alimentation',            Icon: FileOutput,  color: '#D97706' },
            { label: 'Consultation',            section: 'ava-consultation-dossier',    Icon: Search,      color: '#7C3AED' },
            { label: 'Génération Documents',    section: 'ava-generation-dossier',      Icon: FileText,    color: '#059669' },
          ];
          const actions = isSuspendu
            ? allActions.filter(a => a.section === 'ava-levee-suspension')
            : allActions;
          return (
            <div style={{ display: 'grid', gridTemplateColumns: isSuspendu ? '1fr' : '1fr 1fr 1fr 1fr', gap: 8, maxWidth: isSuspendu ? 220 : 'none', margin: isSuspendu ? '0 auto' : undefined }}>
              {actions.map(({ label, section, Icon, color }) => (
                <button
                  key={section}
                  onClick={() => { setShowActionModal(false); onNavigate?.(section, selectedOperation?.num); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 7, padding: '14px 6px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${color}28`, background: '#fff',
                    transition: 'all 0.14s', fontSize: 10.5, fontWeight: 600, color: '#2D3E54',
                    minHeight: 78, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = `${color}0e`;
                    el.style.borderColor = `${color}55`;
                    el.style.transform = 'translateY(-2px)';
                    el.style.boxShadow = `0 4px 12px ${color}22`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = '#fff';
                    el.style.borderColor = `${color}28`;
                    el.style.transform = 'translateY(0)';
                    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, background: `${color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon style={{ width: 16, height: 16, color }} />
                  </div>
                  <span style={{ textAlign: 'center', lineHeight: 1.35 }}>{label}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
    </>
  );
}