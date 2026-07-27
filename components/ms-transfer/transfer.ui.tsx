import React from 'react';
import { Banknote, TrendingUp } from 'lucide-react';
import { STATUS_CFG } from './transfer.mock';

export const HDR: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6B8CAE, #435B7B)',
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CFG[status] ?? {
    label: status,
    bg: '#F3F4F6',
    text: '#374151',
    dot: '#9CA3AF',
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.dot }} />
      {config.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return type === 'commercial' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
      <TrendingUp size={10} />Commercial
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
      <Banknote size={10} />Financier
    </span>
  );
}

export function SecTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold text-[#435B7B] uppercase tracking-wide mb-3 pb-2 border-b border-[#EEF3F7]">{children}</h3>;
}

export function FR({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#7A90A4] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-[#2D3E54] ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
    </div>
  );
}

interface FIProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  select?: boolean;
  multiline?: boolean;
  rows?: number;
  opts?: Array<{ value: string; label: string }>;
}

export function FI({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required,
  disabled,
  select,
  multiline,
  rows = 3,
  opts,
}: FIProps) {
  const base = 'w-full px-3 py-2 text-sm rounded-lg border border-[#d1dce6] focus:outline-none focus:ring-2 focus:ring-[#435B7B]/30 focus:border-[#435B7B] text-[#2D3E54] transition-all';
  const readOnlyClass = disabled
    ? 'bg-[#F4F8FC] text-[#6B7A8D] cursor-not-allowed'
    : 'bg-white';

  return (
    <div>
      <label className="block text-xs font-medium text-[#435B7B] mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {select ? (
        <select
          className={`${base} ${readOnlyClass}`}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          disabled={disabled}
        >
          {opts?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : multiline ? (
        <textarea
          className={`${base} ${readOnlyClass} resize-y`}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={disabled}
          rows={rows}
        />
      ) : (
        <input
          type={type}
          className={`${base} ${readOnlyClass}`}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={disabled}
        />
      )}
    </div>
  );
}

export function KPI({ label, value, color, icon: Icon }: { label: string; value: React.ReactNode; color: string; icon: React.ElementType }) {
  return (
    <div className="bg-white border border-[#d1dce6] rounded-2xl p-5 shadow-sm card-lift" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#7A90A4] font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}
