import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login } from '../utils/api';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email invalide';
    if (!password) newErrors.password = 'Le mot de passe est requis';
    else if (password.length < 6) newErrors.password = 'Minimum 6 caractères';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setApiError(null);

    const result = await login(email, password);

    if (result.error) {
      setApiError(result.error);
      setIsLoading(false);
      return;
    }

    // Login successful
    setIsLoading(false);
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#fff' }}>
      <div className="w-full max-w-[400px]" style={{
        border: '2px solid #435B7B',
        borderRadius: 24,
        padding: '40px 36px 32px',
        background: 'linear-gradient(160deg, #EDF4FA 0%, #F4F8FC 100%)',
        boxShadow: '0 8px 40px rgba(45,62,84,0.13), 0 1.5px 4px rgba(67,91,123,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, #6B8CAE 0%, #435B7B 50%, #2D3E54 100%)',
        }} />

        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #6B8CAE 0%, #435B7B 100%)',
              boxShadow: '0 6px 24px rgba(67,91,123,0.30)',
            }}
          >
            <span style={{ color: '#fff', fontSize: 19, fontWeight: 800, letterSpacing: 0.8 }}>IB</span>
          </div>
          <h1 style={{ color: '#2D3E54', fontSize: 22, fontWeight: 800, letterSpacing: 0.4, marginBottom: 4 }}>
            IBANSYS
          </h1>
          <p style={{ color: '#7A9DBD', fontSize: 13, fontWeight: 500 }}>
            Plateforme de Commerce Extérieur
          </p>
        </div>

        {/* Divider */}
        <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, #B8CFE4, transparent)' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* API Error */}
          {apiError && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#fef2f2',
              border: '1.5px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 500,
            }}>
              {apiError}
            </div>
          )}
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2D3E54', marginBottom: 6 }}>
              Adresse email
            </label>
            <div className="relative">
              <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: '#A8C0D9' }} />
              <input
                type="email"
                placeholder="nom@entreprise.com"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                disabled={isLoading}
                style={{
                  width: '100%', height: 46, paddingLeft: 44, paddingRight: 16,
                  borderRadius: 10, border: `1.5px solid ${errors.email ? '#dc2626' : '#C8DCED'}`,
                  fontSize: 14, color: '#2D3E54', background: '#fff', outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { if (!errors.email) { e.target.style.borderColor = '#435B7B'; e.target.style.boxShadow = '0 0 0 3px rgba(67,91,123,0.12)'; } }}
                onBlur={e => { if (!errors.email) { e.target.style.borderColor = '#C8DCED'; e.target.style.boxShadow = 'none'; } }}
              />
            </div>
            {errors.email && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5, fontWeight: 500 }}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#2D3E54' }}>Mot de passe</label>
              <button type="button" style={{ fontSize: 12, color: '#6B8CAE', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: '#A8C0D9' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                disabled={isLoading}
                style={{
                  width: '100%', height: 46, paddingLeft: 44, paddingRight: 48,
                  borderRadius: 10, border: `1.5px solid ${errors.password ? '#dc2626' : '#C8DCED'}`,
                  fontSize: 14, color: '#2D3E54', background: '#fff', outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { if (!errors.password) { e.target.style.borderColor = '#435B7B'; e.target.style.boxShadow = '0 0 0 3px rgba(67,91,123,0.12)'; } }}
                onBlur={e => { if (!errors.password) { e.target.style.borderColor = '#C8DCED'; e.target.style.boxShadow = 'none'; } }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#A8C0D9',
                  display: 'flex', padding: 4, borderRadius: 6,
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
            {errors.password && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5, fontWeight: 500 }}>{errors.password}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2"
            style={{
              height: 46, borderRadius: 10, border: 'none', marginTop: 4,
              cursor: isLoading ? 'wait' : 'pointer',
              background: isLoading ? '#A8C0D9' : 'linear-gradient(135deg, #435B7B 0%, #2D3E54 100%)',
              color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 0.3,
              boxShadow: '0 2px 10px rgba(45,62,84,0.2)',
              transition: 'box-shadow 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.boxShadow = '0 4px 18px rgba(45,62,84,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(45,62,84,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isLoading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Connexion...
              </>
            ) : (
              <>
                Se connecter
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>
        </form>

        {/* Contact */}
        <div className="mt-6 text-center">
          <p style={{ fontSize: 13, color: '#7A9DBD' }}>
            Besoin d'un accès ?{' '}
            <button
              type="button"
              style={{ color: '#435B7B', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => alert('Fonctionnalité à venir')}
            >
              Contactez l'administrateur
            </button>
          </p>
        </div>

        {/* Powered by */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="h-px flex-1 max-w-[40px]" style={{ background: '#C8DCED' }} />
          <span style={{ color: '#7A9DBD', fontSize: 11, fontWeight: 500, letterSpacing: 0.3 }}>
            Powered by <span style={{ color: '#435B7B', fontWeight: 700 }}>Société le Monde Informatique</span>
          </span>
          <div className="h-px flex-1 max-w-[40px]" style={{ background: '#C8DCED' }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}