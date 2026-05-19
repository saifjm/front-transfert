import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  Controls, MiniMap, useNodesState, useEdgesState, addEdge,
  Handle, Position, MarkerType, useReactFlow,
} from '@xyflow/react';
import type { NodeProps, Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { authenticatedFetch } from '../utils/api';
import { toast } from 'sonner';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import {
  X, Save, Plus, Trash2, Activity,
  RefreshCw, GitBranch, LayoutTemplate, Search, Play, Pause,
  SkipForward, Info, Link2, Server, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type WFNodeType = 'HUMAN' | 'SYSTEM';
type FinalizePolicy = 'NEVER' | 'ALWAYS' | 'BY_DECISION';
type DecisionBehavior = 'GO_FORWARD' | 'GO_TO_NODE' | 'END_PROCESS' | 'STAY';

interface DecisionDraft {
  decisionId?: number;
  tag: string;
  label?: string;
  behavior: DecisionBehavior;
  sodMode: string;
  requiresComment: boolean;
  targetNodeKey?: string;
  finalize: boolean;
  wfFinalize: boolean;
  // transition rule fields
  ruleId?: number;
  priority: number;
  conditionExpr?: string;
  manualChoiceGroup?: string;
  serviceAction?: string;
}

interface AssignRuleDraft {
  assignRuleId?: number;
  candidateRoleCode?: string;
  candidateUserId?: string;
  priority: number;
}

interface NodeData extends Record<string, unknown> {
  label: string;
  nodeKey: string;
  nodeType: WFNodeType;
  finalizePolicy: FinalizePolicy;
  claimEnabled: boolean;
  nodeId?: number;
  decisions: DecisionDraft[];
  assignmentRules: AssignRuleDraft[];
}

interface WfDefinition {
  wfDefId: number;
  operationKey: string;
  label?: string;
  description?: string;
  active: boolean;
  version?: number;
  baseUrl?: string;
  endpointTemplate?: string;
  httpMethod?: string;
  respBkPath?: string;
  payloadBkField?: string;
}

interface WfNode {
  nodeId: number;
  wfDefinition?: { wfDefId: number };
  nodeKey: string;
  label?: string;
  nodeType: WFNodeType;
  finalizePolicy: FinalizePolicy;
  claimEnabled: boolean;
}

interface WfDecision {
  decisionId: number;
  node?: { nodeId: number };
  tag: string;
  label?: string;
  behavior: DecisionBehavior;
  requiresComment: boolean;
  sodMode?: string;
}

interface WfTransitionRule {
  ruleId: number;
  decision?: { decisionId: number };
  priority: number;
  targetNodeKey?: string;
  metierFinalize: boolean;
  wfFinalize: boolean;
  conditionExpr?: string;
  manualChoiceGroup?: string;
  serviceAction?: string;
}

interface WfAssignmentRule {
  assignRuleId: number;
  node?: { nodeId: number };
  candidateRoleCode?: string;
  candidateUserId?: number;
  priority: number;
}

interface WfOperation {
  wfOpId: number;
  businessKey: string;
  status: string;
  currentNodeKey?: string;
  createdAt: string;
  wfDefinition?: { operationKey: string; label?: string; wfDefId: number };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function wfAdminHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': sessionStorage.getItem('wf_user_id') ?? '1',
    'X-Role-Code': sessionStorage.getItem('wf_role_code') ?? 'ADMIN',
  };
  const org = sessionStorage.getItem('wf_org_node_id');
  if (org) h['X-Org-Node-Id'] = org;
  return h;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authenticatedFetch(`/api/wf/admin${path}`, {
    ...init,
    headers: { ...wfAdminHeaders(), ...((init.headers as Record<string, string>) ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// ─── Template ─────────────────────────────────────────────────────────────────

const edgeBase = (id: string, source: string, target: string, label: string, color: string, bg: string): Edge => ({
  id, source, target, label, type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color },
  style: { stroke: color, strokeWidth: 2 },
  labelStyle: { fontSize: 10, fontWeight: 700, fill: color },
  labelBgStyle: { fill: bg },
  labelBgBorderRadius: 4,
  labelBgPadding: [4, 6] as [number, number],
});

const TEMPLATE_NODES: Node[] = [
  { id: '_start', type: 'startNode', position: { x: 50, y: 210 }, data: {} },
  {
    id: 'SAISIE_AGENCE', type: 'humanNode', position: { x: 220, y: 150 },
    data: {
      label: "Saisie à l'agence", nodeKey: 'SAISIE_AGENCE', nodeType: 'HUMAN' as WFNodeType,
      finalizePolicy: 'NEVER' as FinalizePolicy, claimEnabled: false,
      decisions: [{ tag: 'SOUMETTRE', label: 'Soumettre', behavior: 'GO_FORWARD' as DecisionBehavior, requiresComment: false, targetNodeKey: 'SERVICE_CENTRAL', finalize: false, wfFinalize: false }],
      assignmentRules: [{ candidateRoleCode: 'AGENT_AGENCE', priority: 1 }],
    } as NodeData,
  },
  {
    id: 'SERVICE_CENTRAL', type: 'humanNode', position: { x: 500, y: 150 },
    data: {
      label: 'Service Central', nodeKey: 'SERVICE_CENTRAL', nodeType: 'HUMAN' as WFNodeType,
      finalizePolicy: 'BY_DECISION' as FinalizePolicy, claimEnabled: true,
      decisions: [
        { tag: 'APPROUVER', label: 'Approuver', behavior: 'END_PROCESS' as DecisionBehavior, requiresComment: false, finalize: true, wfFinalize: true },
        { tag: 'REJETER', label: 'Rejeter', behavior: 'END_PROCESS' as DecisionBehavior, requiresComment: true, finalize: false, wfFinalize: true },
        { tag: 'RETOUR_AGENCE', label: 'Retour agence', behavior: 'GO_TO_NODE' as DecisionBehavior, requiresComment: true, targetNodeKey: 'SAISIE_AGENCE', finalize: false, wfFinalize: false },
      ],
      assignmentRules: [{ candidateRoleCode: 'CHEF_SERVICE_CENTRAL', priority: 1 }],
    } as NodeData,
  },
  { id: '_end', type: 'endNode', position: { x: 760, y: 210 }, data: {} },
];

const TEMPLATE_EDGES: Edge[] = [
  { id: 'e1', source: '_start', target: 'SAISIE_AGENCE', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#435B7B' }, style: { stroke: '#435B7B', strokeWidth: 2 } },
  edgeBase('e2', 'SAISIE_AGENCE', 'SERVICE_CENTRAL', 'SOUMETTRE', '#435B7B', '#EEF3F7'),
  edgeBase('e3', 'SERVICE_CENTRAL', 'SAISIE_AGENCE', 'RETOUR_AGENCE', '#f59e0b', '#fffbeb'),
  edgeBase('e4', 'SERVICE_CENTRAL', '_end', 'APPROUVER', '#16a34a', '#f0fdf4'),
  edgeBase('e5', 'SERVICE_CENTRAL', '_end', 'REJETER', '#dc2626', '#fff1f2'),
];

// ─── Custom nodes ─────────────────────────────────────────────────────────────

function StartNode({ selected }: NodeProps) {
  return (
    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#435B7B,#2D3E54)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: selected ? '0 0 0 3px #435B7B55' : '0 2px 8px #435B7B33', border: '3px solid white' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white' }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: '#435B7B', border: '2px solid white' }} />
    </div>
  );
}

function EndNode({ selected }: NodeProps) {
  return (
    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#2D3E54,#1a2535)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: selected ? '0 0 0 3px #2D3E5455' : '0 2px 8px #435B7B33', border: '3px solid white' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '3px solid white' }} />
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: '#2D3E54', border: '2px solid white' }} />
    </div>
  );
}

function HumanNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <div style={{ background: 'white', border: `1px solid ${selected ? '#435B7B' : '#d1dce6'}`, borderTop: '4px solid #435B7B', borderRadius: 10, padding: '10px 14px', minWidth: 175, boxShadow: selected ? '0 0 0 2px #435B7B30,0 4px 16px #435B7B20' : '0 2px 8px #435B7B12', transition: 'box-shadow 0.15s', cursor: 'pointer' }}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: '#6B8CAE', border: '2px solid white' }} />
      <div style={{ display: 'flex', gap: 7, marginBottom: 5, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>🧑</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3E54', lineHeight: 1.3, wordBreak: 'break-word' }}>{d.label || 'Étape humaine'}</span>
      </div>
      {d.nodeKey && <div style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#A8C0D9', marginBottom: 6 }}>{d.nodeKey}</div>}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#435B7B', background: '#EEF3F7', padding: '2px 7px', borderRadius: 5 }}>HUMAN</span>
        <span style={{ fontSize: 9.5, color: '#6B8CAE', background: '#F4F8FC', padding: '2px 7px', borderRadius: 5 }}>{d.finalizePolicy}</span>
        {d.claimEnabled && <span style={{ fontSize: 9.5, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: 5 }}>CLAIM</span>}
      </div>
      {(d.decisions as DecisionDraft[])?.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid #f0f3f7', paddingTop: 5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {(d.decisions as DecisionDraft[]).map((dec, i) => (
            <span key={i} style={{ fontSize: 9, color: '#435B7B', background: '#F4F8FC', border: '1px solid #e4edf5', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{dec.tag}</span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: '#6B8CAE', border: '2px solid white' }} />
    </div>
  );
}

function SystemNode({ data, selected }: NodeProps) {
  const d = data as NodeData;
  return (
    <div style={{ background: 'white', border: `1px solid ${selected ? '#0d9488' : '#d1dce6'}`, borderTop: '4px solid #0d9488', borderRadius: 10, padding: '10px 14px', minWidth: 175, boxShadow: selected ? '0 0 0 2px #0d948830,0 4px 16px #0d948820' : '0 2px 8px #435B7B12', transition: 'box-shadow 0.15s', cursor: 'pointer' }}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: '#0d9488', border: '2px solid white' }} />
      <div style={{ display: 'flex', gap: 7, marginBottom: 5, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>⚙️</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3E54', lineHeight: 1.3, wordBreak: 'break-word' }}>{d.label || 'Étape système'}</span>
      </div>
      {d.nodeKey && <div style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#A8C0D9', marginBottom: 6 }}>{d.nodeKey}</div>}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0d9488', background: '#f0fdfa', padding: '2px 7px', borderRadius: 5 }}>SYSTEM</span>
        <span style={{ fontSize: 9.5, color: '#6B8CAE', background: '#F4F8FC', padding: '2px 7px', borderRadius: 5 }}>{d.finalizePolicy}</span>
      </div>
      {(d.decisions as DecisionDraft[])?.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid #f0f3f7', paddingTop: 5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {(d.decisions as DecisionDraft[]).map((dec, i) => (
            <span key={i} style={{ fontSize: 9, color: '#0d9488', background: '#f0fdfa', border: '1px solid #99f6e4', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{dec.tag}</span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: '#0d9488', border: '2px solid white' }} />
    </div>
  );
}

const nodeTypes = { startNode: StartNode, endNode: EndNode, humanNode: HumanNode, systemNode: SystemNode };

// ─── Monitoring Panel ─────────────────────────────────────────────────────────

function MonitoringPanel({ onClose }: { onClose: () => void }) {
  const [ops, setOps] = useState<WfOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<any>('/operations?page=0&size=50');
      setOps(Array.isArray(data) ? data : (data.content ?? []));
    } catch { showError('Erreur chargement opérations'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = ops.filter(o => o.businessKey.toLowerCase().includes(search.toLowerCase()) || (o.currentNodeKey ?? '').toLowerCase().includes(search.toLowerCase()));
  const suspend = async (id: number) => { try { await adminFetch(`/operations/${id}/suspend`, { method: 'PUT' }); toast.success('Suspendu'); load(); } catch (e) { showError((e as Error).message); } };
  const resume = async (id: number) => { try { await adminFetch(`/operations/${id}/resume`, { method: 'PUT' }); toast.success('Repris'); load(); } catch (e) { showError((e as Error).message); } };
  const forceAdvance = async (id: number) => { try { await adminFetch(`/operations/${id}/force-advance`, { method: 'POST', body: '{}' }); toast.success('Avancé'); load(); } catch (e) { showError((e as Error).message); } };
  const statusColor: Record<string, string> = { ACTIVE: '#16a34a', SUSPENDED: '#f59e0b', COMPLETED: '#6B8CAE', ERROR: '#dc2626' };
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 560, background: 'white', borderLeft: '1px solid #d1dce6', zIndex: 20, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(67,91,123,0.12)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8edf2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity style={{ width: 17, height: 17, color: '#435B7B' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#2D3E54', flex: 1 }}>Monitoring opérations</span>
        <button onClick={() => { void load(); }} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #d1dce6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B8CAE' }}><RefreshCw style={{ width: 12, height: 12 }} /></button>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #d1dce6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B8CAE' }}><X style={{ width: 14, height: 14 }} /></button>
      </div>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e8edf2' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#A8C0D9' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #d1dce6', borderRadius: 7, fontSize: 12.5, color: '#2D3E54', outline: 'none', background: '#F4F8FC', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><RefreshCw style={{ width: 22, height: 22, color: '#A8C0D9', animation: 'spin 0.8s linear infinite' }} /></div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#A8C0D9', fontSize: 13 }}>Aucune opération</div>
          : filtered.map(op => (
            <div key={op.wfOpId} style={{ padding: '11px 18px', borderBottom: '1px solid #f0f3f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2D3E54' }}>{op.businessKey}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[op.status] ?? '#6B8CAE', background: (statusColor[op.status] ?? '#6B8CAE') + '18', padding: '2px 8px', borderRadius: 20 }}>{op.status}</span>
                {op.currentNodeKey && <span style={{ fontSize: 10, color: '#6B8CAE', background: '#F4F8FC', padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace' }}>{op.currentNodeKey}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {op.status === 'ACTIVE' && <button onClick={() => suspend(op.wfOpId)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}><Pause style={{ width: 11, height: 11 }} /> Suspendre</button>}
                {op.status === 'SUSPENDED' && <button onClick={() => resume(op.wfOpId)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}><Play style={{ width: 11, height: 11 }} /> Reprendre</button>}
                <button onClick={() => forceAdvance(op.wfOpId)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #d1dce6', background: '#F4F8FC', color: '#435B7B', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}><SkipForward style={{ width: 11, height: 11 }} /> Forcer avance</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Right Config Panel ───────────────────────────────────────────────────────

const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1px solid #d1dce6', borderRadius: 7, fontSize: 12.5, color: '#2D3E54', outline: 'none', background: '#F4F8FC', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 10.5, fontWeight: 600, color: '#6B8CAE', display: 'block', marginBottom: 4 };

function TabBar({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e8edf2', background: '#F4F8FC' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, transition: 'all 0.15s',
          background: active === t.key ? 'white' : 'transparent',
          color: active === t.key ? '#2D3E54' : '#A8C0D9',
          borderBottom: `2px solid ${active === t.key ? '#435B7B' : 'transparent'}`,
          marginBottom: -1,
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface DefPanelProps {
  def: WfDefinition;
  onSave: (updates: Partial<WfDefinition>) => void;
  saving: boolean;
}

function DefConfigPanel({ def, onSave, saving }: DefPanelProps) {
  const [form, setForm] = useState<Partial<WfDefinition>>({});
  const [showEndpoint, setShowEndpoint] = useState(false);
  const set = (k: keyof WfDefinition, v: any) => setForm(f => ({ ...f, [k]: v }));
  const merged = { ...def, ...form };
  return (
    <ScrollArea style={{ height: '100%' }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEF3F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch style={{ width: 14, height: 14, color: '#435B7B' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#2D3E54' }}>Configuration du flux</span>
        </div>

        <label style={lbl}>Nom du flux (libellé)</label>
        <input style={{ ...inp, marginBottom: 12, fontSize: 14, fontWeight: 600 }} value={merged.label ?? ''} onChange={e => set('label', e.target.value)} placeholder="Ex: Ouverture Dossier AVA" />

        <label style={lbl}>Clé opération (technique)</label>
        <input style={{ ...inp, marginBottom: 12, fontFamily: 'monospace', fontSize: 12 }} value={merged.operationKey} onChange={e => set('operationKey', e.target.value)} placeholder="operations_xxx" />

        <label style={lbl}>Description</label>
        <textarea style={{ ...inp, marginBottom: 12, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }} value={merged.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Description du flux..." />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '8px 12px', background: '#F4F8FC', borderRadius: 8, border: '1px solid #e4edf5' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2D3E54' }}>Flux actif</div>
            <div style={{ fontSize: 11, color: '#6B8CAE' }}>Accepte de nouvelles opérations</div>
          </div>
          <Switch checked={merged.active} onCheckedChange={v => set('active', v)} />
        </div>

        <button onClick={() => setShowEndpoint(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1dce6', background: '#F4F8FC', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#435B7B', marginBottom: showEndpoint ? 0 : 16, boxSizing: 'border-box', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link2 style={{ width: 13, height: 13 }} /> Configuration endpoint</span>
          {showEndpoint ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
        </button>

        {showEndpoint && (
          <div style={{ marginBottom: 16, padding: 12, background: '#F4F8FC', borderRadius: 8, border: '1px solid #e4edf5' }}>
            <label style={lbl}>Base URL</label>
            <input style={{ ...inp, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5 }} value={merged.baseUrl ?? ''} onChange={e => set('baseUrl', e.target.value)} placeholder="https://api.banque.tn/..." />
            <label style={lbl}>Endpoint template</label>
            <input style={{ ...inp, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5 }} value={merged.endpointTemplate ?? ''} onChange={e => set('endpointTemplate', e.target.value)} placeholder="/operations/{businessKey}/process" />
            <label style={lbl}>Méthode HTTP</label>
            <select style={{ ...inp, marginBottom: 8 }} value={merged.httpMethod ?? 'POST'} onChange={e => set('httpMethod', e.target.value)}>
              <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option>
            </select>
            <label style={lbl}>Chemin réponse (JSON path)</label>
            <input style={{ ...inp, marginBottom: 8, fontFamily: 'monospace', fontSize: 11.5 }} value={merged.respBkPath ?? ''} onChange={e => set('respBkPath', e.target.value)} placeholder="$.businessKey" />
            <label style={lbl}>Champ payload</label>
            <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11.5 }} value={merged.payloadBkField ?? ''} onChange={e => set('payloadBkField', e.target.value)} placeholder="numDossier" />
          </div>
        )}

        <button
          disabled={saving || Object.keys(form).length === 0}
          onClick={() => { onSave(form); setForm({}); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: Object.keys(form).length > 0 ? '#435B7B' : '#d1dce6', color: 'white', cursor: Object.keys(form).length > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}
        >
          <Save style={{ width: 14, height: 14 }} /> {saving ? 'Sauvegarde...' : 'Enregistrer la définition'}
        </button>
      </div>
    </ScrollArea>
  );
}

interface RightPanelProps {
  selectedNode: Node | undefined;
  selectedEdge: Edge | undefined;
  selectedDef: WfDefinition | undefined;
  defSaving: boolean;
  onUpdateNode: (id: string, updates: Partial<NodeData>) => void;
  onUpdateEdge: (id: string, label: string) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onAddDecision: (nodeId: string) => void;
  onUpdateDecision: (nodeId: string, idx: number, updates: Partial<DecisionDraft>) => void;
  onRemoveDecision: (nodeId: string, idx: number) => void;
  onAddAssignRule: (nodeId: string) => void;
  onUpdateAssignRule: (nodeId: string, idx: number, updates: Partial<AssignRuleDraft>) => void;
  onRemoveAssignRule: (nodeId: string, idx: number) => void;
  onSaveDef: (updates: Partial<WfDefinition>) => void;
}

function RightPanel(props: RightPanelProps) {
  const { selectedNode, selectedEdge, selectedDef } = props;
  const [nodeTab, setNodeTab] = useState<'config' | 'decisions' | 'assign'>('config');

  const behColors: Record<DecisionBehavior, { color: string; bg: string }> = {
    GO_FORWARD: { color: '#435B7B', bg: '#EEF3F7' },
    GO_TO_NODE: { color: '#f59e0b', bg: '#fffbeb' },
    END_PROCESS: { color: '#16a34a', bg: '#f0fdf4' },
    STAY: { color: '#6B8CAE', bg: '#F4F8FC' },
  };

  if (!selectedNode && !selectedEdge) {
    if (selectedDef) {
      return <DefConfigPanel def={selectedDef} onSave={props.onSaveDef} saving={props.defSaving} />;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F4F8FC', border: '2px solid #e4edf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GitBranch style={{ width: 22, height: 22, color: '#A8C0D9' }} />
        </div>
        <p style={{ fontSize: 13, color: '#6B8CAE', lineHeight: 1.6, margin: 0 }}>Sélectionnez un <strong>flux</strong>, cliquez sur un <strong>nœud</strong> ou une <strong>connexion</strong></p>
        <div style={{ background: '#F4F8FC', borderRadius: 10, padding: '10px 14px', border: '1px solid #e4edf5', width: '100%', textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#435B7B', marginBottom: 6 }}>Comment utiliser</div>
          {[
            '① Choisissez un flux ou créez-en un nouveau',
            '② Glissez des étapes depuis la barre gauche',
            '③ Reliez les étapes en tirant sur ●',
            '④ Cliquez sur un nœud pour le configurer',
            '⑤ Cliquez Enregistrer pour sauvegarder',
          ].map((t, i) => <div key={i} style={{ fontSize: 11, color: '#6B8CAE', marginBottom: 4 }}>{t}</div>)}
        </div>
      </div>
    );
  }

  if (selectedEdge && !selectedNode) {
    return (
      <ScrollArea style={{ height: '100%' }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEF3F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server style={{ width: 14, height: 14, color: '#435B7B' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2D3E54' }}>Connexion / Décision</span>
          </div>
          <label style={lbl}>Tag de décision (clé technique)</label>
          <input style={{ ...inp, marginBottom: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }} value={String(selectedEdge.label ?? '')} placeholder="SOUMETTRE, APPROUVER..." onChange={e => props.onUpdateEdge(selectedEdge.id, e.target.value)} />
          <div style={{ fontSize: 11, color: '#A8C0D9', marginBottom: 16 }}>Ce tag doit correspondre exactement au tag de décision configuré sur le nœud source.</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6B8CAE' }}>Source: <code style={{ background: '#F4F8FC', padding: '1px 5px', borderRadius: 4 }}>{selectedEdge.source}</code></div>
            <div style={{ fontSize: 11, color: '#6B8CAE' }}>→ Target: <code style={{ background: '#F4F8FC', padding: '1px 5px', borderRadius: 4 }}>{selectedEdge.target}</code></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => props.onDeleteEdge(selectedEdge.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
              <Trash2 style={{ width: 14, height: 14 }} /> Supprimer la connexion
            </button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  if (!selectedNode || selectedNode.type === 'startNode' || selectedNode.type === 'endNode') return null;

  const d = selectedNode.data as NodeData;
  const decisions = d.decisions as DecisionDraft[];
  const assignRules = d.assignmentRules as AssignRuleDraft[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabBar
        tabs={[{ key: 'config', label: 'Nœud' }, { key: 'decisions', label: `Décisions (${decisions.length})` }, { key: 'assign', label: `Assignation (${assignRules.length})` }]}
        active={nodeTab} onChange={k => setNodeTab(k as any)}
      />

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {nodeTab === 'config' && (
          <ScrollArea style={{ height: '100%' }}>
            <div style={{ padding: 14 }}>
              <label style={lbl}>Libellé (affiché sur le canvas)</label>
              <input style={{ ...inp, marginBottom: 10, fontSize: 14, fontWeight: 600 }} value={d.label} placeholder="Nom de l'étape..." onChange={e => props.onUpdateNode(selectedNode.id, { label: e.target.value })} />

              <label style={lbl}>Clé technique (nodeKey)</label>
              <input style={{ ...inp, marginBottom: 10, fontFamily: 'monospace', fontSize: 12 }} value={d.nodeKey} placeholder="MON_NOEUD_CLE" onChange={e => props.onUpdateNode(selectedNode.id, { nodeKey: e.target.value.toUpperCase().replace(/\s/g, '_') })} />

              <label style={lbl}>Type de nœud</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {(['HUMAN', 'SYSTEM'] as WFNodeType[]).map(t => (
                  <button key={t} onClick={() => props.onUpdateNode(selectedNode.id, { nodeType: t })} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: `1.5px solid ${d.nodeType === t ? (t === 'HUMAN' ? '#435B7B' : '#0d9488') : '#d1dce6'}`, background: d.nodeType === t ? (t === 'HUMAN' ? '#EEF3F7' : '#f0fdfa') : 'white', color: d.nodeType === t ? (t === 'HUMAN' ? '#435B7B' : '#0d9488') : '#A8C0D9', cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
                    {t === 'HUMAN' ? '🧑 HUMAN' : '⚙️ SYSTEM'}
                  </button>
                ))}
              </div>

              <label style={lbl}>Politique de finalisation</label>
              <select style={{ ...inp, marginBottom: 10 }} value={d.finalizePolicy} onChange={e => props.onUpdateNode(selectedNode.id, { finalizePolicy: e.target.value as FinalizePolicy })}>
                <option value="NEVER">NEVER — jamais auto-finalisé</option>
                <option value="ALWAYS">ALWAYS — toujours finalisé à la sortie</option>
                <option value="BY_DECISION">BY_DECISION — selon la décision</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#F4F8FC', borderRadius: 8, border: '1px solid #e4edf5' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2D3E54' }}>Prise en charge (Claim)</div>
                  <div style={{ fontSize: 11, color: '#6B8CAE' }}>L'utilisateur doit revendiquer la tâche avant de la traiter</div>
                </div>
                <Switch checked={d.claimEnabled} onCheckedChange={v => props.onUpdateNode(selectedNode.id, { claimEnabled: v })} />
              </div>

              {d.nodeId && (
                <div style={{ marginTop: 14, padding: '6px 10px', background: '#f0fdf4', borderRadius: 7, border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: 10.5, color: '#15803d', fontFamily: 'monospace' }}>nodeId: {d.nodeId} · Nœud existant en base</span>
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e8edf2' }}>
                <button onClick={() => props.onDeleteNode(selectedNode.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                  <Trash2 style={{ width: 14, height: 14 }} /> Supprimer ce nœud
                </button>
              </div>
            </div>
          </ScrollArea>
        )}

        {nodeTab === 'decisions' && (
          <ScrollArea style={{ height: '100%' }}>
            <div style={{ padding: 14 }}>
              {decisions.length === 0 && <div style={{ fontSize: 11, color: '#A8C0D9', marginBottom: 12, fontStyle: 'italic' }}>Aucune décision. Cliquez "Ajouter" pour en créer une.</div>}
              {decisions.map((dec, i) => {
                const bc = behColors[dec.behavior] ?? behColors.GO_FORWARD;
                const secHdr = (t: string) => <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '10px 0 6px', paddingTop: 8, borderTop: '1px solid #edf1f6' }}>{t}</div>;
                return (
                  <div key={i} style={{ marginBottom: 12, padding: 12, background: 'white', borderRadius: 10, border: `1.5px solid ${bc.bg}`, boxShadow: '0 1px 4px rgba(67,91,123,0.06)' }}>
                    {/* header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: bc.color, background: bc.bg, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>{dec.behavior}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#2D3E54', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dec.tag || '—'}</span>
                      <button onClick={() => props.onRemoveDecision(selectedNode.id, i)} style={{ width: 26, height: 26, border: '1px solid #fecaca', borderRadius: 6, background: '#fff1f2', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 style={{ width: 11, height: 11 }} />
                      </button>
                    </div>

                    {/* ── Identification & traduction ── */}
                    {secHdr('Identification & Traduction')}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Tag — clé technique</label>
                        <input style={{ ...inp, fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }} value={dec.tag} placeholder="APPROUVER" onChange={e => props.onUpdateDecision(selectedNode.id, i, { tag: e.target.value.toUpperCase().replace(/\s/g, '_') })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Libellé FR (bouton affiché)</label>
                        <input style={inp} value={dec.label ?? ''} placeholder="Approuver" onChange={e => props.onUpdateDecision(selectedNode.id, i, { label: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Comportement</label>
                        <select style={inp} value={dec.behavior} onChange={e => props.onUpdateDecision(selectedNode.id, i, { behavior: e.target.value as DecisionBehavior })}>
                          <option value="GO_FORWARD">GO_FORWARD — nœud suivant</option>
                          <option value="GO_TO_NODE">GO_TO_NODE — nœud précis</option>
                          <option value="END_PROCESS">END_PROCESS — fin du flux</option>
                          <option value="STAY">STAY — rester ici</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Mode SoD</label>
                        <select style={inp} value={dec.sodMode || 'DEFAULT'} onChange={e => props.onUpdateDecision(selectedNode.id, i, { sodMode: e.target.value })}>
                          <option value="DEFAULT">DEFAULT</option>
                          <option value="SKIP">SKIP</option>
                          <option value="STRICT">STRICT</option>
                        </select>
                      </div>
                    </div>

                    {/* ── Règle de transition ── */}
                    {secHdr('Règle de transition')}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
                      <div style={{ flex: 1 }}>
                        <label style={lbl}>Nœud cible (nodeKey)</label>
                        <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11.5 }} value={dec.targetNodeKey ?? ''} placeholder="SERVICE_CENTRAL" onChange={e => props.onUpdateDecision(selectedNode.id, i, { targetNodeKey: e.target.value.toUpperCase().replace(/\s/g, '_') || undefined })} />
                      </div>
                      <div style={{ width: 60 }}>
                        <label style={lbl}>Priorité</label>
                        <input type="number" style={{ ...inp, textAlign: 'center' }} value={dec.priority ?? 1} min={1} onChange={e => props.onUpdateDecision(selectedNode.id, i, { priority: parseInt(e.target.value) || 1 })} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 7 }}>
                      <label style={lbl}>Action service (serviceAction)</label>
                      <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11.5 }} value={dec.serviceAction ?? ''} placeholder="VALIDATE_OPERATION" onChange={e => props.onUpdateDecision(selectedNode.id, i, { serviceAction: e.target.value || undefined })} />
                    </div>
                    <div style={{ marginBottom: 7 }}>
                      <label style={lbl}>Condition SpEL (conditionExpr)</label>
                      <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} value={dec.conditionExpr ?? ''} placeholder="#montant > 10000" onChange={e => props.onUpdateDecision(selectedNode.id, i, { conditionExpr: e.target.value || undefined })} />
                    </div>
                    <div style={{ marginBottom: 7 }}>
                      <label style={lbl}>Groupe choix manuel (manualChoiceGroup)</label>
                      <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11.5 }} value={dec.manualChoiceGroup ?? ''} placeholder="APPROBATION" onChange={e => props.onUpdateDecision(selectedNode.id, i, { manualChoiceGroup: e.target.value || undefined })} />
                    </div>

                    {/* ── Options ── */}
                    {secHdr('Options')}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {([
                        { key: 'requiresComment', label: '💬 Commentaire obligatoire', desc: "L'agent doit saisir un motif" },
                        { key: 'finalize', label: '✅ Finaliser métier', desc: 'Le MS métier crée/finalise le dossier (status A)' },
                        { key: 'wfFinalize', label: '🏁 Clôturer le workflow', desc: 'Le workflow passe à COMPLETED après cette décision' },
                      ] as { key: keyof DecisionDraft; label: string; desc: string }[]).map(({ key, label: optLabel, desc }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 9px', borderRadius: 7, background: (dec as any)[key] ? '#F0F7FF' : '#F4F8FC', border: `1px solid ${(dec as any)[key] ? '#c7d9ee' : '#e8edf2'}`, cursor: 'pointer', userSelect: 'none' }}>
                          <input type="checkbox" checked={(dec as any)[key] ?? false} onChange={e => props.onUpdateDecision(selectedNode.id, i, { [key]: e.target.checked })} style={{ accentColor: '#435B7B', marginTop: 1, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#2D3E54' }}>{optLabel}</div>
                            <div style={{ fontSize: 10.5, color: '#6B8CAE' }}>{desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => props.onAddDecision(selectedNode.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '2px dashed #A8C0D9', background: 'white', color: '#435B7B', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, width: '100%', justifyContent: 'center', boxSizing: 'border-box', marginTop: 4 }}>
                <Plus style={{ width: 14, height: 14 }} /> Ajouter une décision
              </button>
            </div>
          </ScrollArea>
        )}

        {nodeTab === 'assign' && (
          <ScrollArea style={{ height: '100%' }}>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: '#6B8CAE', marginBottom: 12 }}>
                Les règles d'assignation définissent qui peut traiter ce nœud (rôles ou utilisateurs spécifiques).
              </div>
              {assignRules.map((r, i) => (
                <div key={i} style={{ marginBottom: 8, padding: 10, background: 'white', borderRadius: 9, border: '1px solid #e4edf5' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Code rôle</label>
                      <input style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} value={r.candidateRoleCode ?? ''} placeholder="CHEF_AGENCE" onChange={e => props.onUpdateAssignRule(selectedNode.id, i, { candidateRoleCode: e.target.value.toUpperCase() })} />
                    </div>
                    <div style={{ width: 60 }}>
                      <label style={lbl}>Priorité</label>
                      <input type="number" style={{ ...inp, fontSize: 12, textAlign: 'center' }} value={r.priority} min={1} onChange={e => props.onUpdateAssignRule(selectedNode.id, i, { priority: parseInt(e.target.value) || 1 })} />
                    </div>
                    <button onClick={() => props.onRemoveAssignRule(selectedNode.id, i)} style={{ width: 30, height: 30, border: '1px solid #fecaca', borderRadius: 7, background: '#fff1f2', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 1, flexShrink: 0 }}>
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                  <div>
                    <label style={lbl}>ID utilisateur (optionnel — assignation directe)</label>
                    <input style={{ ...inp, fontFamily: 'monospace', fontSize: 11.5 }} value={r.candidateUserId ?? ''} placeholder="user_123 (optionnel)" onChange={e => props.onUpdateAssignRule(selectedNode.id, i, { candidateUserId: e.target.value || undefined })} />
                  </div>
                </div>
              ))}
              <button onClick={() => props.onAddAssignRule(selectedNode.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '2px dashed #A8C0D9', background: 'white', color: '#435B7B', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}>
                <Plus style={{ width: 14, height: 14 }} /> Ajouter une règle d'assignation
              </button>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ─── WorkflowEditorContent ────────────────────────────────────────────────────

function WorkflowEditorContent({ onClose }: { onClose: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [definitions, setDefinitions] = useState<WfDefinition[]>([]);
  const [selectedDefId, setSelectedDefId] = useState<string>('');
  const [loadingDef, setLoadingDef] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defSaving, setDefSaving] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  const NEW_DEF_PLACEHOLDER: WfDefinition = {
    wfDefId: -1, operationKey: '', label: '', active: true, version: 1,
    baseUrl: '', endpointTemplate: '', httpMethod: 'POST', respBkPath: '', payloadBkField: '',
  };
  const selectedDef: WfDefinition | undefined = selectedDefId === '__NEW__'
    ? NEW_DEF_PLACEHOLDER
    : definitions.find(d => String(d.wfDefId) === selectedDefId);

  useEffect(() => {
    adminFetch<WfDefinition[]>('/definitions')
      .then(data => setDefinitions(data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDefId || selectedDefId === '__NEW__') {
      if (selectedDefId === '__NEW__') {
        setNodes([
          { id: '_start', type: 'startNode', position: { x: 80, y: 200 }, data: {} },
          { id: '_end', type: 'endNode', position: { x: 500, y: 200 }, data: {} },
        ]);
        setEdges([]);
        setTimeout(() => fitView({ padding: 0.3 }), 100);
      }
      return;
    }
    const load = async () => {
      setLoadingDef(true);
      setShowExample(false);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      try {
        const apiNodes = await adminFetch<WfNode[]>(`/nodes?wfDefId=${selectedDefId}`);
        const canvasNodes: Node[] = [];
        const canvasEdges: Edge[] = [];
        canvasNodes.push({ id: '_start', type: 'startNode', position: { x: 50, y: 210 }, data: {} });
        for (let i = 0; i < (apiNodes ?? []).length; i++) {
          const n = apiNodes[i];
          const decisions = await adminFetch<WfDecision[]>(`/decisions?nodeId=${n.nodeId}`);
          const assignRules = await adminFetch<WfAssignmentRule[]>(`/assignment-rules?nodeId=${n.nodeId}`).catch(() => [] as WfAssignmentRule[]);
          const allRules = await Promise.all((decisions ?? []).map(d => adminFetch<WfTransitionRule[]>(`/transition-rules?decisionId=${d.decisionId}`)));
          const decisionDrafts: DecisionDraft[] = (decisions ?? []).map((d, di) => {
            const rule = allRules[di]?.[0];
            return {
              decisionId: d.decisionId, tag: d.tag, label: d.label, behavior: d.behavior,
              sodMode: d.sodMode ?? 'DEFAULT', requiresComment: d.requiresComment,
              targetNodeKey: rule?.targetNodeKey,
              finalize: rule?.metierFinalize ?? false, wfFinalize: rule?.wfFinalize ?? true,
              ruleId: rule?.ruleId, priority: rule?.priority ?? 1,
              conditionExpr: rule?.conditionExpr ?? '', manualChoiceGroup: rule?.manualChoiceGroup ?? '',
              serviceAction: rule?.serviceAction ?? '',
            };
          });
          const assignDrafts: AssignRuleDraft[] = (assignRules ?? []).map(r => ({
            assignRuleId: r.assignRuleId, candidateRoleCode: r.candidateRoleCode,
            candidateUserId: r.candidateUserId != null ? String(r.candidateUserId) : undefined, priority: r.priority,
          }));
          canvasNodes.push({
            id: n.nodeKey, type: n.nodeType === 'HUMAN' ? 'humanNode' : 'systemNode',
            position: { x: 220 + i * 290, y: 150 },
            data: { label: n.label ?? n.nodeKey, nodeKey: n.nodeKey, nodeType: n.nodeType, finalizePolicy: n.finalizePolicy, claimEnabled: n.claimEnabled, nodeId: n.nodeId, decisions: decisionDrafts, assignmentRules: assignDrafts } as NodeData,
          });
          decisionDrafts.forEach((d, di) => {
            if (d.targetNodeKey) canvasEdges.push(edgeBase(`e-${n.nodeKey}-${d.tag}-${di}`, n.nodeKey, d.targetNodeKey, d.tag, '#435B7B', '#EEF3F7'));
          });
        }
        canvasNodes.push({ id: '_end', type: 'endNode', position: { x: 220 + (apiNodes?.length ?? 0) * 290, y: 210 }, data: {} });
        if (apiNodes && apiNodes.length > 0) {
          canvasEdges.unshift({ id: 'e-start-first', source: '_start', target: apiNodes[0].nodeKey, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#435B7B' }, style: { stroke: '#435B7B', strokeWidth: 2 } });
        }
        setNodes(canvasNodes);
        setEdges(canvasEdges);
        setDirty(false);
        setTimeout(() => fitView({ padding: 0.2 }), 150);
      } catch (e) { showError('Erreur chargement: ' + (e as Error).message); }
      finally { setLoadingDef(false); }
    };
    load();
  }, [selectedDefId]);

  // Selection via React Flow's built-in onSelectionChange (most reliable)
  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: { nodes: Node[], edges: Edge[] }) => {
    if (selEdges.length > 0) {
      setSelectedEdgeId(selEdges[0].id);
      setSelectedNodeId(null);
    } else if (selNodes.length > 0) {
      const n = selNodes[0];
      if (n.type !== 'startNode' && n.type !== 'endNode') {
        setSelectedNodeId(n.id);
        setSelectedEdgeId(null);
      }
    }
  }, []);

  const onPaneClick = useCallback(() => { setSelectedNodeId(null); setSelectedEdgeId(null); }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/ava-node');
    if (!type) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    if (type === 'START') {
      setNodes(prev => [...prev, { id: '_start', type: 'startNode', position: pos, data: {} }]);
      setDirty(true);
      return;
    }
    if (type === 'END') {
      setNodes(prev => [...prev, { id: '_end', type: 'endNode', position: pos, data: {} }]);
      setDirty(true);
      return;
    }
    const id = `${type}-${Date.now()}`;
    setNodes(prev => [...prev, {
      id, type: type === 'HUMAN' ? 'humanNode' : 'systemNode', position: pos,
      data: { label: type === 'HUMAN' ? 'Nouvelle étape' : 'Étape système', nodeKey: `NODE_${Date.now()}`, nodeType: type as WFNodeType, finalizePolicy: 'NEVER' as FinalizePolicy, claimEnabled: false, decisions: [], assignmentRules: [] } as NodeData,
    }]);
    setDirty(true);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, [screenToFlowPosition, setNodes]);

  const onConnect = useCallback((connection: Connection) => {
    const edge: Edge = { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, type: 'smoothstep', label: '', markerEnd: { type: MarkerType.ArrowClosed, color: '#435B7B' }, style: { stroke: '#435B7B', strokeWidth: 2 }, labelStyle: { fontSize: 10, fontWeight: 700, fill: '#435B7B' }, labelBgStyle: { fill: '#EEF3F7' }, labelBgBorderRadius: 4, labelBgPadding: [4, 6] as [number, number] };
    setEdges(prev => addEdge(edge, prev));
    setDirty(true);
    setTimeout(() => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }, 50);
  }, [setEdges]);

  const updateNodeData = useCallback((id: string, updates: Partial<NodeData>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
    setDirty(true);
  }, [setNodes]);

  const updateEdgeLabel = useCallback((id: string, label: string) => {
    setEdges(eds => eds.map(e => e.id === id ? { ...e, label } : e));
    setDirty(true);
  }, [setEdges]);

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
    setDirty(true);
  }, [setNodes, setEdges]);

  const deleteEdge = useCallback((id: string) => {
    setEdges(eds => eds.filter(e => e.id !== id));
    setSelectedEdgeId(null);
    setDirty(true);
  }, [setEdges]);

  const addDecision = useCallback((nodeId: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const d = n.data as NodeData;
      const newDec: DecisionDraft = { tag: '', label: '', behavior: 'GO_FORWARD', sodMode: 'DEFAULT', requiresComment: false, finalize: false, wfFinalize: true, priority: 1, conditionExpr: '', manualChoiceGroup: '', serviceAction: '' };
      return { ...n, data: { ...d, decisions: [...d.decisions, newDec] } };
    }));
    setDirty(true);
  }, [setNodes]);

  const updateDecision = useCallback((nodeId: string, idx: number, updates: Partial<DecisionDraft>) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const d = n.data as NodeData;
      return { ...n, data: { ...d, decisions: d.decisions.map((dec, i) => i === idx ? { ...dec, ...updates } : dec) } };
    }));
    setDirty(true);
  }, [setNodes]);

  const removeDecision = useCallback((nodeId: string, idx: number) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const d = n.data as NodeData;
      return { ...n, data: { ...d, decisions: d.decisions.filter((_, i) => i !== idx) } };
    }));
    setDirty(true);
  }, [setNodes]);

  const addAssignRule = useCallback((nodeId: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const d = n.data as NodeData;
      return { ...n, data: { ...d, assignmentRules: [...d.assignmentRules, { candidateRoleCode: '', priority: (d.assignmentRules.length + 1) }] } };
    }));
    setDirty(true);
  }, [setNodes]);

  const updateAssignRule = useCallback((nodeId: string, idx: number, updates: Partial<AssignRuleDraft>) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const d = n.data as NodeData;
      return { ...n, data: { ...d, assignmentRules: d.assignmentRules.map((r, i) => i === idx ? { ...r, ...updates } : r) } };
    }));
    setDirty(true);
  }, [setNodes]);

  const removeAssignRule = useCallback((nodeId: string, idx: number) => {
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const d = n.data as NodeData;
      return { ...n, data: { ...d, assignmentRules: d.assignmentRules.filter((_, i) => i !== idx) } };
    }));
    setDirty(true);
  }, [setNodes]);

  const loadExample = useCallback(() => {
    setNodes(TEMPLATE_NODES);
    setEdges(TEMPLATE_EDGES);
    setSelectedDefId('');
    setDirty(true);
    setShowExample(true);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTimeout(() => fitView({ padding: 0.15 }), 100);
  }, [setNodes, setEdges, fitView]);

  const handleSaveDef = useCallback(async (updates: Partial<WfDefinition>) => {
    setDefSaving(true);
    try {
      if (selectedDefId === '__NEW__') {
        const created = await adminFetch<WfDefinition>('/definitions', {
          method: 'POST',
          body: JSON.stringify({
            operationKey: updates.operationKey || `flux_${Date.now()}`,
            active: updates.active ?? true,
            label: updates.label || 'Nouveau flux',
            version: 1,
            ...updates,
          }),
        });
        setDefinitions(prev => [...prev, created]);
        setSelectedDefId(String(created.wfDefId));
        toast.success('Définition créée ✓');
      } else {
        if (!selectedDef || selectedDef.wfDefId === -1) return;
        const updated = await adminFetch<WfDefinition>(`/definitions/${selectedDef.wfDefId}`, {
          method: 'PUT', body: JSON.stringify({ ...selectedDef, ...updates }),
        });
        setDefinitions(defs => defs.map(d => d.wfDefId === updated.wfDefId ? updated : d));
        toast.success('Définition enregistrée ✓');
      }
    } catch (e) { showError('Erreur: ' + (e as Error).message); }
    finally { setDefSaving(false); }
  }, [selectedDef, selectedDefId]);

  const handleSave = useCallback(async () => {
    if (!selectedDefId) { showError('Sélectionnez ou créez un flux d\'abord'); return; }
    setSaving(true);
    try {
      let defId: number;
      if (selectedDefId === '__NEW__') {
        const newDef = await adminFetch<WfDefinition>('/definitions', {
          method: 'POST', body: JSON.stringify({ operationKey: `flux_${Date.now()}`, active: true, label: 'Nouveau flux' }),
        });
        defId = newDef.wfDefId;
        setDefinitions(prev => [...prev, newDef]);
        setSelectedDefId(String(defId));
      } else {
        defId = parseInt(selectedDefId);
        if (isNaN(defId)) { showError('Identifiant de flux invalide'); return; }
      }
      const nodeRef = (id: number) => ({ nodeId: id });
      const decRef = (id: number) => ({ decisionId: id });
      const defRef = (id: number) => ({ wfDefId: id });

      const workNodes = nodes.filter(n => n.type !== 'startNode' && n.type !== 'endNode');
      for (const n of workNodes) {
        const d = n.data as NodeData;
        let nodeId = d.nodeId;
        if (nodeId) {
          await adminFetch(`/nodes/${nodeId}`, {
            method: 'PUT',
            body: JSON.stringify({ label: d.label, nodeKey: d.nodeKey, nodeType: d.nodeType, finalizePolicy: d.finalizePolicy, claimEnabled: d.claimEnabled, wfDefinition: defRef(defId) }),
          });
          // Delete ALL decisions for this node from DB (catches duplicates the UI may not track)
          const allExistingDecs = await adminFetch<WfDecision[]>(`/decisions?nodeId=${nodeId}`).catch(() => [] as WfDecision[]);
          for (const existingDec of allExistingDecs) {
            const existingRules = await adminFetch<WfTransitionRule[]>(`/transition-rules?decisionId=${existingDec.decisionId}`).catch(() => [] as WfTransitionRule[]);
            for (const r of existingRules) {
              await adminFetch(`/transition-rules/${r.ruleId}`, { method: 'DELETE' });
            }
            await adminFetch(`/decisions/${existingDec.decisionId}`, { method: 'DELETE' });
          }
          for (const dec of d.decisions) {
            const savedDec = await adminFetch<WfDecision>('/decisions', {
              method: 'POST',
              body: JSON.stringify({ node: nodeRef(nodeId), tag: dec.tag, label: dec.label, behavior: dec.behavior, requiresComment: dec.requiresComment ?? false, sodMode: dec.sodMode || 'DEFAULT' }),
            });
            dec.decisionId = savedDec.decisionId;
            await adminFetch('/transition-rules', {
              method: 'POST',
              body: JSON.stringify({ decision: decRef(savedDec.decisionId!), priority: dec.priority ?? 1, targetNodeKey: dec.targetNodeKey || null, metierFinalize: dec.finalize ?? false, wfFinalize: dec.wfFinalize ?? true, conditionExpr: dec.conditionExpr || null, manualChoiceGroup: dec.manualChoiceGroup || null, serviceAction: dec.serviceAction || null }),
            });
          }
        } else {
          const newNode = await adminFetch<WfNode>('/nodes', {
            method: 'POST',
            body: JSON.stringify({ label: d.label, nodeKey: d.nodeKey, nodeType: d.nodeType, finalizePolicy: d.finalizePolicy, claimEnabled: d.claimEnabled, wfDefinition: defRef(defId) }),
          });
          nodeId = newNode.nodeId;
          updateNodeData(n.id, { nodeId });
          for (const dec of d.decisions) {
            const newDec = await adminFetch<WfDecision>('/decisions', {
              method: 'POST',
              body: JSON.stringify({ node: nodeRef(nodeId!), tag: dec.tag, label: dec.label, behavior: dec.behavior, requiresComment: dec.requiresComment ?? false, sodMode: dec.sodMode || 'DEFAULT' }),
            });
            await adminFetch('/transition-rules', {
              method: 'POST',
              body: JSON.stringify({ decision: decRef(newDec.decisionId!), priority: dec.priority ?? 1, targetNodeKey: dec.targetNodeKey || null, metierFinalize: dec.finalize ?? false, wfFinalize: dec.wfFinalize ?? true, conditionExpr: dec.conditionExpr || null, manualChoiceGroup: dec.manualChoiceGroup || null, serviceAction: dec.serviceAction || null }),
            });
          }
          for (const r of d.assignmentRules) {
            if (r.candidateRoleCode || r.candidateUserId) {
              await adminFetch('/assignment-rules', {
                method: 'POST',
                body: JSON.stringify({ node: nodeRef(nodeId!), candidateRoleCode: r.candidateRoleCode ?? null, candidateUserId: r.candidateUserId ? Number(r.candidateUserId) : null, priority: r.priority }),
              });
            }
          }
        }
      }
      setDirty(false);
      toast.success('Flux enregistré ✓');
    } catch (e) { showError('Erreur sauvegarde: ' + (e as Error).message); }
    finally { setSaving(false); }
  }, [nodes, selectedDefId, updateNodeData]);

  const toolCard = (type: 'HUMAN' | 'SYSTEM') => (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('application/ava-node', type); e.dataTransfer.effectAllowed = 'move'; }}
      style={{ padding: '9px 12px', marginBottom: 7, borderRadius: 9, border: `1px solid ${type === 'HUMAN' ? '#c7d9ee' : '#99f6e4'}`, borderLeft: `4px solid ${type === 'HUMAN' ? '#435B7B' : '#0d9488'}`, background: 'white', cursor: 'grab', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(67,91,123,0.08)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(67,91,123,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(67,91,123,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      <span style={{ fontSize: 18 }}>{type === 'HUMAN' ? '🧑' : '⚙️'}</span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#2D3E54' }}>{type === 'HUMAN' ? 'Étape humaine' : 'Étape système'}</div>
        <div style={{ fontSize: 10.5, color: '#6B8CAE' }}>{type === 'HUMAN' ? 'Validation manuelle' : 'Action automatique'}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Header */}
      <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12, background: 'linear-gradient(90deg,#6B8CAE,#435B7B)', boxShadow: '0 2px 8px rgba(67,91,123,0.2)' }}>
        <GitBranch style={{ width: 19, height: 19, color: 'rgba(255,255,255,0.9)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'white', flex: 1 }}>Éditeur de Flux Workflow</span>
        {dirty && <span style={{ fontSize: 10.5, color: '#fde68a', background: 'rgba(255,255,255,0.15)', padding: '3px 9px', borderRadius: 20 }}>● Modifications non sauvegardées</span>}
        <button onClick={handleSave} disabled={saving || !dirty} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: dirty ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.25)', border: 'none', cursor: dirty ? 'pointer' : 'not-allowed', fontSize: 12.5, fontWeight: 700, color: dirty ? '#435B7B' : 'rgba(255,255,255,0.45)', transition: 'all 0.15s' }}>
          <Save style={{ width: 14, height: 14 }} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}>
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div style={{ width: 225, flexShrink: 0, background: '#F4F8FC', borderRight: '1px solid #d1dce6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ScrollArea style={{ flex: 1 }}>
            <div style={{ padding: 13 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Flux de travail</div>
              <select value={selectedDefId} onChange={e => { setSelectedDefId(e.target.value); setShowExample(false); setSelectedNodeId(null); setSelectedEdgeId(null); }} style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1dce6', borderRadius: 8, fontSize: 12.5, color: '#2D3E54', background: 'white', cursor: 'pointer', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}>
                <option value="">— Choisir un flux —</option>
                <option value="__NEW__">＋ Nouveau flux</option>
                {definitions.map(d => <option key={d.wfDefId} value={String(d.wfDefId)}>{d.label ?? d.operationKey}</option>)}
              </select>

              {selectedDef && (
                <div style={{ marginBottom: 10, padding: '7px 10px', background: '#EEF3F7', borderRadius: 8, border: '1px solid #c7d9ee', fontSize: 11, color: '#435B7B', fontFamily: 'monospace' }}>
                  {selectedDef.operationKey}
                  <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: selectedDef.active ? '#f0fdf4' : '#fff1f2', color: selectedDef.active ? '#15803d' : '#b91c1c', fontFamily: 'sans-serif', fontWeight: 700, fontSize: 9.5 }}>
                    {selectedDef.active ? 'ACTIF' : 'INACTIF'}
                  </span>
                </div>
              )}

              {loadingDef && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#EEF3F7', borderRadius: 7, marginBottom: 10, fontSize: 12, color: '#435B7B' }}><RefreshCw style={{ width: 11, height: 11, animation: 'spin 0.8s linear infinite' }} /> Chargement...</div>}

              <div style={{ height: 1, background: '#d1dce6', margin: '4px 0 13px' }} />

              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Boîte à outils</div>
              <div style={{ fontSize: 10.5, color: '#A8C0D9', marginBottom: 9 }}>Glissez vers le canvas →</div>
              {(['START', 'END'] as const).map(t => (
                <div key={t} draggable onDragStart={e => { e.dataTransfer.setData('application/ava-node', t); e.dataTransfer.effectAllowed = 'move'; }}
                  style={{ padding: '7px 12px', marginBottom: 7, borderRadius: 20, border: '1px solid #c7d9ee', background: t === 'START' ? '#2D3E54' : '#6B8CAE', cursor: 'grab', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'white' }}>{t === 'START' ? 'Début' : 'Fin'}</span>
                </div>
              ))}
              {toolCard('HUMAN')}
              {toolCard('SYSTEM')}

              <div style={{ height: 1, background: '#d1dce6', margin: '13px 0' }} />

              <button onClick={loadExample} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #c7d9ee', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#435B7B', marginBottom: 7, boxSizing: 'border-box' }}>
                <LayoutTemplate style={{ width: 14, height: 14 }} /> Exemple Ouverture
              </button>
              <button onClick={() => setShowMonitoring(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${showMonitoring ? '#435B7B' : '#c7d9ee'}`, background: showMonitoring ? '#EEF3F7' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#435B7B', boxSizing: 'border-box' }}>
                <Activity style={{ width: 14, height: 14 }} /> Monitoring
              </button>

              <div style={{ height: 1, background: '#d1dce6', margin: '13px 0' }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Légende connexions</div>
              {[['#435B7B', 'Normal / Avancer'], ['#16a34a', 'Approbation'], ['#dc2626', 'Rejet'], ['#f59e0b', 'Retour / Boucle']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 11, color: '#6B8CAE' }}>
                  <div style={{ width: 20, height: 2, background: color, borderRadius: 2, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {showExample && (
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, padding: '8px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1e40af', fontWeight: 500 }}>
              <Info style={{ width: 14, height: 14, flexShrink: 0 }} />
              Exemple "Ouverture Dossier" — Cliquez sur un nœud pour le configurer, puis choisissez un flux et cliquez <strong style={{ marginLeft: 3 }}>Enregistrer</strong>.
            </div>
          )}
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver}
            onPaneClick={onPaneClick} onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes} snapToGrid snapGrid={[16, 16]}
            fitView fitViewOptions={{ padding: 0.2 }}
            style={{ background: '#F4F8FC' }}
            defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#435B7B' }, style: { stroke: '#435B7B', strokeWidth: 2 } }}
          >
            <Background variant={BackgroundVariant.Dots} color="#c5d4e3" gap={20} size={1.5} />
            <Controls style={{ background: 'white', border: '1px solid #d1dce6', borderRadius: 9 }} />
            <MiniMap nodeColor={n => n.type === 'humanNode' ? '#435B7B' : n.type === 'systemNode' ? '#0d9488' : '#2D3E54'} style={{ background: 'white', border: '1px solid #d1dce6', borderRadius: 9 }} />
          </ReactFlow>
          {showMonitoring && <MonitoringPanel onClose={() => setShowMonitoring(false)} />}
        </div>

        {/* Right panel */}
        <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid #d1dce6', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e8edf2', background: '#F4F8FC', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {selectedNode && selectedNode.type !== 'startNode' && selectedNode.type !== 'endNode'
                ? `Nœud: ${(selectedNode.data as NodeData).label || (selectedNode.data as NodeData).nodeKey}`
                : selectedEdge ? `Connexion: ${String(selectedEdge.label || '—')}`
                : selectedDef ? `Flux: ${selectedDef.label ?? selectedDef.operationKey}`
                : 'Configuration'}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <RightPanel
              selectedNode={selectedNode} selectedEdge={selectedEdge} selectedDef={selectedDef}
              defSaving={defSaving}
              onUpdateNode={updateNodeData} onUpdateEdge={updateEdgeLabel}
              onDeleteNode={deleteNode} onDeleteEdge={deleteEdge}
              onAddDecision={addDecision} onUpdateDecision={updateDecision} onRemoveDecision={removeDecision}
              onAddAssignRule={addAssignRule} onUpdateAssignRule={updateAssignRule} onRemoveAssignRule={removeAssignRule}
              onSaveDef={handleSaveDef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AVAWorkflowAdmin (exported) ──────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void; }

export function AVAWorkflowAdmin({ open, onClose }: Props) {
  if (!open) return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: 'white' }}>
      <ReactFlowProvider>
        <WorkflowEditorContent onClose={onClose} />
      </ReactFlowProvider>
    </div>,
    document.body
  );
}
