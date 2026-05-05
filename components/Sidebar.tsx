import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  Plane,
  ChevronDown,
  ChevronRight,
  LogOut,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  FolderOpen,
  FilePlus,
  ClipboardList,
  Wallet,
  Users,
  MapPin,
  ArrowLeftRight,
  CalendarCheck,
  CalendarX,
  ShieldAlert,
  ShieldCheck,
  Landmark,
  Lock,
  FileOutput,
  FolderOutput,
  BarChart3,
  X,
  Cog,
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const avaItems: NavItem[] = [
  { id: 'ava-consultation-dossier', label: 'Recherche', icon: FolderOpen },
  { id: 'ava-ouverture', label: 'Ouverture dossier', icon: FilePlus },
  { id: 'ava-alimentation', label: 'Alimentation Exportateur', icon: Wallet },
  { id: 'ava-beneficiaires', label: 'Mise à jour bénéficiaires', icon: Users },
  { id: 'ava-frais-voyage', label: 'Frais de voyage', icon: MapPin },
  { id: 'ava-retrocession', label: 'Rétrocession', icon: ArrowLeftRight },
  { id: 'ava-reservation', label: 'Réservation', icon: CalendarCheck },
  { id: 'ava-annulation-reservation', label: 'Annulation Réservation', icon: CalendarX },
  { id: 'ava-suspension', label: 'Suspension', icon: ShieldAlert },
  { id: 'ava-levee-suspension', label: 'Levée de suspension', icon: ShieldCheck },
  { id: 'ava-alimentation-accord-bct', label: 'Alimentation accord BCT', icon: Landmark },
  { id: 'ava-cloture-dossier', label: 'Clôture dossier', icon: Lock },
  { id: 'ava-generation-diverses', label: 'Génération diverses', icon: FileOutput },
  { id: 'ava-generation-dossier', label: 'Génération dossier', icon: FolderOutput },
  { id: 'ava-wf-taches', label: 'Tâches en attente', icon: ClipboardList },
];

const operationsItems: NavItem[] = [
  { id: 'declaration-chiffre-affaires-fiscal', label: 'Déclaration CA Fiscal', icon: BarChart3 },
];

function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [hovered, setHovered] = useState(false);
  if (!show) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: 72,
            top: 'auto',
            transform: 'translateY(-50%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#2D3E54',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(45,62,84,0.25)',
            }}
          >
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ activeSection, onSectionChange, onLogout }: SidebarProps) {
  const [isDossierAvaOpen, setIsDossierAvaOpen] = useState(true);
  const [isOperationsCommunesOpen, setIsOperationsCommunesOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const allItems = [...avaItems, ...operationsItems, { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }];
  const filteredItems = searchQuery
    ? allItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  const isAvaActive = avaItems.some(i => i.id === activeSection);
  const isOpsActive = operationsItems.some(i => i.id === activeSection);

  const navBtnClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
      active
        ? 'text-white'
        : 'text-[#A8C0D9] hover:text-[#f4f7f9] hover:bg-white/[0.07]'
    }`;

  const navBtnStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: 'linear-gradient(135deg, rgba(107,140,174,0.28) 0%, rgba(67,91,123,0.45) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.08)' }
      : {};

  const subBtnClass = (active: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-sm transition-all duration-150 text-left ${
      active
        ? 'text-white'
        : 'text-[#8FAFC8] hover:text-[#D6E4F0] hover:bg-white/[0.06]'
    }`;

  const renderSubItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = activeSection === item.id;
    return (
      <li key={item.id}>
        <button
          onClick={() => { onSectionChange(item.id); setSearchQuery(''); }}
          className={subBtnClass(active)}
          style={active ? {
            background: 'linear-gradient(135deg, rgba(107,140,174,0.2) 0%, rgba(67,91,123,0.35) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            borderLeft: '2px solid rgba(107,140,174,0.6)',
            paddingLeft: 10,
          } : { borderLeft: '2px solid transparent', paddingLeft: 10 }}
        >
          <Icon style={{ width: 14, height: 14, flexShrink: 0, opacity: active ? 1 : 0.55, transition: 'opacity 0.15s' }} />
          <span className="truncate">{item.label}</span>
          {active && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 pulse-dot" style={{ background: '#6B8CAE' }} />
          )}
        </button>
      </li>
    );
  };

  return (
    <div
      className={`flex flex-col transition-all duration-300 relative z-50 ${isCollapsed ? 'w-[68px]' : 'w-[272px]'}`}
      style={{
        background: 'linear-gradient(180deg, #2D3E54 0%, #253345 100%)',
        borderRight: '1px solid rgba(67,91,123,0.3)',
      }}
    >
      {/* Header */}
      <div className={`relative ${isCollapsed ? 'px-2 py-5' : 'px-0 pt-0 pb-0'}`}>
        {!isCollapsed ? (
          <div className="flex flex-col">
            {/* Brand */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                  boxShadow: '0 2px 8px rgba(107,140,174,0.35)',
                }}
              >
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.5px' }}>IB</span>
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ color: '#f4f7f9', fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', lineHeight: 1.2 }}>
                  IBANSYS
                </div>
                <div style={{ color: '#6B8CAE', fontSize: 11, fontWeight: 500, marginTop: 2, lineHeight: 1, letterSpacing: '0.3px' }}>
                  Commerce Extérieur
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/[0.08] flex-shrink-0"
                title="Réduire la sidebar"
                style={{ color: '#6B8CAE' }}
              >
                <PanelLeftClose className="w-[18px] h-[18px]" />
              </button>
            </div>
            {/* Powered by */}
            <div className="px-5 pb-4 flex items-center gap-2">
              <div className="h-px flex-1" style={{ background: 'rgba(107,140,174,0.15)' }} />
              <span style={{ color: '#506A84', fontSize: 10, fontWeight: 500, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                Powered by SMI
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(107,140,174,0.15)' }} />
            </div>
            {/* Search */}
            <div className="px-4 pb-4">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
                style={{
                  background: searchFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${searchFocused ? 'rgba(107,140,174,0.4)' : 'rgba(107,140,174,0.15)'}`,
                }}
              >
                <Search style={{ width: 15, height: 15, color: '#6B8CAE', flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Rechercher..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#D6E4F0', fontSize: 13, fontWeight: 400,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B8CAE', display: 'flex', padding: 0 }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                boxShadow: '0 2px 8px rgba(107,140,174,0.35)',
              }}
            >
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.5px' }}>IB</span>
            </div>
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/[0.08]"
              title="Développer la sidebar"
              style={{ color: '#6B8CAE' }}
            >
              <PanelLeftOpen className="w-[18px] h-[18px]" />
            </button>
          </div>
        )}
        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(107,140,174,0.25), transparent)' }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(107,140,174,0.3) transparent' }}>
        {/* Search results */}
        {filteredItems ? (
          <div className="space-y-1">
            <div className="px-3 pb-2" style={{ fontSize: 10, fontWeight: 700, color: '#506A84', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Résultats ({filteredItems.length})
            </div>
            {filteredItems.length === 0 ? (
              <div className="px-3 py-6 text-center" style={{ color: '#506A84', fontSize: 13 }}>
                Aucun résultat
              </div>
            ) : (
              filteredItems.map(item => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onSectionChange(item.id); setSearchQuery(''); }}
                    className={navBtnClass(active)}
                    style={navBtnStyle(active)}
                  >
                    <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Section label */}
            {!isCollapsed && (
              <div className="px-3 pb-1 pt-1" style={{ fontSize: 10, fontWeight: 700, color: '#506A84', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Principal
              </div>
            )}

            {/* Dashboard */}
            <button
              onClick={() => onSectionChange('dashboard')}
              className={navBtnClass(activeSection === 'dashboard')}
              style={navBtnStyle(activeSection === 'dashboard')}
              title={isCollapsed ? 'Dashboard' : ''}
            >
              <LayoutDashboard style={{ width: 20, height: 20, flexShrink: 0 }} />
              {!isCollapsed && <span>Dashboard</span>}
            </button>

            {/* Separator */}
            {!isCollapsed && (
              <div className="px-3 pb-1 pt-3" style={{ fontSize: 10, fontWeight: 700, color: '#506A84', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Dossiers
              </div>
            )}
            {isCollapsed && <div className="my-2 mx-2 h-px" style={{ background: 'rgba(107,140,174,0.2)' }} />}

            {/* Dossier AVA */}
            <div>
              <button
                onClick={() => {
                  if (isCollapsed) {
                    setIsCollapsed(false);
                    setIsDossierAvaOpen(true);
                  } else {
                    setIsDossierAvaOpen(!isDossierAvaOpen);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isAvaActive && !isDossierAvaOpen
                    ? 'text-white'
                    : 'text-[#A8C0D9] hover:text-[#f4f7f9] hover:bg-white/[0.07]'
                }`}
                style={isAvaActive && !isDossierAvaOpen ? navBtnStyle(true) : {}}
                title={isCollapsed ? 'Dossier AVA' : ''}
              >
                <Plane style={{ width: 20, height: 20, flexShrink: 0 }} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Dossier AVA</span>
                    {isAvaActive && (
                      <span className="w-2 h-2 rounded-full pulse-dot flex-shrink-0 mr-1" style={{ background: '#6B8CAE' }} />
                    )}
                    <ChevronDown
                      style={{
                        width: 16, height: 16, flexShrink: 0,
                        transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                        transform: isDossierAvaOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        opacity: 0.5,
                      }}
                    />
                  </>
                )}
              </button>

              {/* Sub-items with smooth animation */}
              {!isCollapsed && isDossierAvaOpen && (
                <ul
                  className="mt-1 ml-3 pl-3 space-y-0.5 anim-fade-in-up"
                  style={{ borderLeft: '1.5px solid rgba(107,140,174,0.18)' }}
                >
                  {avaItems.map(renderSubItem)}
                </ul>
              )}
            </div>

            {/* Operations communes */}
            {!isCollapsed && (
              <div className="px-3 pb-1 pt-3" style={{ fontSize: 10, fontWeight: 700, color: '#506A84', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Opérations
              </div>
            )}
            {isCollapsed && <div className="my-2 mx-2 h-px" style={{ background: 'rgba(107,140,174,0.2)' }} />}

            <div>
              <button
                onClick={() => {
                  if (isCollapsed) {
                    setIsCollapsed(false);
                    setIsOperationsCommunesOpen(true);
                  } else {
                    setIsOperationsCommunesOpen(!isOperationsCommunesOpen);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isOpsActive && !isOperationsCommunesOpen
                    ? 'text-white'
                    : 'text-[#A8C0D9] hover:text-[#f4f7f9] hover:bg-white/[0.07]'
                }`}
                style={isOpsActive && !isOperationsCommunesOpen ? navBtnStyle(true) : {}}
                title={isCollapsed ? 'Opérations communes' : ''}
              >
                <Cog style={{ width: 20, height: 20, flexShrink: 0 }} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Opérations communes</span>
                    {isOpsActive && (
                      <span className="w-2 h-2 rounded-full pulse-dot flex-shrink-0 mr-1" style={{ background: '#6B8CAE' }} />
                    )}
                    <ChevronDown
                      style={{
                        width: 16, height: 16, flexShrink: 0,
                        transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                        transform: isOperationsCommunesOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        opacity: 0.5,
                      }}
                    />
                  </>
                )}
              </button>

              {!isCollapsed && isOperationsCommunesOpen && (
                <ul
                  className="mt-1 ml-3 pl-3 space-y-0.5 anim-fade-in-up"
                  style={{ borderLeft: '1.5px solid rgba(107,140,174,0.18)' }}
                >
                  {operationsItems.map(renderSubItem)}
                </ul>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(107,140,174,0.15)' }}>
        {!isCollapsed ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                  boxShadow: '0 2px 6px rgba(107,140,174,0.25)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, color: '#D6E4F0', margin: 0, lineHeight: 1.3 }} className="truncate">Admin Test</p>
                <p style={{ fontSize: 11, color: '#506A84', margin: 0, lineHeight: 1.3 }}>Administrateur</p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-white/[0.07]"
                style={{ color: '#6B8CAE' }}
                title="Déconnexion"
              >
                <LogOut style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>Déconnexion</span>
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                boxShadow: '0 2px 6px rgba(107,140,174,0.25)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>JD</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:bg-white/[0.07]"
                style={{ color: '#6B8CAE' }}
                title="Déconnexion"
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}