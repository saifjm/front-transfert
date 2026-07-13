import React, { useState, useEffect } from 'react';
import { authenticatedFetch, getWfUserContext } from './utils/api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { NotificationProvider } from './components/NotificationContext';
import { Dashboard } from './components/Dashboard';
import { AVAForm } from './components/AVAForm';
import { AVAMiseAJourBeneficiaires } from './components/AVAMiseAJourBeneficiaires';
import { AlimentationDossierExportateur } from './components/AlimentationDossierExportateur';
import { AVAFraisVoyage } from './components/AVAFraisVoyage';
import { AVARetrocession } from './components/AVARetrocession';
import { AVAReservation } from './components/AVAReservation';
import { AVAAnnulationReservation } from './components/AVAAnnulationReservation';
import { AVASuspension } from './components/AVASuspension';
import { AVALeveeSuspension } from './components/AVALeveeSuspension';
import { AVAAlimentationAccordBCT } from './components/AVAAlimentationAccordBCT';
import { AVAClotureDossier } from './components/AVAClotureDossier';
import { ConsultationDossierAVA } from './components/ConsultationDossierAVA';
import { AVAGenerationDiverses } from './components/AVAGenerationDiverses';
import { AVAGenerationDossier } from './components/AVAGenerationDossier';
import { DeclarationChiffreAffairesFiscal } from './components/DeclarationChiffreAffairesFiscal';
import { ImportWizard } from './components/ImportWizard';
import { TemplateLibrary } from './components/TemplateLibrary';
import { SequenceGenerator } from './components/SequenceGenerator';
import { Analytics } from './components/Analytics';
import { PaymentPortal } from './components/PaymentPortal';
import { ComplianceCenter } from './components/ComplianceCenter';
import { Settings } from './components/Settings';
import { LoginForm } from './components/LoginForm';
import { MSTransferCreate } from './components/MSTransferCreate';
import { WFTaskView } from './components/WFTaskView';
import { AVAWorkflowAdmin } from './components/AVAWorkflowAdmin';
import { ErrorProvider, useErrorHandler } from './components/ErrorContext';
import { ErrorDialog } from './components/ErrorDialog';
import { ErrorTestComponent } from './components/ErrorTestComponent';
import { ReportingBCT } from './components/ReportingBCT';
import { Toaster } from 'sonner';

type AppUser = {
  email: string;
};

const AUTH_BYPASS =
  import.meta.env.DEV &&
  import.meta.env.VITE_AUTH_BYPASS === 'true';

const DEV_USER: AppUser = {
  email:
    import.meta.env.VITE_DEV_USER_EMAIL ||
    'transfer.developer@ibansys.local',
};

export default function App() {
  const [activeSection, setActiveSection] = useState(
    () => sessionStorage.getItem('app_section') || 'dashboard'
  );

  const [deepLinkDossier, setDeepLinkDossier] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (AUTH_BYPASS) {
      return true;
    }

    return sessionStorage.getItem('auth_user') !== null;
  });

  const [user, setUser] = useState<AppUser | null>(() => {
    if (AUTH_BYPASS) {
      return DEV_USER;
    }

    const stored = sessionStorage.getItem('auth_user');

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as AppUser;
    } catch {
      sessionStorage.removeItem('auth_user');
      return null;
    }
  });

  const [wfAdminOpen, setWfAdminOpen] = useState(false);

  /*
   * Create a mock authenticated user during local development.
   * This is useful when components directly read auth_user.
   */
  useEffect(() => {
    if (!AUTH_BYPASS) {
      return;
    }

    sessionStorage.setItem('auth_user', JSON.stringify(DEV_USER));
    setUser(DEV_USER);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setWfAdminOpen(open => !open);
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);

  /*
   * Do not execute this authenticated administrative call while
   * authentication is bypassed.
   */
  useEffect(() => {
    if (AUTH_BYPASS || !isAuthenticated) {
      return;
    }

    if (sessionStorage.getItem('wf_agc_bk_patched')) {
      return;
    }

    const { userId, orgNodeId, roleCode } = getWfUserContext();

    const wfHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Role-Code': roleCode,
    };

    if (orgNodeId) {
      wfHeaders['X-Org-Node-Id'] = orgNodeId;
    }

    authenticatedFetch(
      '/api/wf/admin/definitions/by-key/operations_agence_service_central/downstream',
      {
        method: 'PATCH',
        headers: wfHeaders,
        body: JSON.stringify({
          responseBusinessKeyPath: '$.numDossier',
        }),
      }
    )
      .then(response => {
        if (response.ok) {
          sessionStorage.setItem('wf_agc_bk_patched', '1');
        }
      })
      .catch(() => {
        // The existing behavior intentionally ignores this initialization error.
      });
  }, [isAuthenticated]);

  const handleLogin = (email: string, _password: string) => {
    const userData: AppUser = { email };

    sessionStorage.setItem('auth_user', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    /*
     * During authentication bypass, logout only resets the current page.
     * It must not display the login screen.
     */
    if (AUTH_BYPASS) {
      sessionStorage.removeItem('app_section');
      sessionStorage.setItem('auth_user', JSON.stringify(DEV_USER));

      setUser(DEV_USER);
      setIsAuthenticated(true);
      setActiveSection('dashboard');
      setDeepLinkDossier('');

      return;
    }

    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('app_section');

    setUser(null);
    setIsAuthenticated(false);
    setActiveSection('dashboard');
    setDeepLinkDossier('');
  };

  const handleNavigate = (section: string, dossierNum?: string) => {
    setDeepLinkDossier(dossierNum || '');
    setActiveSection(section);
    sessionStorage.setItem('app_section', section);
  };

  /*
   * The login page remains available when the bypass is disabled.
   */
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
            onSectionChange={section => handleNavigate(section)}
            onLogout={handleLogout}
          />

          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar
              activeSection={activeSection}
              userEmail={user?.email || DEV_USER.email}
              onAdminToggle={() => setWfAdminOpen(open => !open)}
            />

            <main className="flex-1 overflow-auto">
              <div
                key={activeSection}
                className="page-transition"
                style={{ minHeight: '100%' }}
              >
                {renderContent(
                  activeSection,
                  handleNavigate,
                  deepLinkDossier
                )}
              </div>
            </main>
          </div>
        </div>

        <AVAWorkflowAdmin
          open={wfAdminOpen}
          onClose={() => setWfAdminOpen(false)}
        />

        <GlobalErrorDialog />

        <Toaster
          position="top-right"
          richColors
        />
      </NotificationProvider>
    </ErrorProvider>
  );
}

function renderContent(
  activeSection: string,
  onNavigate: (section: string, dossierNum?: string) => void,
  deepLinkDossier: string,
) {
  switch (activeSection) {
    case 'dashboard':
      return <Dashboard onNavigate={onNavigate} />;
    case 'ava-ouverture':
      return <AVAForm />;
    case 'ava-wf-taches':
      return <WFTaskView />;
    case 'ava-form':
      return <AVAForm />;
    case 'ava-beneficiaires':
      return <AVAMiseAJourBeneficiaires initialDossierNum={deepLinkDossier} />;
    case 'ava-alimentation':
      return <AlimentationDossierExportateur initialDossierNum={deepLinkDossier} />;
    case 'ava-frais-voyage':
      return <AVAFraisVoyage initialDossierNum={deepLinkDossier} />;
    case 'ava-retrocession':
      return <AVARetrocession initialDossierNum={deepLinkDossier} />;
    case 'ava-reservation':
      return <AVAReservation initialDossierNum={deepLinkDossier} />;
    case 'ava-annulation-reservation':
      return <AVAAnnulationReservation initialDossierNum={deepLinkDossier} />;
    case 'ava-suspension':
      return <AVASuspension initialDossierNum={deepLinkDossier} />;
    case 'ava-levee-suspension':
      return <AVALeveeSuspension initialDossierNum={deepLinkDossier} />;
    case 'ava-alimentation-accord-bct':
      return <AVAAlimentationAccordBCT initialDossierNum={deepLinkDossier} />;
    case 'ava-cloture-dossier':
      return <AVAClotureDossier initialDossierNum={deepLinkDossier} />;
    case 'ava-consultation-dossier':
      return <ConsultationDossierAVA initialNumeroDossier={deepLinkDossier} />;
    case 'ava-generation-diverses':
      return <AVAGenerationDiverses />;
    case 'ava-generation-dossier':
      return <AVAGenerationDossier />;
    case 'declaration-chiffre-affaires-fiscal':
      return <DeclarationChiffreAffairesFiscal />;
    case 'reporting-bct':
      return <ReportingBCT />;
    case 'error-test':
      return <ErrorTestComponent />;
    case 'import':
      return <ImportWizard />;
    case 'templates':
      return <TemplateLibrary />;
    case 'sequences':
      return <SequenceGenerator />;
    case 'analytics':
      return <Analytics />;
    case 'payments':
      return <PaymentPortal />;
    case 'compliance':
      return <ComplianceCenter />;
    case 'settings':
      return <Settings />;
    case 'ms-tr-create':
      return <MSTransferCreate />;
    default:
      return <Dashboard />;
  }
}

function GlobalErrorDialog() {
  const { error, hideError } = useErrorHandler();

  return (
    <ErrorDialog
      open={error.isOpen}
      onOpenChange={(open) => {
        if (!open) hideError();
      }}
      errorMessage={error.message}
      errorDetails={error.details}
      title={error.title}
    />
  );
}