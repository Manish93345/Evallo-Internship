import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded-lg bg-[#0a0f24] border text-slate-100 placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
          error ? 'border-red-500/60' : 'border-[#252c52] focus:border-brand-500/60',
          className,
        )}
        aria-invalid={error ? 'true' : 'false'}
        {...rest}
      />
    );
  },
);
Input.displayName = 'Input';
