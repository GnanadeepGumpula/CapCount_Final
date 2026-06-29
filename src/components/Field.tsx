import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

interface FieldProps {
  label: string;
  htmlFor?: string;
  info?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, htmlFor, info, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        <span>{label}</span>
        {required && <span className="text-danger-500">*</span>}
        {info && <InfoTip text={info} label={`Help for ${label}`} />}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-danger-600 animate-fade-in" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
