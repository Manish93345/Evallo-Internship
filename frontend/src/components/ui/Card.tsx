import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-[#121833] border border-[#252c52] p-6 shadow-2xl',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold text-slate-100">{children}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}
