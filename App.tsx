import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { NotificationProvider } from './components/NotificationContext';
import { LoginForm } from './components/LoginForm';
import { MSTransferCreate } from './components/MSTransferCreate';
import { MSTransferConsultation } from './components/MSTransferConsultation';
import { AVAWorkflowAdmin } from './components/AVAWorkflowAdmin';
import {
  ErrorProvider,
  useErrorHandler,
} from './components/ErrorContext';
import { ErrorDialog } from './components/ErrorDialog';

type AppUser = {
  email: string;
};

type TransferSection =
  | 'ms-tr-create'
  | 'ms-tr-consultation';

const DEFAULT_SECTION: TransferSection =
  'ms-tr-consultation';

const AUTH_BYPASS =
  import.meta.env.DEV &&
  import.meta.env.VITE_AUTH_BYPASS === 'true';

const DEV_USER: AppUser = {
  email:
    import.meta.env.VITE_DEV_USER_EMAIL ||
    'transfer.developer@ibansys.local',
};

function isTransferSection(
  section: string | null,
): section is TransferSection {
  return (
    section === 'ms-tr-create' ||
    section === 'ms-tr-consultation'
  );
}

function getInitialSection(): TransferSection {
  const storedSection =
    sessionStorage.getItem('app_section');

  return isTransferSection(storedSection)
    ? storedSection
    : DEFAULT_SECTION;
}

function getInitialUser(): AppUser | null {
  if (AUTH_BYPASS) {
    return DEV_USER;
  }

  const storedUser =
    sessionStorage.getItem('auth_user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AppUser;
  } catch {
    sessionStorage.removeItem('auth_user');
    return null;
  }
}

export default function App() {
  const [activeSection, setActiveSection] =
    useState<TransferSection>(getInitialSection);

  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(() => {
      if (AUTH_BYPASS) {
        return true;
      }

      return (
        sessionStorage.getItem('auth_user') !== null
      );
    });

  const [user, setUser] =
    useState<AppUser | null>(getInitialUser);

  /*
   * This state is retained because the existing Topbar exposes
   * the administration action. It is not a navigable business
   * section and does not appear in the Sidebar.
   */
  const [wfAdminOpen, setWfAdminOpen] =
    useState(false);

  useEffect(() => {
    if (!AUTH_BYPASS) {
      return;
    }

    sessionStorage.setItem(
      'auth_user',
      JSON.stringify(DEV_USER),
    );

    setUser(DEV_USER);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const handleKeyboardShortcut = (
      event: KeyboardEvent,
    ) => {
      if (
        event.altKey &&
        event.shiftKey &&
        event.key.toUpperCase() === 'W'
      ) {
        event.preventDefault();
        setWfAdminOpen(open => !open);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyboardShortcut,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyboardShortcut,
      );
    };
  }, []);

  const handleLogin = (
    email: string,
    _password: string,
  ) => {
    const userData: AppUser = { email };

    sessionStorage.setItem(
      'auth_user',
      JSON.stringify(userData),
    );

    sessionStorage.setItem(
      'app_section',
      DEFAULT_SECTION,
    );

    setUser(userData);
    setIsAuthenticated(true);
    setActiveSection(DEFAULT_SECTION);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('app_section');

    if (AUTH_BYPASS) {
      sessionStorage.setItem(
        'auth_user',
        JSON.stringify(DEV_USER),
      );

      setUser(DEV_USER);
      setIsAuthenticated(true);
      setActiveSection(DEFAULT_SECTION);
      setWfAdminOpen(false);
      return;
    }

    sessionStorage.removeItem('auth_user');

    setUser(null);
    setIsAuthenticated(false);
    setActiveSection(DEFAULT_SECTION);
    setWfAdminOpen(false);
  };

  const handleNavigate = (section: string) => {
    const nextSection = isTransferSection(section)
      ? section
      : DEFAULT_SECTION;

    setActiveSection(nextSection);

    sessionStorage.setItem(
      'app_section',
      nextSection,
    );
  };

  if (!AUTH_BYPASS && !isAuthenticated) {
    return (
      <ErrorProvider>
        <LoginForm onLogin={handleLogin} />
        <GlobalErrorDialog />
        <Toaster position="top-right" richColors />
      </ErrorProvider>
    );
  }

  return (
    <ErrorProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-background">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={handleNavigate}
            onLogout={handleLogout}
          />

          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar
              activeSection={activeSection}
              userEmail={user?.email || DEV_USER.email}
              onAdminToggle={() =>
                setWfAdminOpen(open => !open)
              }
            />

            <main className="flex-1 overflow-auto">
              <div
                key={activeSection}
                className="page-transition"
                style={{ minHeight: '100%' }}
              >
                <TransferContent
                  activeSection={activeSection}
                  onNavigate={handleNavigate}
                />
              </div>
            </main>
          </div>
        </div>

        <AVAWorkflowAdmin
          open={wfAdminOpen}
          onClose={() => setWfAdminOpen(false)}
        />

        <GlobalErrorDialog />

        <Toaster position="top-right" richColors />
      </NotificationProvider>
    </ErrorProvider>
  );
}

interface TransferContentProps {
  activeSection: TransferSection;
  onNavigate: (section: string) => void;
}

function TransferContent({
  activeSection,
  onNavigate,
}: TransferContentProps) {
  switch (activeSection) {
    case 'ms-tr-create':
      return (
        <MSTransferCreate
          onNavigate={onNavigate}
        />
      );

    case 'ms-tr-consultation':
    default:
      return (
        <MSTransferConsultation
          onNavigate={onNavigate}
        />
      );
  }
}

function GlobalErrorDialog() {
  const { error, hideError } = useErrorHandler();

  return (
    <ErrorDialog
      open={error.isOpen}
      onOpenChange={open => {
        if (!open) {
          hideError();
        }
      }}
      errorMessage={error.message}
      errorDetails={error.details}
      title={error.title}
    />
  );
}
