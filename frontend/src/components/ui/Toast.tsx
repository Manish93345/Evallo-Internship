import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * Tiny in-house toast system — no extra dependency, just enough surface area
 * for "success / error / info" notifications used by mutations.
 *
 *   const { toast } = useToast();
 *   toast.success('Employee created');
 *   toast.error('Email already exists');
 *
 * The provider lives in main.tsx and renders a fixed-position stack in the
 * bottom-right corner.
 */

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<{ toast: ToastApi } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, tone, message }]);
    // auto-dismiss after 4s
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  // Slide-in animation: opacity + translate
  const [shown, setShown] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShown(true));
  }, []);

  const cfg = {
    success: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      ring: 'border-emerald-400/40',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-200',
    },
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      ring: 'border-rose-400/40',
      bg: 'bg-rose-500/10',
      text: 'text-rose-200',
    },
    info: {
      icon: <Info className="h-4 w-4" />,
      ring: 'border-cyan-400/40',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-200',
    },
  }[item.tone];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-xl border backdrop-blur-md p-3 pr-2 shadow-2xl',
        'bg-[#121833]/90 transition-all duration-200',
        cfg.ring,
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
      role="status"
    >
      <div className={clsx('rounded-md p-1.5 flex-shrink-0', cfg.bg, cfg.text)}>
        {cfg.icon}
      </div>
      <div className="flex-1 text-sm text-slate-100 leading-relaxed pt-0.5">
        {item.message}
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-500 hover:text-slate-100 p-1 rounded-md"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
