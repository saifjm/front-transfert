import React, { createContext, useContext, useState, useCallback } from 'react';

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

// ── Mock Data ──────────────────────────────────────────────────────────────────
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'error',
    category: 'alerte',
    title: 'Suspension automatique déclenchée',
    message: 'Le dossier 2024-00836 (SFBT GROUP) a été suspendu automatiquement — délai réglementaire dépassé.',
    time: "À l'instant",
    timestamp: Date.now() - 1 * 60 * 1000,
    read: false,
    actionLabel: 'Lever la suspension',
    dossierNum: '2024-00836',
  },
  {
    id: 'n2',
    type: 'warning',
    category: 'dossier',
    title: 'Échéance proche — 3 dossiers',
    message: 'Les dossiers 2024-00831, 2024-00832 et 2024-00835 arrivent à échéance dans moins de 3 jours.',
    time: 'Il y a 18 min',
    timestamp: Date.now() - 18 * 60 * 1000,
    read: false,
    actionLabel: 'Consulter',
  },
  {
    id: 'n3',
    type: 'success',
    category: 'dossier',
    title: 'Alimentation validée',
    message: 'Le dossier 2024-00847 (STEG INTERNATIONAL) a été alimenté avec succès — montant : 285 000 EUR.',
    time: 'Il y a 35 min',
    timestamp: Date.now() - 35 * 60 * 1000,
    read: false,
    dossierNum: '2024-00847',
  },
  {
    id: 'n4',
    type: 'info',
    category: 'bct',
    title: 'Accord BCT reçu',
    message: 'Un accord BCT a été reçu pour le dossier 2024-00839 (TUNISAIR TECHNICS). Veuillez procéder à l\'alimentation.',
    time: 'Il y a 1 h',
    timestamp: Date.now() - 60 * 60 * 1000,
    read: false,
    actionLabel: 'Alimenter',
    dossierNum: '2024-00839',
  },
  {
    id: 'n5',
    type: 'warning',
    category: 'alerte',
    title: 'Quota mensuel — Agence Sfax',
    message: 'L\'agence Sfax a atteint 87% de son quota mensuel d\'allocations pour voyages d\'affaires.',
    time: 'Il y a 2 h',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    read: false,
    actionLabel: 'Voir rapport',
  },
  {
    id: 'n6',
    type: 'error',
    category: 'systeme',
    title: 'Erreur API BCT',
    message: 'La connexion à l\'API BCT a échoué 3 fois consécutives. Vérifiez la configuration réseau.',
    time: 'Il y a 2 h',
    timestamp: Date.now() - 2.5 * 60 * 60 * 1000,
    read: true,
    actionLabel: 'Diagnostiquer',
  },
  {
    id: 'n7',
    type: 'success',
    category: 'declaration',
    title: 'Déclaration CA Fiscal soumise',
    message: 'La déclaration du chiffre d\'affaires fiscal 2025 a été soumise et acceptée avec succès.',
    time: 'Il y a 3 h',
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    read: true,
  },
  {
    id: 'n8',
    type: 'warning',
    category: 'dossier',
    title: 'Rétrocession en attente',
    message: 'Le dossier 2024-00821 (BIAT LEASING) a une rétrocession en attente depuis 15 jours.',
    time: 'Il y a 4 h',
    timestamp: Date.now() - 4 * 60 * 60 * 1000,
    read: true,
    actionLabel: 'Traiter',
    dossierNum: '2024-00821',
  },
  {
    id: 'n9',
    type: 'info',
    category: 'systeme',
    title: 'Mise à jour réglementaire',
    message: 'Circulaire BCT N°2026-03 publiée. De nouvelles règles s\'appliquent aux dossiers AVA à partir du 01/05/2026.',
    time: 'Hier, 16:42',
    timestamp: Date.now() - 20 * 60 * 60 * 1000,
    read: true,
    actionLabel: 'Lire la circulaire',
  },
  {
    id: 'n10',
    type: 'success',
    category: 'dossier',
    title: 'Bénéficiaires mis à jour',
    message: 'La liste des bénéficiaires du dossier 2024-00845 (DÉLICE HOLDING) a été mise à jour — 4 nouveaux bénéficiaires ajoutés.',
    time: 'Hier, 14:20',
    timestamp: Date.now() - 22 * 60 * 60 * 1000,
    read: true,
    dossierNum: '2024-00845',
  },
  {
    id: 'n11',
    type: 'info',
    category: 'dossier',
    title: '12 nouvelles ouvertures',
    message: '12 nouveaux dossiers AVA ont été ouverts aujourd\'hui sur l\'ensemble du réseau.',
    time: 'Hier, 09:05',
    timestamp: Date.now() - 27 * 60 * 60 * 1000,
    read: true,
  },
  {
    id: 'n12',
    type: 'warning',
    category: 'alerte',
    title: 'Dossiers sans activité — 7 jours',
    message: '5 dossiers sont en attente de validation depuis plus de 7 jours. Une action est requise.',
    time: 'Hier, 08:30',
    timestamp: Date.now() - 28 * 60 * 60 * 1000,
    read: true,
    actionLabel: 'Voir la liste',
  },
  {
    id: 'n13',
    type: 'success',
    category: 'dossier',
    title: 'Clôture confirmée',
    message: 'Le dossier 2024-00844 (SOTUPHARMA SA) a été clôturé avec succès. Montant rétrocédé : 93 200 GBP.',
    time: '09/04/2026',
    timestamp: Date.now() - 48 * 60 * 60 * 1000,
    read: true,
    dossierNum: '2024-00844',
  },
  {
    id: 'n14',
    type: 'info',
    category: 'systeme',
    title: 'Rapport mensuel disponible',
    message: 'Le rapport de synthèse mensuel — Mars 2026 est disponible. 1 247 dossiers actifs, 89 clôtures.',
    time: '08/04/2026',
    timestamp: Date.now() - 72 * 60 * 60 * 1000,
    read: true,
    actionLabel: 'Télécharger',
  },
  {
    id: 'n15',
    type: 'error',
    category: 'alerte',
    title: 'Réservation expirée',
    message: 'La réservation du dossier 2024-00828 (GROUPE CHIMIQUE TUN.) a expiré sans utilisation. Annulation requise.',
    time: '07/04/2026',
    timestamp: Date.now() - 96 * 60 * 60 * 1000,
    read: true,
    actionLabel: 'Annuler',
    dossierNum: '2024-00828',
  },
];

// ── Context ────────────────────────────────────────────────────────────────────

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications(prev => prev.filter(n => !n.read));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
