import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import { login } from '../utils/api';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors]             = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading]       = useState(false);
  const [apiError, setApiError]         = useState<string | null>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!email)                   e.email    = "L'identifiant est requis";
    if (!password)                e.password = 'Le mot de passe est requis';
    else if (password.length < 6) e.password = 'Minimum 6 caractères';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setApiError(null);
    const result = await login(email, password);
    if (result.error) { setApiError(result.error); setIsLoading(false); return; }
    setIsLoading(false);
    onLogin(email, password);
  };

  const inputStyle = (hasError: boolean, hasFocus: boolean): React.CSSProperties => ({
    width: '100%', height: 48, paddingLeft: 44, paddingRight: 16, boxSizing: 'border-box',
    borderRadius: 12,
    border: `1.5px solid ${hasError ? '#E55353' : hasFocus ? '#435B7B' : '#D8E8F2'}`,
    background: hasFocus ? '#fff' : '#F6FAFE',
    boxShadow: hasFocus ? '0 0 0 3px rgba(67,91,123,0.10)' : hasError ? '0 0 0 3px rgba(229,83,83,0.08)' : 'none',
    fontSize: 14, color: '#1E2E42', outline: 'none',
    transition: 'all .18s', fontFamily: 'inherit',
  });

  return (
    <>
      <style>{`
        @keyframes spin  { to { transform:rotate(360deg); } }
        @keyframes up    { from{opacity:0;transform:translateY(-4px);} to{opacity:1;transform:none;} }
        ::placeholder    { color: #B8CDD E; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'linear-gradient(160deg, #C8DCF0 0%, #D8EAF8 40%, #EAF3FC 70%, #D4E8F5 100%)',
      }}>

        <div style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: 24,
          padding: '48px 40px 36px',
          boxShadow: '0 2px 8px rgba(14,28,50,.06), 0 12px 40px rgba(14,28,50,.10), 0 32px 80px rgba(14,28,50,.08)',
          border: '1px solid rgba(200,220,240,.80)',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg, #7AAAC8, #435B7B, #2D3E54)',
            borderRadius: '24px 24px 0 0',
          }} />

          {/* brand */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 18, margin: '0 auto 16px',
              background: 'linear-gradient(145deg, #EBF4FC, #DAE9F5)',
              border: '1.5px solid rgba(107,140,174,.20)',
              boxShadow: '0 4px 20px rgba(67,91,123,.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <img src="/logo.png" alt="IBANSYS" style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
            </div>

            <div style={{ fontSize: 24, fontWeight: 900, color: '#1A2B3C', letterSpacing: 1.5, marginBottom: 6 }}>
              IBANSYS
            </div>
            <div style={{ fontSize: 12.5, color: '#7A9DBD', fontWeight: 600, letterSpacing: .5 }}>
              Plateforme de Commerce Extérieur
            </div>
          </div>

          {/* divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,#CCDDEE 30%,#CCDDEE 70%,transparent)', marginBottom: 28 }} />

          {/* form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {apiError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#DC2626', fontSize: 13, fontWeight: 500, animation: 'up .2s ease both' }}>
                {apiError}
              </div>
            )}

            {/* identifiant */}
            <FieldWrapper label="Identifiant" error={errors.email}>
              {(focused, handlers) => (
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? '#435B7B' : errors.email ? '#E55353' : '#B8CDE0', pointerEvents: 'none', transition: 'color .18s' }} />
                  <input
                    style={inputStyle(!!errors.email, focused)}
                    type="text" placeholder="nom@entreprise.com"
                    value={email} disabled={isLoading}
                    onChange={e => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                    {...handlers}
                  />
                </div>
              )}
            </FieldWrapper>

            {/* mot de passe */}
            <FieldWrapper
              label="Mot de passe"
              error={errors.password}
              right={
                <button type="button" style={{ fontSize: 12, color: '#6B8CAE', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#2D3E54')} onMouseLeave={e => (e.currentTarget.style.color = '#6B8CAE')}>
                  Oublié ?
                </button>
              }
            >
              {(focused, handlers) => (
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? '#435B7B' : errors.password ? '#E55353' : '#B8CDE0', pointerEvents: 'none', transition: 'color .18s' }} />
                  <input
                    style={{ ...inputStyle(!!errors.password, focused), paddingRight: 48 }}
                    type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={password} disabled={isLoading}
                    onChange={e => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                    {...handlers}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B8CDE0', display: 'flex', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#435B7B')} onMouseLeave={e => (e.currentTarget.style.color = '#B8CDE0')}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              )}
            </FieldWrapper>

            {/* submit */}
            <button
              type="submit" disabled={isLoading}
              style={{
                height: 48, marginTop: 4, borderRadius: 12, border: 'none',
                background: isLoading ? '#A8C0D9' : 'linear-gradient(135deg, #435B7B, #2D3E54)',
                color: '#fff', fontSize: 14.5, fontWeight: 700, letterSpacing: .3,
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: isLoading ? 'none' : '0 4px 16px rgba(45,62,84,.28)',
                transition: 'all .18s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,62,84,.36)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,62,84,.28)'; }}
            >
              {isLoading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  Connexion en cours…
                </>
              ) : (
                <> Se connecter <ArrowRight size={16} /> </>
              )}
            </button>
          </form>

          {/* contact */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#8AAFC8', marginTop: 22 }}>
            Besoin d'un accès ?{' '}
            <button type="button"
              style={{ color: '#435B7B', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1E2E42')} onMouseLeave={e => (e.currentTarget.style.color = '#435B7B')}
              onClick={() => alert('Contactez votre administrateur système.')}>
              Contactez l'administrateur
            </button>
          </p>

          {/* powered by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,#D4E4F0)' }} />
            <span style={{ fontSize: 11, color: '#A8C4D8', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Powered by <strong style={{ color: '#7A9DBD', fontWeight: 700 }}>Société le Monde Informatique</strong>
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,#D4E4F0,transparent)' }} />
          </div>
        </div>
      </div>
    </>
  );
}

/* small helper to avoid repeating focus-state boilerplate */
function FieldWrapper({
  label, right, children, error,
}: {
  label: string;
  right?: React.ReactNode;
  children: (focused: boolean, handlers: { onFocus: () => void; onBlur: () => void }) => React.ReactNode;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#2D3E54' }}>{label}</label>
        {right}
      </div>
      {children(focused, { onFocus: () => setFocused(true), onBlur: () => setFocused(false) })}
      {error && (
        <p style={{ fontSize: 12, color: '#E55353', marginTop: 5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, animation: 'up .2s ease both' }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#E55353', display: 'inline-block', flexShrink: 0 }} />
          {error}
        </p>
      )}
    </div>
  );
}
