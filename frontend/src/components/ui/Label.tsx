import type { LabelHTMLAttributes, ReactNode } from 'react';

export function Label({
  htmlFor,
  children,
  required,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-300 mb-1.5" {...rest}>
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}
