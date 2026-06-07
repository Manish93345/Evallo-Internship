import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import clsx from 'clsx';

/**
 * Thin, styled wrappers around the native table elements. We keep them
 * dumb on purpose — pages compose them directly so we don't lose the
 * flexibility of plain HTML semantics.
 */

export function Table({ className, children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#252c52] bg-[#0e1330]">
      <table className={clsx('w-full text-sm border-collapse', className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className="bg-[#161c40] text-xs uppercase tracking-wider text-slate-400"
      {...rest}
    >
      {children}
    </thead>
  );
}

export function TBody({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className="divide-y divide-[#252c52]" {...rest}>
      {children}
    </tbody>
  );
}

export function TR({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={clsx('hover:bg-[#161c40]/60 transition-colors', className)} {...rest}>
      {children}
    </tr>
  );
}

export function TH({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx('text-left font-semibold px-4 py-3', className)}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TD({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={clsx('px-4 py-3 text-slate-200', className)} {...rest}>
      {children}
    </td>
  );
}

/**
 * Stand-alone empty-state block used inside (or beside) tables when there
 * are no rows. Accepts an icon + title + helper text + optional CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6">
      {icon && (
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#1a2148] border border-[#252c52] flex items-center justify-center text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Animated grey bar — drop into list/table layouts while data loads to
 * avoid layout shift. Width/height controlled by Tailwind classes.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-gradient-to-r from-[#1a2148] via-[#252c52] to-[#1a2148] bg-[length:200%_100%]',
        className,
      )}
    />
  );
}
