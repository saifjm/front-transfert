import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, RefreshCw, Settings, User, ChevronRight,
  Shield, Play, XCircle, Lock, Activity, Database, Zap,
  CheckCircle2, ArrowRight, GitBranch,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = 'HUMAN' | 'SYSTEM';
type FinalizePolicy = 'NEVER' | 'ALWAYS' | 'BY_DECISION';
type DecisionBehavior = 'GO_FORWARD' | 'GO_TO_NODE' | 'END_PROCESS' | 'STAY';
type SodSeverity = 'WARN' | 'BLOCK';

interface WfDefinition {
  wfDefId: number; operationKey: string; active: boolean;
  label?: string; description?: string;
  baseUrl?: string; endpointTemplate?: string; httpMethod?: string;
  respBkPath?: string; payloadBkField?: string;
}
interface WfNode {
  nodeId: number; wfDefId: number; nodeKey: string; label?: string;
  nodeType: NodeType; finalizePolicy: FinalizePolicy; claimEnabled: boolean;
}
interface WfDecision {
  decisionId: number; nodeId: number; tag: string; label?: string;
  behavior: DecisionBehavior; requiresComment: boolean; sodMode?: string;
}
interface WfTransitionRule {
  ruleId: number; decisionId: number; priority: number;
  conditionExpr?: string; targetNodeKey?: string;
  finalize: boolean; wfFinalize: boolean;
  manualChoiceGroup?: string; serviceAction?: string;
}
interface WfAssignmentRule {
  assignRuleId: number; nodeId: number;
  candidateRoleCode?: string; candidateUserId?: string;
  conditionExpr?: string; priority: number;
}
interface WfVariableSchema {
  varId: number; wfDefId: number; varName: string;
  jsonPath: string; varType: string; indexed: boolean;
}
interface WfSodRule {
  sodRuleId: number; wfDefId: number;
  sodType: string; fromNodeKey: string; toNodeKey?: string; severity: SodSeverity;
}
interface WfOperation {
  wfOpId: number; businessKey: string; status: string;
  currentNodeKey?: string; createdAt: string; updatedAt?: string;
  initiatorUserId?: number; lastDecisionTag?: string;
  wfDefinition?: { operationKey: string; label?: string; wfDefId: number };
}
interface WfAudit {
  auditId: number; nodeKey: string; decisionTag?: string;
  userId?: number; orgNodeId?: number; createdAt: string;
  justification?: string; sodResult?: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

function wfAdminHeaders(): Record<string, string> {
  const userId = sessionStorage.getItem('wf_user_id') ?? '1';
  const roleCode = sessionStorage.getItem('wf_role_code') ?? 'ADMIN';
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    'X-Role-Code': roleCode,
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

const aGet  = <T,>(p: string) => adminFetch<T>(p);
const aPost = <T,>(p: string, b: unknown) => adminFetch<T>(p, { method: 'POST', body: JSON.stringify(b) });
const aPut  = <T,>(p: string, b: unknown) => adminFetch<T>(p, { method: 'PUT',  body: JSON.stringify(b) });
const aDel  = <T,>(p: string) => adminFetch<T>(p, { method: 'DELETE' });

// ─── Flow layout ─────────────────────────────────────────────────────────────

function topoColumns(nodes: WfNode[], decisions: WfDecision[], rules: WfTransitionRule[]): WfNode[][] {
  const nodeMap = new Map(nodes.map(n => [n.nodeKey, n]));
  const incoming = new Map<number, Set<number>>(nodes.map(n => [n.nodeId, new Set()]));
  const outgoing = new Map<number, Set<number>>(nodes.map(n => [n.nodeId, new Set()]));

  for (const dec of decisions) {
    for (const rule of rules.filter(r => r.decisionId === dec.decisionId && r.targetNodeKey)) {
      const target = nodeMap.get(rule.targetNodeKey!);
      if (target) {
        outgoing.get(dec.nodeId)?.add(target.nodeId);
        incoming.get(target.nodeId)?.add(dec.nodeId);
      }
    }
  }

  const depth = new Map<number, number>();
  const queue: number[] = [];
  for (const [id, inc] of incoming) {
    if (inc.size === 0) { depth.set(id, 0); queue.push(id); }
  }
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      if (!depth.has(next) || depth.get(next)! < d + 1) depth.set(next, d + 1);
      const preds = incoming.get(next) ?? new Set();
      if ([...preds].every(p => depth.has(p))) queue.push(next);
    }
  }
  for (const n of nodes) if (!depth.has(n.nodeId)) depth.set(n.nodeId, 0);

  const maxD = Math.max(0, ...depth.values());
  const cols: WfNode[][] = Array.from({ length: maxD + 1 }, () => []);
  for (const n of nodes) cols[depth.get(n.nodeId) ?? 0].push(n);
  return cols;
}

// ─── NodeCard ────────────────────────────────────────────────────────────────

function NodeCard({ node, decisionCount, selected, onClick }: {
  node: WfNode; decisionCount: number; selected: boolean; onClick: () => void;
}) {
  const isHuman = node.nodeType === 'HUMAN';
  const fpColor = node.finalizePolicy === 'ALWAYS' ? 'text-green-400' :
                  node.finalizePolicy === 'NEVER'  ? 'text-red-400' : 'text-amber-400';
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer w-44 rounded-xl border-2 p-3 transition-all select-none ${
        selected
          ? 'border-blue-400 bg-blue-950/60 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
          : 'border-gray-700 bg-gray-800/80 hover:border-gray-500 hover:shadow-lg'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${isHuman ? 'bg-purple-900/60 text-purple-300' : 'bg-orange-900/60 text-orange-300'}`}>
          {isHuman ? <User size={13} /> : <Settings size={13} />}
        </div>
        <span className="text-xs font-semibold text-gray-100 truncate flex-1">{node.label || node.nodeKey}</span>
      </div>
      <div className="text-[10px] text-gray-500 font-mono truncate mb-1.5">{node.nodeKey}</div>
      <div className="flex flex-wrap gap-1">
        <span className={`text-[9px] font-medium ${fpColor}`}>{node.finalizePolicy}</span>
        {node.claimEnabled && <span className="text-[9px] text-green-400">· CLAIM</span>}
      </div>
      {decisionCount > 0 && (
        <div className="mt-1.5 text-[9px] text-gray-500">{decisionCount} décision{decisionCount > 1 ? 's' : ''}</div>
      )}
    </div>
  );
}

// ─── Flow Diagram ─────────────────────────────────────────────────────────────

function FlowDiagram({ nodes, decisions, rules, selectedNode, onSelect }: {
  nodes: WfNode[]; decisions: WfDecision[]; rules: WfTransitionRule[];
  selectedNode: WfNode | null; onSelect: (n: WfNode) => void;
}) {
  if (!nodes.length) return (
    <div className="flex items-center justify-center h-48 text-gray-600">
      <p className="text-sm">Aucun nœud — ajoutez-en un ci-dessous</p>
    </div>
  );

  const cols = topoColumns(nodes, decisions, rules);

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex items-center min-w-max px-8 py-10 gap-0">
        {/* START */}
        <div className="flex flex-col items-center mr-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            <Play size={13} className="text-white ml-0.5" />
          </div>
          <span className="text-[10px] text-emerald-500 mt-1 font-medium">START</span>
        </div>

        {cols.map((colNodes, colIdx) => (
          <React.Fragment key={colIdx}>
            {/* Connector arrow */}
            <div className="flex flex-col items-center justify-center mx-1" style={{ minWidth: 40 }}>
              <div className="flex items-center gap-0 w-full">
                <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-gray-500" />
                <ChevronRight size={14} className="text-gray-500 -ml-1 shrink-0" />
              </div>
              {colIdx > 0 && (() => {
                const prevCol = cols[colIdx - 1];
                const tags = prevCol.flatMap(n =>
                  decisions.filter(d => d.nodeId === n.nodeId).map(d => d.tag)
                ).slice(0, 2);
                return tags.length ? (
                  <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                    {tags.map(t => (
                      <span key={t} className="text-[8px] px-1 rounded bg-blue-900/40 text-blue-300 font-medium">{t}</span>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Column of nodes */}
            <div className="flex flex-col gap-3 items-center">
              {colNodes.map(n => (
                <NodeCard
                  key={n.nodeId}
                  node={n}
                  decisionCount={decisions.filter(d => d.nodeId === n.nodeId).length}
                  selected={selectedNode?.nodeId === n.nodeId}
                  onClick={() => onSelect(n)}
                />
              ))}
            </div>
          </React.Fragment>
        ))}

        {/* Connector to END */}
        <div className="flex items-center mx-1" style={{ minWidth: 40 }}>
          <div className="flex-1 h-px bg-gradient-to-r from-gray-600 to-gray-500" />
          <ChevronRight size={14} className="text-gray-500 -ml-1 shrink-0" />
        </div>

        {/* END */}
        <div className="flex flex-col items-center ml-1">
          <div className="w-9 h-9 rounded-full bg-red-700/80 flex items-center justify-center shadow-[0_0_12px_rgba(220,38,38,0.3)]">
            <XCircle size={13} className="text-white" />
          </div>
          <span className="text-[10px] text-red-400 mt-1 font-medium">END</span>
        </div>
      </div>
    </div>
  );
}

// ─── Node Detail Panel ────────────────────────────────────────────────────────

function NodeDetailPanel({ node, nodeDecisions, rules, assignRules, onEdit, onDelete,
  onAddDecision, onDeleteDecision, onEditDecision,
  onAddRule, onDeleteRule,
  onAddAssignRule, onDeleteAssignRule,
}: {
  node: WfNode;
  nodeDecisions: WfDecision[];
  rules: WfTransitionRule[];
  assignRules: WfAssignmentRule[];
  onEdit: () => void; onDelete: () => void;
  onAddDecision: () => void; onDeleteDecision: (id: number) => void; onEditDecision: (d: WfDecision) => void;
  onAddRule: (decisionId: number) => void; onDeleteRule: (id: number) => void;
  onAddAssignRule: () => void; onDeleteAssignRule: (id: number) => void;
}) {
  const behaviorColor: Record<string, string> = {
    GO_FORWARD: 'text-blue-400', GO_TO_NODE: 'text-amber-400',
    END_PROCESS: 'text-red-400', STAY: 'text-gray-400',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm text-white">{node.label || node.nodeKey}</div>
          <div className="text-[10px] text-gray-500 font-mono">{node.nodeKey}</div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-white" onClick={onEdit}>
            <Pencil size={13} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-400" onClick={onDelete}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Node props */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-500">Type</div>
            <div className="text-gray-200 font-medium">{node.nodeType}</div>
            <div className="text-gray-500">Finalize Policy</div>
            <div className="text-gray-200 font-medium">{node.finalizePolicy}</div>
            <div className="text-gray-500">Claim</div>
            <div className="text-gray-200">{node.claimEnabled ? '✓ Activé' : '–'}</div>
          </div>

          <Separator className="bg-gray-800" />

          {/* Decisions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300">Décisions</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300" onClick={onAddDecision}>
                <Plus size={11} className="mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {nodeDecisions.length === 0 && (
                <p className="text-[11px] text-gray-600 italic">Aucune décision</p>
              )}
              {nodeDecisions.map(dec => {
                const decRules = rules.filter(r => r.decisionId === dec.decisionId);
                return (
                  <div key={dec.decisionId} className="rounded-lg border border-gray-700 bg-gray-800/50 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-100 uppercase">{dec.tag}</span>
                        {dec.label && <span className="text-[10px] text-gray-400">{dec.label}</span>}
                        <span className={`text-[9px] font-medium ${behaviorColor[dec.behavior] ?? 'text-gray-400'}`}>
                          {dec.behavior}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onAddRule(dec.decisionId)} className="text-[10px] text-blue-400 hover:text-blue-300 px-1">+règle</button>
                        <button onClick={() => onEditDecision(dec)} className="text-gray-500 hover:text-gray-300"><Pencil size={10} /></button>
                        <button onClick={() => onDeleteDecision(dec.decisionId)} className="text-gray-500 hover:text-red-400"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    {/* Transition rules */}
                    {decRules.map(rule => (
                      <div key={rule.ruleId} className="flex items-center justify-between py-0.5 px-2 rounded bg-gray-900/50 mt-1 text-[9px]">
                        <span className="text-gray-400 font-mono truncate max-w-[100px]">
                          {rule.conditionExpr || <span className="text-gray-600 italic">toujours</span>}
                        </span>
                        <span className="text-blue-300 flex items-center gap-1">
                          <ArrowRight size={8} />
                          {rule.targetNodeKey || 'END'}
                        </span>
                        <div className="flex gap-1">
                          {rule.finalize && <span className="text-green-400">F</span>}
                          {!rule.wfFinalize && <span className="text-red-400">REJ</span>}
                          <button onClick={() => onDeleteRule(rule.ruleId)} className="text-gray-600 hover:text-red-400"><Trash2 size={9} /></button>
                        </div>
                      </div>
                    ))}
                    {decRules.length === 0 && (
                      <div className="text-[9px] text-gray-600 italic px-2">Aucune règle de transition</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="bg-gray-800" />

          {/* Assignment rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300">Assignation</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300" onClick={onAddAssignRule}>
                <Plus size={11} className="mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-1">
              {assignRules.length === 0 && (
                <p className="text-[11px] text-gray-600 italic">Aucune règle</p>
              )}
              {assignRules.map(ar => (
                <div key={ar.assignRuleId} className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1 text-[10px]">
                  <div className="flex gap-2 text-gray-300">
                    {ar.candidateRoleCode && <span className="text-purple-300">@{ar.candidateRoleCode}</span>}
                    {ar.candidateUserId && <span className="text-blue-300">#{ar.candidateUserId}</span>}
                    {ar.conditionExpr && <span className="text-gray-500 font-mono truncate max-w-[80px]">{ar.conditionExpr}</span>}
                  </div>
                  <button onClick={() => onDeleteAssignRule(ar.assignRuleId)} className="text-gray-600 hover:text-red-400 ml-2">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function DefinitionModal({ data, onSave, onClose }: {
  data?: WfDefinition; onSave: (d: Partial<WfDefinition>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfDefinition>>(data ?? { active: true, httpMethod: 'POST' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfDefinition, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{data ? 'Modifier la définition' : 'Nouvelle définition WF'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Clé opération *</Label>
              <Input value={form.operationKey ?? ''} onChange={e => set('operationKey', e.target.value)} placeholder="ex: ouverture_dossier" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Libellé</Label>
              <Input value={form.label ?? ''} onChange={e => set('label', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Base URL</Label>
              <Input value={form.baseUrl ?? ''} onChange={e => set('baseUrl', e.target.value)} placeholder="http://metier-service:8080" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Méthode HTTP</Label>
              <Select value={form.httpMethod ?? 'POST'} onValueChange={v => set('httpMethod', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['POST', 'PUT', 'PATCH', 'GET'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Template endpoint</Label>
            <Input value={form.endpointTemplate ?? ''} onChange={e => set('endpointTemplate', e.target.value)} placeholder="/api/dossier/{dossierNum}?finalize={finalize}" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Resp BK path (JSONPath)</Label>
              <Input value={form.respBkPath ?? ''} onChange={e => set('respBkPath', e.target.value)} placeholder="$.numeroDossier" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payload BK field</Label>
              <Input value={form.payloadBkField ?? ''} onChange={e => set('payloadBkField', e.target.value)} placeholder="numeroDossier" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active ?? true} onCheckedChange={v => set('active', v)} />
            <Label className="text-xs">Actif</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving || !form.operationKey} onClick={async () => {
            setSaving(true);
            await onSave(form);
            setSaving(false);
          }}>
            {saving ? <RefreshCw size={14} className="animate-spin mr-1" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NodeModal({ data, defId, onSave, onClose }: {
  data?: WfNode; defId: number; onSave: (d: Partial<WfNode>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfNode>>(data ?? {
    wfDefId: defId, nodeType: 'HUMAN', finalizePolicy: 'BY_DECISION', claimEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfNode, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{data ? 'Modifier le nœud' : 'Nouveau nœud'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Clé nœud *</Label>
              <Input value={form.nodeKey ?? ''} onChange={e => set('nodeKey', e.target.value.toUpperCase())} placeholder="SAISIE_AGENCE" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Libellé</Label>
              <Input value={form.label ?? ''} onChange={e => set('label', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={form.nodeType ?? 'HUMAN'} onValueChange={v => set('nodeType', v as NodeType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUMAN">HUMAN</SelectItem>
                  <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finalize Policy</Label>
              <Select value={form.finalizePolicy ?? 'BY_DECISION'} onValueChange={v => set('finalizePolicy', v as FinalizePolicy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEVER">NEVER</SelectItem>
                  <SelectItem value="ALWAYS">ALWAYS</SelectItem>
                  <SelectItem value="BY_DECISION">BY_DECISION</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.claimEnabled ?? false} onCheckedChange={v => set('claimEnabled', v)} />
            <Label className="text-xs">Claim activé</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving || !form.nodeKey} onClick={async () => {
            setSaving(true); await onSave(form); setSaving(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionModal({ data, nodeId, onSave, onClose }: {
  data?: WfDecision; nodeId: number; onSave: (d: Partial<WfDecision>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfDecision>>(data ?? {
    nodeId, behavior: 'GO_FORWARD', requiresComment: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfDecision, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{data ? 'Modifier la décision' : 'Nouvelle décision'}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tag *</Label>
              <Input value={form.tag ?? ''} onChange={e => set('tag', e.target.value.toUpperCase())} placeholder="APPROUVER" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Libellé</Label>
              <Input value={form.label ?? ''} onChange={e => set('label', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Comportement</Label>
            <Select value={form.behavior ?? 'GO_FORWARD'} onValueChange={v => set('behavior', v as DecisionBehavior)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GO_FORWARD">GO_FORWARD — nœud suivant selon règle</SelectItem>
                <SelectItem value="GO_TO_NODE">GO_TO_NODE — nœud spécifique</SelectItem>
                <SelectItem value="END_PROCESS">END_PROCESS — fin</SelectItem>
                <SelectItem value="STAY">STAY — rester</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">SoD Mode</Label>
            <Select value={form.sodMode ?? '__NONE__'} onValueChange={v => set('sodMode', v === '__NONE__' ? undefined : v)}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Aucun</SelectItem>
                <SelectItem value="INITIATOR_CANNOT_APPROVE">INITIATOR_CANNOT_APPROVE</SelectItem>
                <SelectItem value="SAME_USER_FORBIDDEN">SAME_USER_FORBIDDEN</SelectItem>
                <SelectItem value="SAME_ORGNODE_FORBIDDEN">SAME_ORGNODE_FORBIDDEN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.requiresComment ?? false} onCheckedChange={v => set('requiresComment', v)} />
            <Label className="text-xs">Commentaire obligatoire</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving || !form.tag} onClick={async () => {
            setSaving(true); await onSave(form); setSaving(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransitionRuleModal({ data, decisionId, nodeKeys, onSave, onClose }: {
  data?: WfTransitionRule; decisionId: number; nodeKeys: string[];
  onSave: (d: Partial<WfTransitionRule>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfTransitionRule>>(data ?? {
    decisionId, priority: 0, finalize: false, wfFinalize: true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfTransitionRule, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Règle de transition</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nœud cible</Label>
              <Select value={form.targetNodeKey ?? '__END__'} onValueChange={v => set('targetNodeKey', v === '__END__' ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__END__">→ END</SelectItem>
                  {nodeKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priorité</Label>
              <Input type="number" value={form.priority ?? 0} onChange={e => set('priority', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Condition SpEL</Label>
            <Input value={form.conditionExpr ?? ''} onChange={e => set('conditionExpr', e.target.value || undefined)} placeholder="#montant > 50000" className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Service Action</Label>
            <Input value={form.serviceAction ?? ''} onChange={e => set('serviceAction', e.target.value || undefined)} placeholder="CALL_DOWNSTREAM" />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.finalize ?? false} onCheckedChange={v => set('finalize', v)} />
              <Label className="text-xs">finalize (métier)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.wfFinalize ?? true} onCheckedChange={v => set('wfFinalize', v)} />
              <Label className="text-xs">wfFinalize (continuer)</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving} onClick={async () => {
            setSaving(true); await onSave(form); setSaving(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentRuleModal({ nodeId, onSave, onClose }: {
  nodeId: number; onSave: (d: Partial<WfAssignmentRule>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfAssignmentRule>>({ nodeId, priority: 0 });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfAssignmentRule, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Règle d'assignation</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Code rôle candidat</Label>
              <Input value={form.candidateRoleCode ?? ''} onChange={e => set('candidateRoleCode', e.target.value || undefined)} placeholder="CHEF_AGENCE" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">User ID candidat</Label>
              <Input value={form.candidateUserId ?? ''} onChange={e => set('candidateUserId', e.target.value || undefined)} placeholder="12" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Condition SpEL</Label>
            <Input value={form.conditionExpr ?? ''} onChange={e => set('conditionExpr', e.target.value || undefined)} placeholder="#orgNodeId == 5" className="font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priorité</Label>
            <Input type="number" value={form.priority ?? 0} onChange={e => set('priority', parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving} onClick={async () => {
            setSaving(true); await onSave(form); setSaving(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariableSchemaModal({ defId, onSave, onClose }: {
  defId: number; onSave: (d: Partial<WfVariableSchema>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfVariableSchema>>({ wfDefId: defId, varType: 'STRING', indexed: false });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfVariableSchema, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nouvelle variable</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom variable *</Label>
              <Input value={form.varName ?? ''} onChange={e => set('varName', e.target.value)} placeholder="numeroDossier" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={form.varType ?? 'STRING'} onValueChange={v => set('varType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['STRING', 'NUMBER', 'BOOLEAN', 'DATE'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">JSON Path *</Label>
            <Input value={form.jsonPath ?? ''} onChange={e => set('jsonPath', e.target.value)} placeholder="$.numeroDossier" className="font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.indexed ?? false} onCheckedChange={v => set('indexed', v)} />
            <Label className="text-xs">Indexé (recherche)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving || !form.varName || !form.jsonPath} onClick={async () => {
            setSaving(true); await onSave(form); setSaving(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SodRuleModal({ defId, nodeKeys, onSave, onClose }: {
  defId: number; nodeKeys: string[];
  onSave: (d: Partial<WfSodRule>) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<WfSodRule>>({
    wfDefId: defId, sodType: 'INITIATOR_CANNOT_APPROVE', severity: 'BLOCK',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WfSodRule, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Règle SoD</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs">Type SoD</Label>
            <Select value={form.sodType ?? ''} onValueChange={v => set('sodType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INITIATOR_CANNOT_APPROVE">INITIATOR_CANNOT_APPROVE</SelectItem>
                <SelectItem value="SAME_USER_FORBIDDEN">SAME_USER_FORBIDDEN</SelectItem>
                <SelectItem value="SAME_ORGNODE_FORBIDDEN">SAME_ORGNODE_FORBIDDEN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nœud source *</Label>
              <Select value={form.fromNodeKey ?? ''} onValueChange={v => set('fromNodeKey', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {nodeKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nœud cible</Label>
              <Select value={form.toNodeKey ?? '__ALL__'} onValueChange={v => set('toNodeKey', v === '__ALL__' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Tous les nœuds</SelectItem>
                  {nodeKeys.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sévérité</Label>
            <Select value={form.severity ?? 'BLOCK'} onValueChange={v => set('severity', v as SodSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WARN">WARN — avertissement</SelectItem>
                <SelectItem value="BLOCK">BLOCK — bloquant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={saving || !form.fromNodeKey} onClick={async () => {
            setSaving(true); await onSave(form); setSaving(false);
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ForceAdvanceModal({ nodeKeys, currentNodeKey, onSave, onClose }: {
  nodeKeys: string[]; currentNodeKey?: string;
  onSave: (targetNodeKey: string, note: string) => Promise<void>; onClose: () => void;
}) {
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-purple-400">⚡</span> Forcer l'avancement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="bg-amber-950/30 border border-amber-800/30 rounded-lg p-3 text-xs text-amber-300">
            Action admin : le dossier sera déplacé directement au nœud cible sans passer par la validation normale.
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nœud actuel</Label>
            <div className="text-xs font-mono text-gray-400 px-2 py-1.5 rounded bg-gray-800/50">{currentNodeKey || '–'}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nœud cible *</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Choisir le nœud cible..." /></SelectTrigger>
              <SelectContent>
                {nodeKeys.filter(k => k !== currentNodeKey).map(k => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Note admin (justification)</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ex: correction manuelle suite à erreur technique"
              className="text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            disabled={saving || !target}
            className="bg-purple-700 hover:bg-purple-600 text-white border-0"
            onClick={async () => {
              setSaving(true);
              await onSave(target, note).catch(() => {});
              setSaving(false);
            }}
          >
            {saving ? <RefreshCw size={13} className="animate-spin mr-1" /> : null}
            Forcer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ModalState =
  | { type: 'none' }
  | { type: 'def'; data?: WfDefinition }
  | { type: 'node'; data?: WfNode; defId: number }
  | { type: 'decision'; data?: WfDecision; nodeId: number }
  | { type: 'rule'; data?: WfTransitionRule; decisionId: number }
  | { type: 'assignRule'; nodeId: number }
  | { type: 'variable'; defId: number }
  | { type: 'sod'; defId: number };

export function AVAWorkflowAdmin() {
  const [defs, setDefs] = useState<WfDefinition[]>([]);
  const [selectedDef, setSelectedDef] = useState<WfDefinition | null>(null);
  const [nodes, setNodes] = useState<WfNode[]>([]);
  const [decisions, setDecisions] = useState<WfDecision[]>([]);
  const [rules, setRules] = useState<WfTransitionRule[]>([]);
  const [assignRules, setAssignRules] = useState<WfAssignmentRule[]>([]);
  const [variables, setVariables] = useState<WfVariableSchema[]>([]);
  const [sodRules, setSodRules] = useState<WfSodRule[]>([]);
  const [operations, setOperations] = useState<WfOperation[]>([]);
  const [opSearch, setOpSearch] = useState('');
  const [opStatusFilter, setOpStatusFilter] = useState('');
  const [selectedOp, setSelectedOp] = useState<WfOperation | null>(null);
  const [opHistory, setOpHistory] = useState<WfAudit[]>([]);
  const [opHistoryLoading, setOpHistoryLoading] = useState(false);
  const [forceAdvanceModal, setForceAdvanceModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<WfNode | null>(null);
  const [activeTab, setActiveTab] = useState('flow');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; label?: string } | null>(null);

  const closeModal = () => setModal({ type: 'none' });

  const loadDefs = useCallback(async () => {
    try {
      const data = await aGet<WfDefinition[]>('/definitions');
      setDefs(data ?? []);
    } catch (e: any) {
      toast.error('Erreur chargement définitions: ' + e.message);
    }
  }, []);

  useEffect(() => { loadDefs(); }, [loadDefs]);

  const loadDefDetails = useCallback(async (defId: number) => {
    setLoading(true);
    setSelectedNode(null);
    try {
      const [nodesData, varsData, sodData] = await Promise.all([
        aGet<WfNode[]>(`/nodes?wfDefId=${defId}`),
        aGet<WfVariableSchema[]>(`/variable-schemas?wfDefId=${defId}`),
        aGet<WfSodRule[]>('/sod-rules').catch(() => [] as WfSodRule[]),
      ]);
      setNodes(nodesData ?? []);
      setVariables(varsData ?? []);
      setSodRules((sodData ?? []).filter((s: WfSodRule) => s.wfDefId === defId));

      const decMap: WfDecision[] = [];
      await Promise.all((nodesData ?? []).map(async (n: WfNode) => {
        const decs = await aGet<WfDecision[]>(`/decisions?nodeId=${n.nodeId}`).catch(() => []);
        decMap.push(...(decs ?? []));
      }));
      setDecisions(decMap);

      const ruleArr: WfTransitionRule[] = [];
      const assignArr: WfAssignmentRule[] = [];
      await Promise.all([
        ...decMap.map(async (d: WfDecision) => {
          const rs = await aGet<WfTransitionRule[]>(`/transition-rules?decisionId=${d.decisionId}`).catch(() => []);
          ruleArr.push(...(rs ?? []));
        }),
        ...(nodesData ?? []).map(async (n: WfNode) => {
          const ar = await aGet<WfAssignmentRule[]>(`/assignment-rules?nodeId=${n.nodeId}`).catch(() => []);
          assignArr.push(...(ar ?? []));
        }),
      ]);
      setRules(ruleArr);
      setAssignRules(assignArr);
    } catch (e: any) {
      toast.error('Erreur chargement: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDef) loadDefDetails(selectedDef.wfDefId);
  }, [selectedDef, loadDefDetails]);

  const loadOperations = useCallback(async (defId: number, search?: string, status?: string) => {
    try {
      let url = `/operations?wfDefId=${defId}`;
      if (search?.trim()) url = `/operations?businessKey=${encodeURIComponent(search.trim())}`;
      else if (status) url += `&status=${status}`;
      const data = await aGet<WfOperation[]>(url).catch(() => []);
      setOperations(data ?? []);
    } catch { setOperations([]); }
  }, []);

  const loadOpHistory = useCallback(async (opId: number) => {
    setOpHistoryLoading(true);
    try {
      const data = await aGet<WfAudit[]>(`/operations/${opId}/history`).catch(() => []);
      setOpHistory(data ?? []);
    } catch { setOpHistory([]); }
    finally { setOpHistoryLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedDef && activeTab === 'monitor') loadOperations(selectedDef.wfDefId);
  }, [activeTab, selectedDef, loadOperations]);

  useEffect(() => {
    if (selectedOp) loadOpHistory(selectedOp.wfOpId);
  }, [selectedOp, loadOpHistory]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleSaveDef = async (form: Partial<WfDefinition>) => {
    try {
      if (form.wfDefId) {
        await aPut(`/definitions/${form.wfDefId}`, form);
      } else {
        await aPost('/definitions', form);
      }
      toast.success('Définition enregistrée');
      await loadDefs();
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleSaveNode = async (form: Partial<WfNode>) => {
    try {
      if (form.nodeId) {
        await aPut(`/nodes/${form.nodeId}`, form);
      } else {
        await aPost('/nodes', form);
      }
      toast.success('Nœud enregistré');
      if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleSaveDecision = async (form: Partial<WfDecision>) => {
    try {
      if (form.decisionId) {
        await aDel(`/decisions/${form.decisionId}`);
        await aPost('/decisions', { ...form, decisionId: undefined });
      } else {
        await aPost('/decisions', form);
      }
      toast.success('Décision enregistrée');
      if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleSaveRule = async (form: Partial<WfTransitionRule>) => {
    try {
      await aPost('/transition-rules', form);
      toast.success('Règle enregistrée');
      if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleSaveAssignRule = async (form: Partial<WfAssignmentRule>) => {
    try {
      await aPost('/assignment-rules', form);
      toast.success('Règle d\'assignation enregistrée');
      if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleSaveVariable = async (form: Partial<WfVariableSchema>) => {
    try {
      await aPost('/variable-schemas', form);
      toast.success('Variable enregistrée');
      if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleSaveSod = async (form: Partial<WfSodRule>) => {
    try {
      await aPost('/sod-rules', form);
      toast.success('Règle SoD enregistrée');
      if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      closeModal();
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    try {
      const paths: Record<string, string> = {
        node: `/nodes/${id}`,
        decision: `/decisions/${id}`,
        rule: `/transition-rules/${id}`,
        assignRule: `/assignment-rules/${id}`,
        variable: `/variable-schemas/${id}`,
        sod: `/sod-rules/${id}`,
        def: `/definitions/${id}`,
      };
      await aDel(paths[type]);
      toast.success('Supprimé');
      if (type === 'def') {
        setSelectedDef(null);
        await loadDefs();
      } else if (type === 'node') {
        setSelectedNode(null);
        if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      } else {
        if (selectedDef) await loadDefDetails(selectedDef.wfDefId);
      }
    } catch (e: any) {
      toast.error('Suppression échouée: ' + e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const nodeKeys = nodes.map(n => n.nodeKey);

  const statusColor: Record<string, string> = {
    RUNNING: 'text-blue-400', ENDED: 'text-green-400',
    SUSPENDED: 'text-amber-400', REJECTED: 'text-red-400',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-gray-950 text-gray-100 overflow-hidden">

      {/* Left sidebar */}
      <div className="w-64 shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={14} className="text-amber-400" />
            <span className="text-sm font-bold tracking-wider text-amber-400">WF ADMIN</span>
          </div>
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
            onClick={() => setModal({ type: 'def' })}
          >
            <Plus size={13} className="mr-1" /> Nouvelle définition
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {defs.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-600 text-xs">Aucune définition</div>
          )}
          {defs.map(def => (
            <button
              key={def.wfDefId}
              onClick={() => setSelectedDef(def)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-800/50 transition-colors ${
                selectedDef?.wfDefId === def.wfDefId
                  ? 'bg-gray-800 border-l-2 border-l-blue-500'
                  : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-100 truncate">{def.label || def.operationKey}</span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${def.active ? 'bg-green-400' : 'bg-gray-600'}`} />
              </div>
              <span className="text-[10px] text-gray-500 font-mono block truncate mt-0.5">{def.operationKey}</span>
            </button>
          ))}
        </ScrollArea>
        <div className="p-3 border-t border-gray-800">
          <Button variant="ghost" size="sm" className="w-full text-gray-500 hover:text-gray-300 text-xs" onClick={loadDefs}>
            <RefreshCw size={11} className="mr-1" /> Rafraîchir
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedDef ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-700">
              <Lock size={56} className="mx-auto mb-4 text-amber-400/20" />
              <p className="text-sm">Sélectionnez une définition</p>
              <p className="text-xs mt-1">ou créez-en une nouvelle</p>
            </div>
          </div>
        ) : (
          <>
            {/* Definition header */}
            <div className="px-5 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <GitBranch size={16} className="text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base truncate">{selectedDef.label || selectedDef.operationKey}</h2>
                    <Badge className={`text-[10px] px-1.5 ${selectedDef.active ? 'bg-green-900/60 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                      {selectedDef.active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">{selectedDef.operationKey}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedDef.baseUrl && (
                  <span className="text-[10px] text-gray-600 font-mono hidden md:block">{selectedDef.httpMethod} {selectedDef.baseUrl}</span>
                )}
                <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-white"
                  onClick={() => setModal({ type: 'def', data: selectedDef })}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-red-400"
                  onClick={() => setDeleteTarget({ type: 'def', id: selectedDef.wfDefId, label: selectedDef.operationKey })}>
                  <Trash2 size={13} />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-white"
                  onClick={() => loadDefDetails(selectedDef.wfDefId)}>
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b border-gray-800 bg-gray-900/50 px-5">
                <TabsList className="bg-transparent rounded-none h-9 gap-1 p-0">
                  {[
                    { value: 'flow', label: 'Flux', icon: <Zap size={12} /> },
                    { value: 'nodes', label: `Nœuds (${nodes.length})`, icon: <Database size={12} /> },
                    { value: 'variables', label: `Variables (${variables.length})`, icon: <Activity size={12} /> },
                    { value: 'sod', label: `SoD (${sodRules.length})`, icon: <Shield size={12} /> },
                    { value: 'monitor', label: 'Monitoring', icon: <Activity size={12} /> },
                  ].map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400 data-[state=active]:text-blue-300 text-gray-500 hover:text-gray-300 text-xs px-3 gap-1.5 pb-0 h-full"
                    >
                      {tab.icon}{tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* FLOW TAB */}
              <TabsContent value="flow" className="flex-1 overflow-hidden flex m-0 p-0">
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <RefreshCw size={20} className="animate-spin text-gray-600" />
                    </div>
                  ) : (
                    <>
                      <FlowDiagram
                        nodes={nodes}
                        decisions={decisions}
                        rules={rules}
                        selectedNode={selectedNode}
                        onSelect={setSelectedNode}
                      />
                      <div className="px-8 pb-4 flex gap-2">
                        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs"
                          onClick={() => setModal({ type: 'node', defId: selectedDef.wfDefId })}>
                          <Plus size={12} className="mr-1" /> Ajouter un nœud
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right node detail panel */}
                {selectedNode && (
                  <div className="w-88 shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col" style={{ width: 340 }}>
                    <NodeDetailPanel
                      node={selectedNode}
                      nodeDecisions={decisions.filter(d => d.nodeId === selectedNode.nodeId)}
                      rules={rules}
                      assignRules={assignRules.filter(r => r.nodeId === selectedNode.nodeId)}
                      onEdit={() => setModal({ type: 'node', data: selectedNode, defId: selectedDef.wfDefId })}
                      onDelete={() => setDeleteTarget({ type: 'node', id: selectedNode.nodeId, label: selectedNode.nodeKey })}
                      onAddDecision={() => setModal({ type: 'decision', nodeId: selectedNode.nodeId })}
                      onDeleteDecision={(id) => setDeleteTarget({ type: 'decision', id })}
                      onEditDecision={(d) => setModal({ type: 'decision', data: d, nodeId: d.nodeId })}
                      onAddRule={(decisionId) => setModal({ type: 'rule', decisionId })}
                      onDeleteRule={(id) => setDeleteTarget({ type: 'rule', id })}
                      onAddAssignRule={() => setModal({ type: 'assignRule', nodeId: selectedNode.nodeId })}
                      onDeleteAssignRule={(id) => setDeleteTarget({ type: 'assignRule', id })}
                    />
                  </div>
                )}
              </TabsContent>

              {/* NODES TAB */}
              <TabsContent value="nodes" className="flex-1 overflow-auto m-0 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Nœuds du workflow</h3>
                  <Button size="sm" className="bg-blue-700 hover:bg-blue-600 text-white border-0 text-xs"
                    onClick={() => setModal({ type: 'node', defId: selectedDef.wfDefId })}>
                    <Plus size={12} className="mr-1" /> Nouveau nœud
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-800/60 text-gray-400 border-b border-gray-800">
                        {['Clé', 'Libellé', 'Type', 'Finalize Policy', 'Claim', 'Décisions', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(n => (
                        <tr key={n.nodeId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-3 py-2 font-mono text-gray-100">{n.nodeKey}</td>
                          <td className="px-3 py-2 text-gray-300">{n.label || '–'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${n.nodeType === 'HUMAN' ? 'bg-purple-900/40 text-purple-300' : 'bg-orange-900/40 text-orange-300'}`}>
                              {n.nodeType}
                            </span>
                          </td>
                          <td className={`px-3 py-2 font-medium ${n.finalizePolicy === 'ALWAYS' ? 'text-green-400' : n.finalizePolicy === 'NEVER' ? 'text-red-400' : 'text-amber-400'}`}>
                            {n.finalizePolicy}
                          </td>
                          <td className="px-3 py-2 text-center">{n.claimEnabled ? <CheckCircle2 size={13} className="text-green-400 mx-auto" /> : <span className="text-gray-700">–</span>}</td>
                          <td className="px-3 py-2 text-gray-400">{decisions.filter(d => d.nodeId === n.nodeId).length}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setModal({ type: 'node', data: n, defId: selectedDef.wfDefId })} className="text-gray-500 hover:text-gray-200 p-1"><Pencil size={12} /></button>
                              <button onClick={() => setDeleteTarget({ type: 'node', id: n.nodeId, label: n.nodeKey })} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {nodes.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-600 italic">Aucun nœud</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* VARIABLES TAB */}
              <TabsContent value="variables" className="flex-1 overflow-auto m-0 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Variables de contexte</h3>
                  <Button size="sm" className="bg-blue-700 hover:bg-blue-600 text-white border-0 text-xs"
                    onClick={() => setModal({ type: 'variable', defId: selectedDef.wfDefId })}>
                    <Plus size={12} className="mr-1" /> Nouvelle variable
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-800/60 text-gray-400 border-b border-gray-800">
                        {['Nom variable', 'JSON Path', 'Type', 'Indexé', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variables.map(v => (
                        <tr key={v.varId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-3 py-2 font-mono text-blue-300">{v.varName}</td>
                          <td className="px-3 py-2 font-mono text-gray-400">{v.jsonPath}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">{v.varType}</span>
                          </td>
                          <td className="px-3 py-2 text-center">{v.indexed ? <CheckCircle2 size={13} className="text-green-400 mx-auto" /> : <span className="text-gray-700">–</span>}</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setDeleteTarget({ type: 'variable', id: v.varId, label: v.varName })} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                      {variables.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-600 italic">Aucune variable</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* SOD TAB */}
              <TabsContent value="sod" className="flex-1 overflow-auto m-0 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Règles Séparation des Devoirs (SoD)</h3>
                  <Button size="sm" className="bg-blue-700 hover:bg-blue-600 text-white border-0 text-xs"
                    onClick={() => setModal({ type: 'sod', defId: selectedDef.wfDefId })}>
                    <Plus size={12} className="mr-1" /> Nouvelle règle
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-800/60 text-gray-400 border-b border-gray-800">
                        {['Type SoD', 'Nœud source', 'Nœud cible', 'Sévérité', ''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sodRules.map(s => (
                        <tr key={s.sodRuleId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-3 py-2 font-mono text-gray-200">{s.sodType}</td>
                          <td className="px-3 py-2 font-mono text-blue-300">{s.fromNodeKey}</td>
                          <td className="px-3 py-2 font-mono text-gray-400">{s.toNodeKey || <span className="italic">tous</span>}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.severity === 'BLOCK' ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                              {s.severity}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setDeleteTarget({ type: 'sod', id: s.sodRuleId })} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                      {sodRules.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-600 italic">Aucune règle SoD</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* MONITOR TAB */}
              <TabsContent value="monitor" className="flex-1 overflow-hidden flex m-0 p-0">
                {/* Left: list */}
                <div className="flex-1 flex flex-col overflow-hidden p-4">
                  {/* Search bar */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Rechercher par n° dossier..."
                      value={opSearch}
                      onChange={e => setOpSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loadOperations(selectedDef.wfDefId, opSearch, opStatusFilter)}
                      className="flex-1 h-7 text-xs bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-600"
                    />
                    <Select value={opStatusFilter || 'ALL'} onValueChange={v => {
                      const s = v === 'ALL' ? '' : v;
                      setOpStatusFilter(s);
                      loadOperations(selectedDef.wfDefId, opSearch, s);
                    }}>
                      <SelectTrigger className="w-32 h-7 text-xs bg-gray-800 border-gray-700 text-gray-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tous statuts</SelectItem>
                        <SelectItem value="RUNNING">RUNNING</SelectItem>
                        <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                        <SelectItem value="ENDED">ENDED</SelectItem>
                        <SelectItem value="REJECTED">REJECTED</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-white"
                      onClick={() => loadOperations(selectedDef.wfDefId, opSearch, opStatusFilter)}>
                      <RefreshCw size={12} />
                    </Button>
                  </div>

                  {/* Operations table */}
                  <div className="rounded-lg border border-gray-800 overflow-auto flex-1">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0">
                        <tr className="bg-gray-800/90 text-gray-400 border-b border-gray-800">
                          {['ID', 'Business Key', 'Statut', 'Nœud actuel', 'Initié le', 'Initiateur'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {operations.map(op => (
                          <tr
                            key={op.wfOpId}
                            onClick={() => setSelectedOp(op)}
                            className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                              selectedOp?.wfOpId === op.wfOpId ? 'bg-blue-950/40 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/40'
                            }`}
                          >
                            <td className="px-3 py-2 text-gray-500 font-mono">#{op.wfOpId}</td>
                            <td className="px-3 py-2 font-mono text-blue-300 font-semibold">{op.businessKey}</td>
                            <td className="px-3 py-2">
                              <span className={`font-bold ${statusColor[op.status] ?? 'text-gray-400'}`}>{op.status}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-300">{op.currentNodeKey || '–'}</td>
                            <td className="px-3 py-2 text-gray-500">{op.createdAt ? new Date(op.createdAt).toLocaleString('fr-FR') : '–'}</td>
                            <td className="px-3 py-2 text-gray-500">#{op.initiatorUserId ?? '–'}</td>
                          </tr>
                        ))}
                        {operations.length === 0 && (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-600 italic">Aucune opération trouvée</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Operation Inspector */}
                {selectedOp && (
                  <div className="w-80 shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col overflow-hidden">
                    {/* Inspector header */}
                    <div className="px-4 py-3 border-b border-gray-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-blue-300 font-semibold text-sm">{selectedOp.businessKey}</span>
                        <button onClick={() => setSelectedOp(null)} className="text-gray-600 hover:text-gray-300"><XCircle size={14} /></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${statusColor[selectedOp.status] ?? 'text-gray-400'}`}>{selectedOp.status}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-500 text-xs font-mono">{selectedOp.currentNodeKey || '–'}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 py-2 border-b border-gray-800 flex gap-2 flex-wrap">
                      {selectedOp.status === 'RUNNING' && (
                        <button
                          onClick={async () => {
                            try {
                              const updated = await aPut<WfOperation>(`/operations/${selectedOp.wfOpId}/suspend`, {});
                              setSelectedOp(updated);
                              await loadOperations(selectedDef.wfDefId, opSearch, opStatusFilter);
                              toast.success('Opération suspendue');
                            } catch (e: any) { toast.error(e.message); }
                          }}
                          className="text-[10px] px-2 py-1 rounded border border-amber-700/50 text-amber-400 hover:bg-amber-900/20"
                        >
                          ⏸ Suspendre
                        </button>
                      )}
                      {selectedOp.status === 'SUSPENDED' && (
                        <button
                          onClick={async () => {
                            try {
                              const updated = await aPut<WfOperation>(`/operations/${selectedOp.wfOpId}/resume`, {});
                              setSelectedOp(updated);
                              await loadOperations(selectedDef.wfDefId, opSearch, opStatusFilter);
                              toast.success('Opération reprise');
                            } catch (e: any) { toast.error(e.message); }
                          }}
                          className="text-[10px] px-2 py-1 rounded border border-green-700/50 text-green-400 hover:bg-green-900/20"
                        >
                          ▶ Reprendre
                        </button>
                      )}
                      {(selectedOp.status === 'RUNNING' || selectedOp.status === 'SUSPENDED') && (
                        <button
                          onClick={() => setForceAdvanceModal(true)}
                          className="text-[10px] px-2 py-1 rounded border border-purple-700/50 text-purple-400 hover:bg-purple-900/20"
                        >
                          ⚡ Forcer avance
                        </button>
                      )}
                    </div>

                    {/* Info grid */}
                    <div className="px-4 py-3 border-b border-gray-800 grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-gray-500">ID</span>
                      <span className="text-gray-300 font-mono">#{selectedOp.wfOpId}</span>
                      <span className="text-gray-500">Initié le</span>
                      <span className="text-gray-300">{selectedOp.createdAt ? new Date(selectedOp.createdAt).toLocaleString('fr-FR') : '–'}</span>
                      <span className="text-gray-500">Mis à jour</span>
                      <span className="text-gray-300">{selectedOp.updatedAt ? new Date(selectedOp.updatedAt).toLocaleString('fr-FR') : '–'}</span>
                      <span className="text-gray-500">Initiateur</span>
                      <span className="text-gray-300">#{selectedOp.initiatorUserId ?? '–'}</span>
                      <span className="text-gray-500">Dernière décision</span>
                      <span className="text-gray-300 font-mono">{selectedOp.lastDecisionTag || '–'}</span>
                    </div>

                    {/* Audit timeline */}
                    <div className="flex-1 overflow-auto px-4 py-3">
                      <div className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Historique</div>
                      {opHistoryLoading ? (
                        <div className="flex items-center gap-2 text-gray-600 text-xs"><RefreshCw size={12} className="animate-spin" /> Chargement...</div>
                      ) : opHistory.length === 0 ? (
                        <div className="text-gray-700 text-xs italic">Aucun événement</div>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-800" />
                          {opHistory.map((entry, i) => (
                            <div key={entry.auditId} className="relative pl-6 pb-3">
                              <div className={`absolute left-0.5 top-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
                                entry.decisionTag?.startsWith('_ADMIN') ? 'bg-purple-500' :
                                entry.decisionTag ? 'bg-blue-500' : 'bg-gray-600'
                              }`} />
                              <div className="text-[10px] font-bold text-gray-200 font-mono">{entry.nodeKey}</div>
                              {entry.decisionTag && (
                                <div className={`text-[9px] font-semibold mt-0.5 ${
                                  entry.decisionTag.startsWith('_ADMIN') ? 'text-purple-400' : 'text-blue-400'
                                }`}>
                                  {entry.decisionTag}
                                </div>
                              )}
                              {entry.justification && (
                                <div className="text-[9px] text-amber-400/80 italic mt-0.5">{entry.justification}</div>
                              )}
                              <div className="text-[9px] text-gray-600 mt-0.5 flex gap-2">
                                <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : ''}</span>
                                {entry.userId && <span>· user #{entry.userId}</span>}
                                {entry.sodResult && <span>· SoD: {entry.sodResult}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Force Advance Modal */}
              {forceAdvanceModal && selectedOp && (
                <ForceAdvanceModal
                  nodeKeys={nodeKeys}
                  currentNodeKey={selectedOp.currentNodeKey}
                  onSave={async (targetNodeKey, note) => {
                    try {
                      const updated = await aPost<WfOperation>(`/operations/${selectedOp.wfOpId}/force-advance`, { targetNodeKey, note });
                      setSelectedOp(updated);
                      await loadOperations(selectedDef.wfDefId, opSearch, opStatusFilter);
                      await loadOpHistory(updated.wfOpId);
                      toast.success(`Opération avancée → ${targetNodeKey}`);
                      setForceAdvanceModal(false);
                    } catch (e: any) { toast.error('Force-advance échoué: ' + e.message); throw e; }
                  }}
                  onClose={() => setForceAdvanceModal(false)}
                />
              )}
            </Tabs>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modal.type === 'def' && (
        <DefinitionModal
          data={modal.data}
          onSave={handleSaveDef}
          onClose={closeModal}
        />
      )}
      {modal.type === 'node' && (
        <NodeModal
          data={modal.data}
          defId={modal.defId}
          onSave={handleSaveNode}
          onClose={closeModal}
        />
      )}
      {modal.type === 'decision' && (
        <DecisionModal
          data={modal.data}
          nodeId={modal.nodeId}
          onSave={handleSaveDecision}
          onClose={closeModal}
        />
      )}
      {modal.type === 'rule' && (
        <TransitionRuleModal
          data={modal.data}
          decisionId={modal.decisionId}
          nodeKeys={nodeKeys}
          onSave={handleSaveRule}
          onClose={closeModal}
        />
      )}
      {modal.type === 'assignRule' && (
        <AssignmentRuleModal
          nodeId={modal.nodeId}
          onSave={handleSaveAssignRule}
          onClose={closeModal}
        />
      )}
      {modal.type === 'variable' && (
        <VariableSchemaModal
          defId={modal.defId}
          onSave={handleSaveVariable}
          onClose={closeModal}
        />
      )}
      {modal.type === 'sod' && (
        <SodRuleModal
          defId={modal.defId}
          nodeKeys={nodeKeys}
          onSave={handleSaveSod}
          onClose={closeModal}
        />
      )}

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer {deleteTarget?.label ? `"${deleteTarget.label}"` : 'cet élément'} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
