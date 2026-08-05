import React, { useId } from 'react';
import { Banknote, TrendingUp } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

import { STATUS_CFG } from './transfer.mock';

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CFG[status] ?? {
    label: status,
    bg: '#F3F4F6',
    text: '#374151',
    dot: '#9CA3AF',
  };

  return (
    <Badge
      variant="outline"
      className="gap-1.5 whitespace-nowrap font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: `${config.dot}55`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.dot }}
      />
      {config.label}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: string }) {
  if (type === 'commercial') {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-blue-50 text-blue-700 border-blue-200"
      >
        <TrendingUp className="h-3 w-3" />
        Commercial
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 bg-violet-50 text-violet-700 border-violet-200"
    >
      <Banknote className="h-3 w-3" />
      Financier
    </Badge>
  );
}

export function FR({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className={`text-sm font-medium text-foreground ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value ?? '—'}
      </div>
    </div>
  );
}

interface FIProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  select?: boolean;
  multiline?: boolean;
  rows?: number;
  opts?: Array<{ value: string; label: string }>;
  error?: string;
  description?: string;
}

const EMPTY_SELECT_VALUE = '__ibansys_empty__';

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
  error,
  description,
}: FIProps) {
  const generatedId = useId();
  const fieldId = `transfer-field-${generatedId.replace(/:/g, '')}`;
  const normalizedOptions = opts ?? [];
  const emptyOption = normalizedOptions.find(option => option.value === '');

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {select ? (
        <Select
          value={value === '' ? (emptyOption ? EMPTY_SELECT_VALUE : undefined) : value}
          onValueChange={nextValue =>
            onChange?.(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)
          }
          disabled={disabled}
        >
          <SelectTrigger
            id={fieldId}
            className={error ? 'border-destructive' : undefined}
          >
            <SelectValue
              placeholder={placeholder || emptyOption?.label || 'Sélectionner'}
            />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map(option => (
              <SelectItem
                key={option.value || EMPTY_SELECT_VALUE}
                value={option.value || EMPTY_SELECT_VALUE}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : multiline ? (
        <Textarea
          id={fieldId}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={disabled}
          disabled={disabled}
          rows={rows}
          className={error ? 'border-destructive' : undefined}
        />
      ) : (
        <Input
          id={fieldId}
          type={type}
          value={value}
          onChange={event => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={disabled}
          disabled={disabled}
          className={error ? 'border-destructive' : undefined}
        />
      )}

      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function KPI({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `${color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}
