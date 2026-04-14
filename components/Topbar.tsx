import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, X, CheckCheck, Trash2, FolderOpen, Shield, Settings2,
  FileBarChart, AlertOctagon, ChevronRight, Clock, CheckCircle2,
  AlertTriangle, Info, XCircle, Filter, BellOff
} from 'lucide-react';
import { useNotifications, Notification, NotifType, NotifCategory } from './NotificationContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  success: { color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2,   label: 'Succès'       },
  warning: { color: '#d97706', bg: '#fffbeb', icon: AlertTriangle,  label: 'Avertissement' },
  error:   { color: '#dc2626', bg: '#fff1f2', icon: XCircle,        label: 'Erreur'        },
  info:    { color: '#2563eb', bg: '#eff6ff', icon: Info,           label: 'Information'   },
};

const CAT_CONFIG: Record<NotifCategory, { icon: React.ElementType; label: string }> = {
  dossier:     { icon: FolderOpen,   label: 'Dossier'      },
  bct:         { icon: Shield,       label: 'BCT'          },
  systeme:     { icon: Settings2,    label: 'Système'      },
  declaration: { icon: FileBarChart, label: 'Déclaration'  },
  alerte:      { icon: AlertOctagon, label: 'Alerte'       },
};

function groupByDay(notifs: Notification[]) {
  const now = Date.now();
  const todayCutoff  = now - 24 * 60 * 60 * 1000;
  const weekCutoff   = now - 7  * 24 * 60 * 60 * 1000;
  return {
    today:    notifs.filter(n => n.timestamp > todayCutoff),
    week:     notifs.filter(n => n.timestamp <= todayCutoff && n.timestamp > weekCutoff),
    older:    notifs.filter(n => n.timestamp <= weekCutoff),
  };
}

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({ n, onRead, onDismiss }: {
  n: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const tc = TYPE_CONFIG[n.type];
  const Icon = tc.icon;
  const CatIcon = CAT_CONFIG[n.category].icon;

  return (
    <div
      onClick={() => onRead(n.id)}
      style={{
        display: 'flex', gap: 12, padding: '13px 16px',
        background: n.read ? '#fff' : '#f8fafb',
        borderBottom: '1px solid #f0f3f7',
        cursor: 'pointer', transition: 'background 0.15s',
        borderLeft: `3px solid ${n.read ? 'transparent' : tc.color}`,
        position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f4f7fa')}
      onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : '#f8fafb')}
    >
      {/* Type icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: tc.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ width: 16, height: 16, color: tc.color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {!n.read && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tc.color, flexShrink: 0 }} />
          )}
          <span style={{
            fontSize: 13, fontWeight: n.read ? 500 : 700,
            color: '#2D3E54', lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260,
          }}>
            {n.title}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#6B8CAE', lineHeight: 1.45, margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {n.message}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Category chip */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10.5, fontWeight: 600, color: '#435B7B',
            background: '#EEF3F7', borderRadius: 5, padding: '2px 7px',
          }}>
            <CatIcon style={{ width: 10, height: 10 }} />
            {CAT_CONFIG[n.category].label}
          </span>
          {n.dossierNum && (
            <span style={{ fontSize: 10.5, color: '#A8C0D9', fontFamily: 'monospace' }}>{n.dossierNum}</span>
          )}
          <span style={{ fontSize: 10.5, color: '#A8C0D9', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} />
            {n.time}
          </span>
        </div>
        {n.actionLabel && (
          <button
            onClick={e => { e.stopPropagation(); onRead(n.id); }}
            style={{
              marginTop: 6, fontSize: 11.5, fontWeight: 600, color: '#435B7B',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 3,
            }}
          >
            {n.actionLabel} <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
        style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#A8C0D9', alignSelf: 'flex-start', marginTop: 2,
        }}
        title="Supprimer"
        onMouseEnter={e => (e.currentTarget.style.background = '#f0f3f7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#A8C0D9', textTransform: 'uppercase', letterSpacing: '0.6px', background: '#fafbfc', borderBottom: '1px solid #f0f3f7' }}>
      {label}
    </div>
  );
}

// ── Notification Panel ────────────────────────────────────────────────────────

type TabType = 'all' | 'unread' | 'alerte';

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss, clearAll } = useNotifications();
  const [tab, setTab] = useState<TabType>('all');

  const filtered = notifications.filter(n => {
    if (tab === 'unread') return !n.read;
    if (tab === 'alerte') return n.category === 'alerte' || n.type === 'error';
    return true;
  });

  const { today, week, older } = groupByDay(filtered);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'all',    label: 'Toutes',   count: notifications.length },
    { key: 'unread', label: 'Non lues', count: unreadCount },
    { key: 'alerte', label: 'Alertes',  count: notifications.filter(n => n.category === 'alerte' || n.type === 'error').length },
  ];

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 420, maxHeight: 'calc(100vh - 80px)',
      background: '#fff', borderRadius: 14,
      boxShadow: '0 8px 40px rgba(45,62,84,0.18)', border: '1px solid #e8edf2',
      zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #f0f3f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell style={{ width: 16, height: 16, color: '#435B7B' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#2D3E54' }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#dc2626', borderRadius: 20, padding: '1px 7px' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} title="Tout marquer comme lu"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#435B7B', background: '#EEF3F7', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>
                <CheckCheck style={{ width: 13, height: 13 }} /> Tout lire
              </button>
            )}
            <button onClick={clearAll} title="Supprimer les lues"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B8CAE', background: 'none', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: '#f0f3f7', border: 'none', cursor: 'pointer', color: '#6B8CAE' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: '7px 13px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, transition: 'all 0.15s',
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? '#2D3E54' : '#6B8CAE',
                borderBottom: tab === t.key ? '2px solid #435B7B' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '1px 6px',
                  background: tab === t.key ? '#EEF3F7' : '#f0f3f7',
                  color: tab === t.key ? '#435B7B' : '#A8C0D9',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(107,140,174,0.3) transparent' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', color: '#A8C0D9' }}>
            <BellOff style={{ width: 36, height: 36, marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#6B8CAE', margin: 0 }}>Aucune notification</p>
            <p style={{ fontSize: 12, color: '#A8C0D9', margin: '4px 0 0' }}>
              {tab === 'unread' ? 'Tout est à jour !' : 'Aucun élément dans cette catégorie'}
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <SectionLabel label="Aujourd'hui" />
                {today.map(n => <NotificationItem key={n.id} n={n} onRead={markAsRead} onDismiss={dismiss} />)}
              </>
            )}
            {week.length > 0 && (
              <>
                <SectionLabel label="Cette semaine" />
                {week.map(n => <NotificationItem key={n.id} n={n} onRead={markAsRead} onDismiss={dismiss} />)}
              </>
            )}
            {older.length > 0 && (
              <>
                <SectionLabel label="Plus tôt" />
                {older.map(n => <NotificationItem key={n.id} n={n} onRead={markAsRead} onDismiss={dismiss} />)}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f3f7', background: '#fafbfc', display: 'flex', justifyContent: 'center' }}>
        <button style={{ fontSize: 12.5, fontWeight: 600, color: '#435B7B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          Voir toutes les notifications <ChevronRight style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  dashboard:                         'Tableau de bord',
  'ava-consultation-dossier':        'Dossier AVA — Recherche',
  'ava-ouverture':                   'Dossier AVA — Ouverture',
  'ava-alimentation':                'Dossier AVA — Alimentation Exportateur',
  'ava-beneficiaires':               'Dossier AVA — Bénéficiaires',
  'ava-frais-voyage':                'Dossier AVA — Frais de voyage',
  'ava-retrocession':                'Dossier AVA — Rétrocession',
  'ava-reservation':                 'Dossier AVA — Réservation',
  'ava-annulation-reservation':      'Dossier AVA — Annulation de Réservation',
  'ava-suspension':                  'Dossier AVA — Suspension',
  'ava-levee-suspension':            'Dossier AVA — Levée de suspension',
  'ava-alimentation-accord-bct':     'Dossier AVA — Alimentation accord BCT',
  'ava-cloture-dossier':             'Dossier AVA — Clôture',
  'ava-generation-diverses':         'Dossier AVA — Génération diverses',
  'ava-generation-dossier':          'Dossier AVA — Génération dossier',
  'declaration-chiffre-affaires-fiscal': 'Opérations communes — Déclaration CA Fiscal',
};

interface TopbarProps {
  activeSection: string;
  userEmail?: string;
}

export function Topbar({ activeSection, userEmail }: TopbarProps) {
  const { unreadCount } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen]);

  const pageLabel = SECTION_LABELS[activeSection] ?? 'IBANSYS';
  const [module, page] = pageLabel.includes('—') ? pageLabel.split(' — ') : [null, pageLabel];

  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : 'AD';

  return (
    <div style={{
      height: 58, flexShrink: 0,
      background: '#ffffff',
      borderBottom: '1px solid #e8edf2',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      boxShadow: '0 1px 0 #e8edf2, 0 2px 8px rgba(67,91,123,0.04)',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* Left accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, #435B7B 0%, #6B8CAE 40%, transparent 70%)',
        opacity: 0.35,
      }} />

      {/* Breadcrumb */}
      <div className="anim-slide-left" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {module && (
          <>
            <span style={{
              fontSize: 12, color: '#A8C0D9', whiteSpace: 'nowrap',
              background: '#F4F8FC', border: '1px solid #E4EDF5',
              borderRadius: 6, padding: '3px 9px', fontWeight: 500,
            }}>
              {module}
            </span>
            <ChevronRight style={{ width: 13, height: 13, color: '#D6E4F0', flexShrink: 0 }} />
          </>
        )}
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#2D3E54',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {page ?? pageLabel}
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Notification Bell */}
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setPanelOpen(v => !v)}
            style={{
              position: 'relative', width: 38, height: 38, borderRadius: 10,
              background: panelOpen ? '#EEF3F7' : 'transparent',
              border: `1.5px solid ${panelOpen ? '#D6E4F0' : 'transparent'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', color: '#435B7B',
            }}
            title="Notifications"
            onMouseEnter={e => { if (!panelOpen) { (e.currentTarget as HTMLElement).style.background = '#EEF3F7'; (e.currentTarget as HTMLElement).style.borderColor = '#E4EDF5'; } }}
            onMouseLeave={e => { if (!panelOpen) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; } }}
          >
            <Bell style={{ width: 18, height: 18 }} />
            {unreadCount > 0 && (
              <span className="pulse-badge" style={{
                position: 'absolute', top: 5, right: 5,
                width: unreadCount > 9 ? 18 : 15, height: 15,
                borderRadius: 20, background: '#dc2626',
                border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8.5, fontWeight: 800, color: '#fff', lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 26, background: '#e8edf2' }} />

        {/* User avatar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, cursor: 'default',
          padding: '5px 10px 5px 6px', borderRadius: 10,
          border: '1px solid transparent',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F4F8FC'; (e.currentTarget as HTMLElement).style.borderColor = '#E4EDF5'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#6B8CAE,#2D3E54)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(67,91,123,0.25)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#2D3E54' }}>
              {userEmail?.split('@')[0] ?? 'Admin'}
            </span>
            <span style={{ fontSize: 11, color: '#A8C0D9' }}>Administrateur</span>
          </div>
        </div>
      </div>
    </div>
  );
}