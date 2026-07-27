import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Send,
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

const TRANSFER_ITEMS: NavItem[] = [
  { id: 'ms-tr-create', label: 'Nouveau dossier', icon: Plus },
  { id: 'ms-tr-consultation', label: 'Consultation', icon: Search },
];

function readCurrentUser(): {
  displayName: string;
  initials: string;
  roleLabel: string;
} {
  const roleCode = sessionStorage.getItem('wf_role_code') || 'Utilisateur';
  const storedUser = sessionStorage.getItem('auth_user');
  let displayName = 'Utilisateur';

  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser) as {
        email?: string;
        name?: string;
        displayName?: string;
      };

      displayName =
        parsed.displayName?.trim() ||
        parsed.name?.trim() ||
        parsed.email?.split('@')[0]?.trim() ||
        'Utilisateur';
    } catch {
      displayName = 'Utilisateur';
    }
  }

  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'UT';

  const roleLabel = roleCode
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return { displayName, initials, roleLabel };
}

export function Sidebar({
  activeSection,
  onSectionChange,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDossierTransfertOpen, setIsDossierTransfertOpen] =
    useState(true);

  const isTransferActive = TRANSFER_ITEMS.some(
    item => item.id === activeSection,
  );

  const currentUser = useMemo(readCurrentUser, []);

  useEffect(() => {
    if (isTransferActive) {
      setIsDossierTransfertOpen(true);
    }
  }, [isTransferActive]);

  const navButtonClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
      active
        ? 'text-white'
        : 'text-[#A8C0D9] hover:text-[#f4f7f9] hover:bg-white/[0.07]'
    }`;

  const navButtonStyle = (active: boolean): React.CSSProperties =>
    active
      ? {
          background:
            'linear-gradient(135deg, rgba(107,140,174,0.28) 0%, rgba(67,91,123,0.45) 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.08)',
        }
      : {};

  const subButtonClass = (active: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-sm transition-all duration-150 text-left ${
      active
        ? 'text-white'
        : 'text-[#8FAFC8] hover:text-[#D6E4F0] hover:bg-white/[0.06]'
    }`;

  const toggleTransferSection = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setIsDossierTransfertOpen(true);
      return;
    }

    setIsDossierTransfertOpen(current => !current);
  };

  return (
    <aside
      className={`flex flex-col h-screen transition-all duration-300 relative z-50 ${
        isCollapsed ? 'w-[68px]' : 'w-[272px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #2D3E54 0%, #253345 100%)',
        borderRight: '1px solid rgba(67,91,123,0.3)',
      }}
    >
      <header
        className={`relative ${
          isCollapsed ? 'px-2 py-5' : 'px-0 pt-0 pb-0'
        }`}
      >
        {!isCollapsed ? (
          <div className="flex flex-col">
            <div className="px-5 pt-5 pb-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
                style={{
                  boxShadow: '0 2px 8px rgba(107,140,174,0.35)',
                }}
              >
                <img
                  src="/logo.png"
                  alt="IBANSYS"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  style={{
                    color: '#f4f7f9',
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    lineHeight: 1.2,
                  }}
                >
                  IBANSYS
                </div>
                <div
                  style={{
                    color: '#6B8CAE',
                    fontSize: 11,
                    fontWeight: 500,
                    marginTop: 2,
                    lineHeight: 1,
                    letterSpacing: '0.3px',
                  }}
                >
                  Commerce Extérieur
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/[0.08] flex-shrink-0"
                title="Réduire le menu"
                aria-label="Réduire le menu"
                style={{ color: '#6B8CAE' }}
              >
                <PanelLeftClose className="w-[18px] h-[18px]" />
              </button>
            </div>

            <div className="px-5 pb-4 flex items-center gap-2">
              <div
                className="h-px flex-1"
                style={{ background: 'rgba(107,140,174,0.15)' }}
              />
              <span
                style={{
                  color: '#506A84',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                Powered by SMI
              </span>
              <div
                className="h-px flex-1"
                style={{ background: 'rgba(107,140,174,0.15)' }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                boxShadow: '0 2px 8px rgba(107,140,174,0.35)',
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                IB
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/[0.08]"
              title="Développer le menu"
              aria-label="Développer le menu"
              style={{ color: '#6B8CAE' }}
            >
              <PanelLeftOpen className="w-[18px] h-[18px]" />
            </button>
          </div>
        )}

        <div
          className="absolute bottom-0 left-4 right-4 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(107,140,174,0.25), transparent)',
          }}
        />
      </header>

      <nav
        className="flex-1 px-3 py-4 overflow-y-auto"
        aria-label="Navigation principale"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(107,140,174,0.3) transparent',
        }}
      >
        {!isCollapsed && (
          <div
            className="px-3 pb-2"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#506A84',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
            }}
          >
            Dossiers
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={toggleTransferSection}
            className={navButtonClass(
              isTransferActive && !isDossierTransfertOpen,
            )}
            style={navButtonStyle(
              isTransferActive && !isDossierTransfertOpen,
            )}
            title={isCollapsed ? 'Dossier Transfert' : ''}
            aria-expanded={
              isCollapsed ? undefined : isDossierTransfertOpen
            }
          >
            <Send style={{ width: 20, height: 20, flexShrink: 0 }} />

            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">
                  Dossier Transfert
                </span>

                {isTransferActive && (
                  <span
                    className="w-2 h-2 rounded-full pulse-dot flex-shrink-0 mr-1"
                    style={{ background: '#6B8CAE' }}
                  />
                )}

                <ChevronDown
                  style={{
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    transition:
                      'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                    transform: isDossierTransfertOpen
                      ? 'rotate(0deg)'
                      : 'rotate(-90deg)',
                    opacity: 0.5,
                  }}
                />
              </>
            )}
          </button>

          {!isCollapsed && isDossierTransfertOpen && (
            <ul
              className="mt-1 ml-3 pl-3 space-y-0.5 anim-fade-in-up"
              style={{
                borderLeft: '1.5px solid rgba(107,140,174,0.18)',
              }}
            >
              {TRANSFER_ITEMS.map(item => {
                const Icon = item.icon;
                const active = activeSection === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(item.id)}
                      className={subButtonClass(active)}
                      style={
                        active
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(107,140,174,0.2) 0%, rgba(67,91,123,0.35) 100%)',
                              boxShadow:
                                'inset 0 1px 0 rgba(255,255,255,0.06)',
                              borderLeft:
                                '2px solid rgba(107,140,174,0.6)',
                              paddingLeft: 10,
                            }
                          : {
                              borderLeft: '2px solid transparent',
                              paddingLeft: 10,
                            }
                      }
                    >
                      <Icon
                        style={{
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                          opacity: active ? 1 : 0.55,
                          transition: 'opacity 0.15s',
                        }}
                      />
                      <span className="truncate">{item.label}</span>

                      {active && (
                        <span
                          className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 pulse-dot"
                          style={{ background: '#6B8CAE' }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      <footer
        style={{
          borderTop: '1px solid rgba(107,140,174,0.15)',
        }}
      >
        {!isCollapsed ? (
          <div className="p-4 space-y-3">
            <div
              className="flex items-center gap-3 px-2 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                  boxShadow: '0 2px 6px rgba(107,140,174,0.25)',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {currentUser.initials}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#D6E4F0',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {currentUser.displayName}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: '#506A84',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {currentUser.roleLabel}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
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
                background:
                  'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
                boxShadow: '0 2px 6px rgba(107,140,174,0.25)',
              }}
              title={currentUser.displayName}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {currentUser.initials}
              </span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:bg-white/[0.07]"
                style={{ color: '#6B8CAE' }}
                title="Déconnexion"
                aria-label="Déconnexion"
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        )}
      </footer>
    </aside>
  );
}
