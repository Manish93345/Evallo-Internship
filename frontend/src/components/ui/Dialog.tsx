import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Optional footer (typically action buttons). */
  footer?: ReactNode;
  /** Tailwind max-width class — defaults to `max-w-md`. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]),' +
  ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Lightweight, dependency-free modal dialog.
 *
 *   • Closes on Escape and on backdrop click.
 *   • Locks body scroll while open.
 *   • Renders only when `open` is true (cheap to mount/unmount).
 *   • Traps focus inside the panel using a Tab interceptor, and restores
 *     focus to whatever was focused before opening — the same behaviour
 *     you'd get from Radix or Headless UI, just hand-rolled.
 *
 * Accessibility:
 *   role="dialog", aria-modal="true", and the panel is `tabIndex={-1}` so
 *   we can focus it on open without picking a specific first field.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Escape close + body-scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Focus management — remember the previously focused element, move
  // focus into the dialog, then restore on unmount.
  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    // Defer to after first paint so React has populated refs.
    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const firstField = panel.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea',
      );
      (firstField ?? panel).focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
      lastFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Focus trap — keep Tab cycling inside the panel.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (focusables.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <button
        aria-label="Close dialog"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={clsx(
          'relative w-full bg-[#121833] border border-[#252c52] rounded-2xl shadow-2xl',
          'p-6 max-h-[90vh] overflow-y-auto focus:outline-none',
          sizeMap[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#1a2148] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-6">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          )}
        </div>
        <div className="mt-5">{children}</div>
        {footer && (
          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-[#252c52]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
