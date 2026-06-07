import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Tone = 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

const tones: Record<Tone, string> = {
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  cyan: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30',
  emerald: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  amber: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  rose: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
  slate: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

/**
 * Small pill / tag used to label statuses, teams, roles, etc.
 * Tone maps to a semantic colour palette consistent with the dashboard's
 * dark theme.
 */
export function Badge({ tone = 'slate', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
