import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { safeJsonParse } from '../utils';
import { authenticatedFetch } from '../utils/api';

export type NotifType = 'warning' | 'error' | 'success' | 'info';
export type NotifCategory = 'dossier' | 'bct' | 'systeme' | 'declaration' | 'alerte';

export interface Notification {
  id: string;
  type: NotifType;
  category: NotifCategory;
  title: string;
  message: string;
  time: string;       // display string
  timestamp: number;  // for sorting
  read: boolean;
  actionLabel?: string;
  dossierNum?: string;
}

interface OuvertureDossierDTO {
  numDossier?: number;
  dateDossier?: string;
  etatDossier?: string;
  noPieceClient?: string;
  nomClient?: string;
  typeDossierAva?: number;
  mntAutorise?: number;
  mntUtilise?: number;
  mntReserve?: number;
  solde?: number;
  numeroBct?: number | string;
  dateBct?: string;
}

const formatRelativeTime = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
};

const toTimestamp = (dateLike?: string) => {
  if (!dateLike) return Date.now();
  const ts = new Date(dateLike).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
};

const buildNotificationsFromDossiers = (rows: OuvertureDossierDTO[]): Notification[] => {
  const items: Notification[] = [];
  for (const d of rows) {
    const dossierNum = d.numDossier ? `AVA-${d.numDossier}` : undefined;
    const ts = toTimestamp(d.dateDossier);
    const client = d.nomClient || d.noPieceClient || 'Client';
    const typeDos = d.typeDossierAva ? `type ${d.typeDossierAva}` : 'type inconnu';

    if (d.etatDossier === 'B') {
      items.push({
        id: `susp-${d.numDossier ?? Math.random()}`,
        type: 'error',
        category: 'alerte',
        title: 'Dossier suspendu',
        message: `Le dossier ${dossierNum || '-'} (${client}) est en état suspendu.`,
        timestamp: ts,
        time: formatRelativeTime(ts),
        read: false,
        actionLabel: 'Traiter',
        dossierNum,
      });
    } else if (d.etatDossier === 'C') {
      items.push({
        id: `clot-${d.numDossier ?? Math.random()}`,
        type: 'success',
        category: 'dossier',
        title: 'Dossier clôturé',
        message: `Le dossier ${dossierNum || '-'} est clôturé. Solde final: ${(d.solde ?? 0).toLocaleString('fr-TN')}.`,
        timestamp: ts,
        time: formatRelativeTime(ts),
        read: false,
        dossierNum,
      });
    } else {
      items.push({
        id: `actif-${d.numDossier ?? Math.random()}`,
        type: 'info',
        category: 'dossier',
        title: 'Dossier actif',
        message: `Le dossier ${dossierNum || '-'} (${typeDos}) est actif avec un solde de ${(d.solde ?? 0).toLocaleString('fr-TN')}.`,
        timestamp: ts,
        time: formatRelativeTime(ts),
        read: false,
        actionLabel: 'Consulter',
        dossierNum,
      });
    }

    if (d.numeroBct) {
      items.push({
        id: `bct-${d.numDossier ?? Math.random()}`,
        type: 'success',
        category: 'bct',
        title: 'Accord BCT enregistré',
        message: `Autorisation BCT n°${d.numeroBct} associée au dossier ${dossierNum || '-'}.`,
        timestamp: ts,
        time: formatRelativeTime(ts),
        read: false,
        actionLabel: 'Voir dossier',
        dossierNum,
      });
    }
  }

  return items
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
};

// ── Context ────────────────────────────────────────────────────────────────────

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !n.read).length;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/operations-deleguees');
      if (!response.ok) throw new Error(`HTTP_ERROR_${response.status}`);
      const data = await safeJsonParse<OuvertureDossierDTO[]>(response);
      if (!Array.isArray(data)) throw new Error('JSON_PARSE_ERROR');
      const built = buildNotificationsFromDossiers(data)
        .filter(n => !dismissedIds.has(n.id))
        .map(n => ({ ...n, read: readIds.has(n.id) }));
      setNotifications(built);
    } catch (err: any) {
      setError('Impossible de charger les notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [dismissedIds, readIds]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      return next;
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications(prev => prev.filter(n => !n.read));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, refresh, markAsRead, markAllAsRead, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
