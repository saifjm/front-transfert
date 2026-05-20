import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, X, Plus, Trash2, FileCode,
  Send, RotateCcw, CheckCircle, AlertCircle, Clock, FileBarChart2,
} from 'lucide-react';
import { showError } from '../utils';
import { authenticatedFetch } from '../utils/api';

// ─── DEC auth helper (silent auto-login with admin/admin) ────────────────────

async function getDECToken(): Promise<string> {
  const cached = sessionStorage.getItem('decAccessToken');
  if (cached) return cached;
  const res = await fetch('/api/dec-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  if (!res.ok) throw new Error('DEC auth failed');
  const data = await res.json();
  const token: string = data.token ?? data.access_token ?? data.accessToken;
  sessionStorage.setItem('decAccessToken', token);
  return token;
}

async function decFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getDECToken();
  return fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface DcAvaEntete {
  periodDec: string;
  agence: string;
  numDosAVA: string;
  typeIdenTitu: 'D' | 'C' | 'S' | 'P';
  codIdenTitu: string;
  denomTitu: string;
  nom: string;
  prenom: string;
  numActv: string;
  typAlloc: '1' | '2' | '3';
  idMarche: string;
  datDom: string;
  statDoss: '1' | '2';
  datSusp: string;
  debPeriodFon: string;
  finPeriodFon: string;
  sousTypAVA: string;
  chiffrAffHrsTx: string;
  anneCA: string;
  numaAutBCT: string;
  datAutBCT: string;
}

interface DcAvaDetail {
  typOp: 'C' | 'D' | '';
  desgnOp: string;
  datConcContrat: string;
  iaEncRest: string;
  datOp: string;
  mntDinOpValue: string;
  mntDinOpCcy: string;
  codOrigFond: string;
  codPays: string;
  droitTransCummValue: string;
  droitTransCummCcy: string;
  mntImport: string;
  mntTransCumValue: string;
  mntTransCumCcy: string;
  baseCalDroitTran: string;
  benifTypeIdentifiant: 'C' | 'S' | 'P';
  benifCodIdentifiant: string;
  benifNom: string;
  benifPrenom: string;
}

interface ValidationError {
  path: string;
  message: string;
}

interface InjectionRecord {
  id: string;
  dateInjection: string;
  periode: string;
  nDossiers: number;
  statut: 'TRANSMIS' | 'ERREUR' | 'EN_ATTENTE';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getJ15Countdown() {
  const now = new Date();
  const next15 = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  const days = Math.ceil((next15.getTime() - now.getTime()) / 86400000);
  const targetDate = `15/${String(next15.getMonth() + 1).padStart(2, '0')}/${next15.getFullYear()}`;
  const color = days <= 3 ? '#DC2626' : days <= 7 ? '#D97706' : '#059669';
  return { days, targetDate, color };
}

const defaultEntete: DcAvaEntete = {
  periodDec: '', agence: '', numDosAVA: '', typeIdenTitu: 'C', codIdenTitu: '',
  denomTitu: '', nom: '', prenom: '', numActv: '', typAlloc: '1', idMarche: '',
  datDom: '', statDoss: '1', datSusp: '', debPeriodFon: '', finPeriodFon: '',
  sousTypAVA: '', chiffrAffHrsTx: '', anneCA: '', numaAutBCT: '', datAutBCT: '',
};

const defaultDetail: DcAvaDetail = {
  typOp: 'C', desgnOp: '', datConcContrat: '', iaEncRest: '', datOp: '',
  mntDinOpValue: '', mntDinOpCcy: 'TND', codOrigFond: '', codPays: '',
  droitTransCummValue: '', droitTransCummCcy: 'TND', mntImport: '',
  mntTransCumValue: '', mntTransCumCcy: 'TND', baseCalDroitTran: '',
  benifTypeIdentifiant: 'C', benifCodIdentifiant: '', benifNom: '', benifPrenom: '',
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: '100%', height: 38, padding: '0 12px', borderRadius: 8, boxSizing: 'border-box',
  border: `1.5px solid ${hasError ? '#FCA5A5' : '#D8E8F2'}`,
  background: hasError ? '#FEF2F2' : '#F6FAFE',
  fontSize: 13, color: '#1E2E42', outline: 'none', fontFamily: 'inherit',
});

const selectStyle: React.CSSProperties = {
  width: '100%', height: 38, padding: '0 12px', borderRadius: 8,
  border: '1.5px solid #D8E8F2', background: '#F6FAFE',
  fontSize: 13, color: '#1E2E42', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#2D3E54', marginBottom: 4, display: 'block',
};

const btnPrimary = (disabled?: boolean): React.CSSProperties => ({
  padding: '10px 24px', borderRadius: 10, border: 'none', cursor: disabled ? 'wait' : 'pointer',
  background: disabled ? '#A8C0D9' : 'linear-gradient(135deg, #435B7B, #2D3E54)',
  color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
  fontFamily: 'inherit',
});

const btnGhost: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: '1.5px solid #D8E8F2',
  background: '#fff', color: '#435B7B', fontWeight: 600, cursor: 'pointer',
  fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
};

const spinner: React.CSSProperties = {
  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
  animation: 'spin .7s linear infinite',
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 28 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <React.Fragment key={n}>
            {i > 0 && (
              <div style={{
                flex: 1, height: 2, maxWidth: 80, minWidth: 20, marginTop: 14,
                background: done ? '#435B7B' : '#d1dce6', transition: 'background 0.3s',
              }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, transition: 'all 0.3s',
                background: done ? '#435B7B' : current ? '#fff' : '#d1dce6',
                color: done ? '#fff' : current ? '#435B7B' : '#8FAFC8',
                border: current ? '2px solid #435B7B' : 'none',
                boxShadow: current ? '0 0 0 3px rgba(67,91,123,0.12)' : 'none',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: 11, color: current ? '#435B7B' : '#6B8CAE', fontWeight: current ? 600 : 400, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Injection Excel Tab ──────────────────────────────────────────────────────

function InjectionExcelTab() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [loading, setLoading] = useState(false);
  const [xmlResult, setXmlResult] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [history, setHistory] = useState<InjectionRecord[]>([]);
  const [transmitting, setTransmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authenticatedFetch('/api/reporting-bct/historique-excel')
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) && setHistory(data))
      .catch(() => {});
  }, []);

  const acceptFile = (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      showError('Seuls les fichiers .xlsx sont acceptés', undefined, 'Format invalide');
      return;
    }
    setFile(f);
    setStep('upload');
    setXmlResult(null);
    setValidationErrors([]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, []);

  const handleReset = () => {
    setFile(null);
    setStep('upload');
    setXmlResult(null);
    setValidationErrors([]);
  };

  const handleValidate = async () => {
    if (!file) return;
    setLoading(true);
    setValidationErrors([]);
    setXmlResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Try to attach XSD from backend; proceed without it if unavailable
      try {
        const xsdResp = await decFetch('/api/dc-ava/xsd');
        if (xsdResp.ok) {
          const blob = await xsdResp.blob();
          formData.append('xsd', blob, 'DC_AVA_V3.xsd');
        }
      } catch { /* xsd endpoint optional */ }

      const resp = await decFetch('/api/dc-ava/convert', { method: 'POST', body: formData });

      if (resp.ok) {
        setXmlResult(await resp.text());
        setStep('preview');
      } else if (resp.status === 400) {
        const errs: ValidationError[] = await resp.json();
        setValidationErrors(errs);
      } else {
        showError(`Erreur de conversion (HTTP ${resp.status})`, undefined, 'Erreur DEC');
      }
    } catch {
      showError('Erreur réseau lors de la conversion', undefined, 'Erreur de connexion');
    }
    setLoading(false);
  };

  const handleTransmit = async () => {
    if (!xmlResult) return;
    setTransmitting(true);
    try {
      const resp = await authenticatedFetch('/api/reporting-bct/transmettre-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: xmlResult }),
      });
      if (resp.ok) {
        setStep('done');
        const r = await authenticatedFetch('/api/reporting-bct/historique-excel');
        if (r.ok) setHistory(await r.json());
      } else {
        showError(`Erreur de transmission (HTTP ${resp.status})`, undefined, 'Erreur Centrale BCT');
      }
    } catch {
      showError('Erreur réseau lors de la transmission', undefined, 'Erreur de connexion');
    }
    setTransmitting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Drop zone */}
      {step !== 'done' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !file && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#435B7B' : file ? '#059669' : '#B8CDE0'}`,
            borderRadius: 16, padding: '32px 24px', textAlign: 'center',
            background: dragOver ? '#EEF3F7' : file ? '#F0FDF4' : '#F6FAFE',
            cursor: file ? 'default' : 'pointer', transition: 'all 0.2s',
          }}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ''; }} />
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <FileSpreadsheet size={28} style={{ color: '#059669' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: '#1E2E42', fontSize: 14 }}>{file.name}</div>
                <div style={{ color: '#6B8CAE', fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <button onClick={e => { e.stopPropagation(); handleReset(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B8CAE', marginLeft: 8 }}>
                <X size={18} />
              </button>
            </div>
          ) : (
            <div>
              <Upload size={32} style={{ color: '#B8CDE0', marginBottom: 12 }} />
              <div style={{ color: '#1E2E42', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                Glissez DC_AVA_V3.xlsx ici ou cliquez pour choisir
              </div>
              <div style={{ color: '#6B8CAE', fontSize: 12 }}>Format accepté : .xlsx • Taille max : 10 MB</div>
              <a href="/templates/DC_AVA_V3.xlsx" download onClick={e => e.stopPropagation()}
                style={{ display: 'inline-block', marginTop: 12, color: '#435B7B', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
                Télécharger le modèle vierge
              </a>
            </div>
          )}
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#DC2626', fontWeight: 700, fontSize: 13 }}>
            <AlertCircle size={16} /> {validationErrors.length} erreur(s) de validation
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {validationErrors.map((e, i) => (
              <li key={i} style={{ fontSize: 12, color: '#991B1B' }}>
                <span style={{ fontWeight: 600 }}>{e.path}</span>: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      {file && step === 'upload' && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={handleReset} style={btnGhost}><RotateCcw size={13} /> Réinitialiser</button>
          <button onClick={handleValidate} disabled={loading} style={btnPrimary(loading)}>
            {loading ? <><span style={spinner} /> Validation...</> : <><FileCode size={15} /> Valider & Prévisualiser</>}
          </button>
        </div>
      )}

      {/* XML Preview */}
      {step === 'preview' && xmlResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={16} style={{ color: '#0369A1', flexShrink: 0 }} />
            <span style={{ color: '#0C4A6E', fontSize: 13, fontWeight: 600 }}>
              Fichier validé. Vérifiez le contenu avant transmission.
            </span>
          </div>
          <details style={{ background: '#1E2E42', borderRadius: 12, overflow: 'hidden' }}>
            <summary style={{ padding: '10px 16px', color: '#A8C0D9', cursor: 'pointer', fontSize: 13, fontWeight: 600, userSelect: 'none' }}>
              Prévisualisation XML DC-AVA
            </summary>
            <pre style={{ margin: 0, padding: '12px 16px', color: '#9ECFB3', fontSize: 11, overflowX: 'auto', maxHeight: 300 }}>
              {xmlResult}
            </pre>
          </details>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={handleReset} style={btnGhost}><RotateCcw size={14} /> Modifier le fichier</button>
            <button onClick={handleTransmit} disabled={transmitting}
              style={{ ...btnPrimary(transmitting), background: transmitting ? '#A8C0D9' : 'linear-gradient(135deg, #059669, #047857)' }}>
              {transmitting ? <><span style={spinner} /> Transmission...</> : <><Send size={15} /> Transmettre à la Centrale BCT</>}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {step === 'done' && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
          <CheckCircle size={40} style={{ color: '#059669', marginBottom: 12 }} />
          <div style={{ color: '#065F46', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Transmission réussie</div>
          <div style={{ color: '#16A34A', fontSize: 13 }}>La déclaration DC-AVA a été transmise à la Centrale BCT.</div>
          <button onClick={handleReset}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#435B7B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            Nouvelle injection
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2D3E54', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Historique des injections
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#EEF3F7' }}>
                {['Date injection', 'Période', 'N° dossiers', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: '#2D3E54', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #EEF3F7', background: i % 2 === 0 ? '#fff' : '#FAFCFE' }}>
                  <td style={{ padding: '9px 14px', color: '#1E2E42' }}>{row.dateInjection}</td>
                  <td style={{ padding: '9px 14px', color: '#1E2E42' }}>{row.periode}</td>
                  <td style={{ padding: '9px 14px', color: '#1E2E42' }}>{row.nDossiers}</td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: row.statut === 'TRANSMIS' ? '#D1FAE5' : row.statut === 'ERREUR' ? '#FEE2E2' : '#FEF9C3',
                      color: row.statut === 'TRANSMIS' ? '#065F46' : row.statut === 'ERREUR' ? '#991B1B' : '#713F12',
                    }}>
                      {row.statut === 'TRANSMIS' ? 'Transmis' : row.statut === 'ERREUR' ? 'Erreur' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Saisie Manuelle Tab ──────────────────────────────────────────────────────

function SaisieManuelleTab() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [entete, setEntete] = useState<DcAvaEntete>({ ...defaultEntete });
  const [details, setDetails] = useState<DcAvaDetail[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingXml, setLoadingXml] = useState(false);
  const [success, setSuccess] = useState(false);

  const setE = (field: keyof DcAvaEntete, value: string) => {
    setEntete(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!entete.periodDec || !/^\d{6}$/.test(entete.periodDec)) e.periodDec = 'Format AAAMMM requis (6 chiffres)';
    if (!entete.agence || !/^\d{3}$/.test(entete.agence)) e.agence = '3 chiffres requis';
    if (!entete.numDosAVA || entete.numDosAVA.length !== 15) e.numDosAVA = '15 caractères requis';
    if (!entete.codIdenTitu) e.codIdenTitu = 'Champ requis';
    if (!entete.numActv || !/^\d{2}$/.test(entete.numActv)) e.numActv = '2 chiffres requis';
    if (!entete.datDom) e.datDom = 'Champ requis';
    if (!entete.debPeriodFon) e.debPeriodFon = 'Champ requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    if (details.length === 0) { setErrors({ _details: 'Ajoutez au moins une opération' }); return false; }
    const e: Record<string, string> = {};
    details.forEach((d, i) => {
      if (!d.typOp) e[`${i}_typOp`] = 'Requis';
      if (!d.desgnOp) e[`${i}_desgnOp`] = 'Requis';
      if (!d.datOp) e[`${i}_datOp`] = 'Requis';
      if (!d.mntDinOpValue) e[`${i}_mntDinOpValue`] = 'Requis';
      if (!d.codPays) e[`${i}_codPays`] = 'Requis';
      if (!d.benifNom) e[`${i}_benifNom`] = 'Requis';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(s => (s + 1) as any);
  };

  const handleBack = () => { setStep(s => (s - 1) as any); setErrors({}); };

  const addDetail = () => setDetails(prev => [...prev, { ...defaultDetail }]);
  const removeDetail = (i: number) => setDetails(prev => prev.filter((_, idx) => idx !== i));
  const updateDetail = (i: number, field: keyof DcAvaDetail, value: string) =>
    setDetails(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  const handleGenerateXml = async () => {
    setLoadingXml(true);
    try {
      const resp = await authenticatedFetch('/api/reporting-bct/generer-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entete, details }),
      });
      if (resp.ok) {
        setGeneratedXml(await resp.text());
      } else {
        // Placeholder when endpoint not yet available
        setGeneratedXml(
          `<!-- DC-AVA (DC-001) — Aperçu -->\n<Document>\n  <EnteteDoc>\n    <CodeIAT>01</CodeIAT>\n    <DateDec>${new Date().toLocaleDateString('fr-FR')}</DateDec>\n    <CodeAnnexe>DC-001</CodeAnnexe>\n  </EnteteDoc>\n  <Decomptes>\n    <Decompte>\n      <Entete>\n        <NumDosAVA>${entete.numDosAVA}</NumDosAVA>\n        <NbrEcritures>${String(details.length).padStart(6, '0')}</NbrEcritures>\n      </Entete>\n    </Decompte>\n  </Decomptes>\n</Document>`
        );
      }
    } catch {
      setGeneratedXml(`<!-- Aperçu local (endpoint /api/reporting-bct/generer-xml non disponible) -->\n<Document><EnteteDoc><CodeAnnexe>DC-001</CodeAnnexe></EnteteDoc></Document>`);
    }
    setLoadingXml(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const resp = await authenticatedFetch('/api/reporting-bct/saisie-manuelle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entete, details }),
      });
      if (resp.ok) {
        setSuccess(true);
      } else {
        showError(`Erreur de soumission (HTTP ${resp.status})`, undefined, 'Erreur Centrale BCT');
      }
    } catch {
      showError('Erreur réseau lors de la soumission', undefined, 'Erreur de connexion');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setStep(1); setEntete({ ...defaultEntete }); setDetails([]);
    setErrors({}); setGeneratedXml(null); setSuccess(false);
  };

  const field = (label: string, key: keyof DcAvaEntete, optional = false, maxLen?: number) => (
    <div key={key}>
      <label style={labelStyle}>{label}{!optional && <span style={{ color: '#DC2626' }}>*</span>}</label>
      <input
        style={inputStyle(!!errors[key])}
        value={entete[key] as string}
        onChange={e => setE(key, e.target.value)}
        placeholder={optional ? 'Optionnel' : ''}
        maxLength={maxLen}
      />
      {errors[key] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0', fontWeight: 500 }}>{errors[key]}</p>}
    </div>
  );

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <CheckCircle size={48} style={{ color: '#059669', marginBottom: 16 }} />
        <div style={{ color: '#065F46', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Déclaration soumise avec succès</div>
        <div style={{ color: '#16A34A', fontSize: 14, marginBottom: 24 }}>La saisie manuelle a été transmise à la Centrale BCT.</div>
        <button onClick={handleReset}
          style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#435B7B', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
          Nouvelle saisie
        </button>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator step={step} labels={['En-tête dossier', 'Compléments', 'Opérations', 'Confirmation']} />

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
          <div>
            <label style={labelStyle}>Période (AAAMMM)<span style={{ color: '#DC2626' }}>*</span></label>
            <input style={inputStyle(!!errors.periodDec)} value={entete.periodDec}
              onChange={e => setE('periodDec', e.target.value)} placeholder="ex: 202501" maxLength={6} />
            {errors.periodDec && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.periodDec}</p>}
          </div>
          <div>
            <label style={labelStyle}>Code agence<span style={{ color: '#DC2626' }}>*</span></label>
            <input style={inputStyle(!!errors.agence)} value={entete.agence}
              onChange={e => setE('agence', e.target.value)} placeholder="000" maxLength={3} />
            {errors.agence && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.agence}</p>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>N° Dossier AVA (15 car.)<span style={{ color: '#DC2626' }}>*</span></label>
            <input style={inputStyle(!!errors.numDosAVA)} value={entete.numDosAVA}
              onChange={e => setE('numDosAVA', e.target.value)} maxLength={15} />
            {errors.numDosAVA && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.numDosAVA}</p>}
          </div>
          <div>
            <label style={labelStyle}>Type identifiant titulaire<span style={{ color: '#DC2626' }}>*</span></label>
            <select style={selectStyle} value={entete.typeIdenTitu} onChange={e => setE('typeIdenTitu', e.target.value as any)}>
              <option value="D">D — Matricule fiscal</option>
              <option value="C">C — Carte d'identité</option>
              <option value="S">S — Carte de séjour</option>
              <option value="P">P — Passeport</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Code identifiant<span style={{ color: '#DC2626' }}>*</span></label>
            <input style={inputStyle(!!errors.codIdenTitu)} value={entete.codIdenTitu}
              onChange={e => setE('codIdenTitu', e.target.value)} maxLength={12} />
            {errors.codIdenTitu && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.codIdenTitu}</p>}
          </div>
          {field('Dénomination', 'denomTitu', true, 80)}
          {field('Nom', 'nom', true, 30)}
          {field('Prénom', 'prenom', true, 30)}
          <div>
            <label style={labelStyle}>Code activité (2 ch.)<span style={{ color: '#DC2626' }}>*</span></label>
            <input style={inputStyle(!!errors.numActv)} value={entete.numActv}
              onChange={e => setE('numActv', e.target.value)} placeholder="01–26" maxLength={2} />
            {errors.numActv && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.numActv}</p>}
          </div>
          <div>
            <label style={labelStyle}>Type allocation<span style={{ color: '#DC2626' }}>*</span></label>
            <select style={selectStyle} value={entete.typAlloc} onChange={e => setE('typAlloc', e.target.value as any)}>
              <option value="1">1 — Exportateur (AVA-E)</option>
              <option value="2">2 — Marché étranger (AVA-M)</option>
              <option value="3">3 — Autres activités (AVA-A)</option>
            </select>
          </div>
          {entete.typAlloc === '2' && field('Id Marché (15 car.)', 'idMarche', false, 15)}
          <div>
            <label style={labelStyle}>Date domiciliation<span style={{ color: '#DC2626' }}>*</span></label>
            <input type="date" style={inputStyle(!!errors.datDom)} value={entete.datDom}
              onChange={e => setE('datDom', e.target.value)} />
            {errors.datDom && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.datDom}</p>}
          </div>
          <div>
            <label style={labelStyle}>Statut dossier<span style={{ color: '#DC2626' }}>*</span></label>
            <select style={selectStyle} value={entete.statDoss} onChange={e => setE('statDoss', e.target.value as any)}>
              <option value="1">1 — Actif</option>
              <option value="2">2 — Suspendu</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Début période fonctionnement<span style={{ color: '#DC2626' }}>*</span></label>
            <input type="date" style={inputStyle(!!errors.debPeriodFon)} value={entete.debPeriodFon}
              onChange={e => setE('debPeriodFon', e.target.value)} />
            {errors.debPeriodFon && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors.debPeriodFon}</p>}
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
          <div>
            <label style={labelStyle}>Fin période fonctionnement</label>
            <input type="date" style={inputStyle()} value={entete.finPeriodFon}
              onChange={e => setE('finPeriodFon', e.target.value)} />
          </div>
          {field('Sous-type AVA (2 car.)', 'sousTypAVA', true, 2)}
          {field("Chiffre d'affaires HT", 'chiffrAffHrsTx', true)}
          {field('Année CA (4 ch.)', 'anneCA', true, 4)}
          {field('N° autorisation BCT (6 ch.)', 'numaAutBCT', true, 6)}
          <div>
            <label style={labelStyle}>Date autorisation BCT</label>
            <input type="date" style={inputStyle()} value={entete.datAutBCT}
              onChange={e => setE('datAutBCT', e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div>
          {errors._details && (
            <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#DC2626', fontSize: 13, fontWeight: 500 }}>
              {errors._details}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#435B7B', fontWeight: 600 }}>
              {details.length} opération(s) — NbrEcritures: {String(details.length).padStart(6, '0')}
            </span>
            <button onClick={addDetail}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #435B7B', background: '#fff', color: '#435B7B', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={14} /> Ajouter une opération
            </button>
          </div>
          {details.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6B8CAE', fontSize: 13 }}>
              Aucune opération. Cliquez "Ajouter une opération" pour commencer.
            </div>
          )}
          {details.map((d, i) => (
            <div key={i} style={{ border: '1.5px solid #D8E8F2', borderRadius: 12, padding: '16px 20px', marginBottom: 12, background: '#FAFCFE' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontWeight: 700, color: '#2D3E54', fontSize: 13 }}>Opération #{i + 1}</span>
                <button onClick={() => removeDetail(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
                  <Trash2 size={15} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px' }}>
                <div>
                  <label style={labelStyle}>Sens<span style={{ color: '#DC2626' }}>*</span></label>
                  <select style={selectStyle} value={d.typOp} onChange={e => updateDetail(i, 'typOp', e.target.value)}>
                    <option value="C">C — Crédit</option>
                    <option value="D">D — Débit</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Code opération<span style={{ color: '#DC2626' }}>*</span></label>
                  <select style={selectStyle} value={d.desgnOp} onChange={e => updateDetail(i, 'desgnOp', e.target.value)}>
                    <option value="">-- Choisir --</option>
                    <option value="DAT">DAT — Dotation annuelle</option>
                    <option value="MOC">MOC — Complément BCT</option>
                    <option value="RAV">RAV — Rétrocession annulation</option>
                    <option value="RRV">RRV — Rétrocession retour</option>
                    <option value="BBA">BBA — Billets banque étrangers</option>
                    <option value="VIR">VIR — Virement SWIFT</option>
                    <option value="CAP">CAP — Carte de paiement</option>
                  </select>
                  {errors[`${i}_desgnOp`] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors[`${i}_desgnOp`]}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Date opération<span style={{ color: '#DC2626' }}>*</span></label>
                  <input type="date" style={inputStyle(!!errors[`${i}_datOp`])} value={d.datOp}
                    onChange={e => updateDetail(i, 'datOp', e.target.value)} />
                  {errors[`${i}_datOp`] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors[`${i}_datOp`]}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Montant<span style={{ color: '#DC2626' }}>*</span></label>
                  <input type="number" style={inputStyle(!!errors[`${i}_mntDinOpValue`])} value={d.mntDinOpValue}
                    onChange={e => updateDetail(i, 'mntDinOpValue', e.target.value)} placeholder="0.000" />
                  {errors[`${i}_mntDinOpValue`] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors[`${i}_mntDinOpValue`]}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Devise montant</label>
                  <input style={inputStyle()} value={d.mntDinOpCcy}
                    onChange={e => updateDetail(i, 'mntDinOpCcy', e.target.value)} placeholder="TND" maxLength={3} />
                </div>
                <div>
                  <label style={labelStyle}>Code pays<span style={{ color: '#DC2626' }}>*</span></label>
                  <input style={inputStyle(!!errors[`${i}_codPays`])} value={d.codPays}
                    onChange={e => updateDetail(i, 'codPays', e.target.value)} placeholder="788" maxLength={3} />
                  {errors[`${i}_codPays`] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors[`${i}_codPays`]}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Droit transfert cumulé</label>
                  <input type="number" style={inputStyle()} value={d.droitTransCummValue}
                    onChange={e => updateDetail(i, 'droitTransCummValue', e.target.value)} placeholder="0.000" />
                </div>
                <div>
                  <label style={labelStyle}>Montant transfert cumulé</label>
                  <input type="number" style={inputStyle()} value={d.mntTransCumValue}
                    onChange={e => updateDetail(i, 'mntTransCumValue', e.target.value)} placeholder="0.000" />
                </div>
                <div>
                  <label style={labelStyle}>IA Enc. Restr.</label>
                  <input style={inputStyle()} value={d.iaEncRest}
                    onChange={e => updateDetail(i, 'iaEncRest', e.target.value)} maxLength={2} />
                </div>
              </div>
              {/* Beneficiary sub-section */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EEF3F7' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Bénéficiaire</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px 16px' }}>
                  <div>
                    <label style={labelStyle}>Type identifiant</label>
                    <select style={selectStyle} value={d.benifTypeIdentifiant}
                      onChange={e => updateDetail(i, 'benifTypeIdentifiant', e.target.value)}>
                      <option value="C">C — CIN</option>
                      <option value="S">S — Séjour</option>
                      <option value="P">P — Passeport</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Code identifiant</label>
                    <input style={inputStyle()} value={d.benifCodIdentifiant}
                      onChange={e => updateDetail(i, 'benifCodIdentifiant', e.target.value)} maxLength={12} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nom<span style={{ color: '#DC2626' }}>*</span></label>
                    <input style={inputStyle(!!errors[`${i}_benifNom`])} value={d.benifNom}
                      onChange={e => updateDetail(i, 'benifNom', e.target.value)} maxLength={50} />
                    {errors[`${i}_benifNom`] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{errors[`${i}_benifNom`]}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Prénom</label>
                    <input style={inputStyle()} value={d.benifPrenom}
                      onChange={e => updateDetail(i, 'benifPrenom', e.target.value)} maxLength={50} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Step 4 ── */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#F6FAFE', border: '1.5px solid #D8E8F2', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>En-tête</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px', fontSize: 13 }}>
              {[
                ['Période', entete.periodDec], ['Agence', entete.agence],
                ['N° Dossier AVA', entete.numDosAVA], ['Code activité', entete.numActv],
                ['Type allocation', entete.typAlloc === '1' ? 'Exportateur' : entete.typAlloc === '2' ? 'Marché étranger' : 'Autres activités'],
                ['Statut dossier', entete.statDoss === '1' ? 'Actif' : 'Suspendu'],
                ['Date domiciliation', entete.datDom], ['Début période', entete.debPeriodFon],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#6B8CAE', fontWeight: 600, minWidth: 160, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: '#1E2E42' }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#F6FAFE', border: '1.5px solid #D8E8F2', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B8CAE', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
              Opérations — {details.length} détail(s)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#EEF3F7' }}>
                  {['Sens', 'Code', 'Date', 'Montant', 'Devise', 'Bénéficiaire'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#2D3E54', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {details.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #EEF3F7' }}>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: d.typOp === 'C' ? '#D1FAE5' : '#FEE2E2', color: d.typOp === 'C' ? '#065F46' : '#991B1B' }}>{d.typOp}</span>
                    </td>
                    <td style={{ padding: '7px 10px', fontWeight: 600, color: '#435B7B' }}>{d.desgnOp}</td>
                    <td style={{ padding: '7px 10px', color: '#1E2E42' }}>{d.datOp}</td>
                    <td style={{ padding: '7px 10px', color: '#1E2E42' }}>{d.mntDinOpValue}</td>
                    <td style={{ padding: '7px 10px', color: '#6B8CAE' }}>{d.mntDinOpCcy}</td>
                    <td style={{ padding: '7px 10px', color: '#1E2E42' }}>{d.benifNom} {d.benifPrenom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={handleGenerateXml} disabled={loadingXml} style={{ ...btnGhost, cursor: loadingXml ? 'wait' : 'pointer' }}>
              {loadingXml ? <><span style={{ ...spinner, border: '2px solid rgba(67,91,123,0.2)', borderTopColor: '#435B7B' }} /> Génération...</> : <><FileCode size={14} /> Prévisualiser XML</>}
            </button>
          </div>
          {generatedXml && (
            <details style={{ background: '#1E2E42', borderRadius: 12, overflow: 'hidden' }}>
              <summary style={{ padding: '10px 16px', color: '#A8C0D9', cursor: 'pointer', fontSize: 13, fontWeight: 600, userSelect: 'none' }}>
                XML DC-AVA généré
              </summary>
              <pre style={{ margin: 0, padding: '12px 16px', color: '#9ECFB3', fontSize: 11, overflowX: 'auto', maxHeight: 280 }}>
                {generatedXml}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* ── Nav Buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #EEF3F7' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleReset} style={btnGhost}><RotateCcw size={13} /> Réinitialiser</button>
          {step > 1 && <button onClick={handleBack} style={btnGhost}>← Précédent</button>}
        </div>
        <div>
          {step < 4 ? (
            <button onClick={handleNext} style={btnPrimary()}>Suivant →</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              style={{ ...btnPrimary(submitting), background: submitting ? '#A8C0D9' : 'linear-gradient(135deg, #059669, #047857)' }}>
              {submitting ? <><span style={spinner} /> Soumission...</> : <><Send size={15} /> Transmettre à la Centrale BCT</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ReportingBCT() {
  const [activeTab, setActiveTab] = useState<'excel' | 'manuel'>('excel');
  const { days, targetDate, color } = getJ15Countdown();
  const progressPct = Math.max(0, Math.min(100, ((30 - days) / 30) * 100));

  return (
    <div style={{ padding: '24px', maxWidth: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #435B7B, #2D3E54)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(67,91,123,0.25)',
          }}>
            <FileBarChart2 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1E2E42', lineHeight: 1.2 }}>
              Déclaration BCT — DC-AVA
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: '#6B8CAE', fontWeight: 500 }}>
              Annexe DC-001 • Circ. 2020-03 Art. 24
            </p>
          </div>
        </div>

        {/* J+15 countdown */}
        <div style={{
          background: '#F6FAFE', border: '1.5px solid #D8E8F2', borderRadius: 12,
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <Clock size={16} style={{ color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2D3E54' }}>Prochaine transmission BCT</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>
                {days > 0 ? `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}` : 'Délai dépassé !'}
                {' '}(J+15 = {targetDate})
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#D8E8F2', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg, ${color}99, ${color})`,
                width: `${progressPct}%`, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Card with tabs */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #D8E8F2', overflow: 'hidden', boxShadow: '0 2px 8px rgba(14,28,50,0.04)' }}>
        {/* Custom tab bar */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #EEF3F7', background: '#F6FAFE' }}>
          {[
            { id: 'excel', label: 'Injection Excel', desc: 'Charger DC_AVA_V3.xlsx' },
            { id: 'manuel', label: 'Saisie Manuelle', desc: 'Formulaire pas-à-pas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1, padding: '14px 20px', border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                borderBottom: activeTab === tab.id ? '2.5px solid #435B7B' : '2.5px solid transparent',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: activeTab === tab.id ? '#435B7B' : '#6B8CAE' }}>
                {tab.label}
              </div>
              <div style={{ fontSize: 11, color: '#8FAFC8', marginTop: 2 }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'excel' ? <InjectionExcelTab /> : <SaisieManuelleTab />}
        </div>
      </div>
    </div>
  );
}
