import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useTeamsList } from '../../hooks/useTeams';
import { Badge } from '../../components/ui/Badge';

interface TeamMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Custom multi-select for assigning teams when creating an employee.
 *
 * Why not a native <select multiple>? The native control is fiddly on
 * mobile, hard to style, and doesn't show selected items as removable
 * chips. We render a popover with a searchable checklist instead.
 *
 * We fetch up to 100 teams in one go — for this assignment that's
 * generous; if a real org grows beyond that we'd switch to an async
 * autocomplete (debounced server-side `q=`).
 */
export function TeamMultiSelect({ value, onChange }: TeamMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useTeamsList({ page: 1, limit: 100 });
  const teams = data?.data ?? [];
  const selected = teams.filter((t) => value.includes(t.id));

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'w-full min-h-[40px] px-3 py-1.5 text-sm rounded-lg bg-[#0a0f24]',
          'border border-[#252c52] hover:border-brand-500/40 focus:border-brand-500/60',
          'flex items-center gap-2 flex-wrap text-left transition-colors',
        )}
      >
        {selected.length === 0 ? (
          <span className="text-slate-500">No teams assigned</span>
        ) : (
          selected.map((t) => (
            <Badge key={t.id} tone="brand">
              {t.name}
            </Badge>
          ))
        )}
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 ml-auto" />
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close team selector"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-1.5 w-full max-h-60 overflow-y-auto rounded-lg border border-[#252c52] bg-[#121833] shadow-2xl">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading teams…
              </div>
            ) : teams.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-400">
                No teams exist yet. Create one from the Teams page.
              </p>
            ) : (
              <ul className="py-1">
                {teams.map((t) => {
                  const isSel = value.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggle(t.id)}
                        className={clsx(
                          'w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-left',
                          'hover:bg-[#1a2148] transition-colors',
                          isSel && 'text-brand-200',
                        )}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {t.memberCount} {t.memberCount === 1 ? 'member' : 'members'}
                          {isSel && <Check className="h-3.5 w-3.5 text-brand-300" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
