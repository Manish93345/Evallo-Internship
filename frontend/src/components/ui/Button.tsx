import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1020]';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 hover:bg-brand-600 text-white focus-visible:ring-brand-500 shadow-lg shadow-brand-500/20',
  secondary:
    'bg-[#1a2148] hover:bg-[#252c52] text-slate-100 border border-[#252c52] focus-visible:ring-brand-500',
  ghost:
    'bg-transparent hover:bg-[#1a2148] text-slate-300 focus-visible:ring-brand-500',
  danger:
    'bg-red-500/90 hover:bg-red-500 text-white focus-visible:ring-red-500',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
