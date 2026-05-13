import React, { useState, useEffect } from 'react';
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
import { WFTaskView } from './components/WFTaskView';
import { AVAWorkflowAdmin } from './components/AVAWorkflowAdmin';
import { ErrorProvider, useErrorHandler } from './components/ErrorContext';
import { ErrorDialog } from './components/ErrorDialog';
import { ErrorTestComponent } from './components/ErrorTestComponent';
import { Toaster } from 'sonner';

export default function App() {
  const [activeSection, setActiveSection] = useState(
    () => sessionStorage.getItem('app_section') || 'dashboard'
  );
  const [deepLinkDossier, setDeepLinkDossier] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('auth_user') !== null
  );
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const stored = sessionStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setActiveSection(s => {
          const next = s === 'wf-admin' ? 'dashboard' : 'wf-admin';
          sessionStorage.setItem('app_section', next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogin = (email: string, password: string) => {
    const userData = { email };
    sessionStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
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

  if (!isAuthenticated) {
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
            onSectionChange={(s) => handleNavigate(s)}
            onLogout={handleLogout}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar
              activeSection={activeSection}
              userEmail={user?.email}
              onAdminToggle={() => handleNavigate(activeSection === 'wf-admin' ? 'dashboard' : 'wf-admin')}
            />
            <main className="flex-1 overflow-auto">
              <div key={activeSection} className="page-transition" style={{ minHeight: '100%' }}>
                {renderContent(activeSection, handleNavigate, deepLinkDossier)}
              </div>
            </main>
          </div>
        </div>
        <GlobalErrorDialog />
        <Toaster position="top-right" richColors />
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
    case 'wf-admin':
      return <AVAWorkflowAdmin />;
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