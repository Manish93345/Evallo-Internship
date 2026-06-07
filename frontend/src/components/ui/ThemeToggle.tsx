import { Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../../context/ThemeContext';

/**
 * Sun / Moon icon button in the topbar. Tiny by design — a real product
 * might offer "system" as a third option but for the assignment two states
 * is plenty.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={clsx(
        'p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-[#1a2148] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
