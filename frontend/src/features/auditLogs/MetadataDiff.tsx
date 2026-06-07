import { useMemo } from 'react';

interface MetadataDiffProps {
  metadata: Record<string, unknown> | null;
}

/**
 * Renders the `metadata` JSON column of an audit log row in a readable
 * shape. Three layouts:
 *
 *   • If the entry has both `before` and `after` (the common shape for
 *     UPDATE actions) we render a two-column diff with changed fields
 *     highlighted in amber.
 *   • If only `after` exists (CREATE/ASSIGN actions) we render a clean
 *     key/value table of the new state.
 *   • Otherwise we fall back to syntax-highlighted JSON.
 *
 * Deliberately framework-free — no `react-diff-viewer` dependency. The
 * change set in a CRUD app is tiny enough that hand-rolling is clearer
 * and cheaper than pulling in a 30 KB diff lib.
 */
export function MetadataDiff({ metadata }: MetadataDiffProps) {
  const view = useMemo(() => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return { kind: 'empty' as const };
    }
    const before = (metadata as Record<string, unknown>).before;
    const after = (metadata as Record<string, unknown>).after;
    if (isObject(before) && isObject(after)) {
      return { kind: 'diff' as const, before, after };
    }
    if (isObject(after)) {
      return { kind: 'snapshot' as const, snapshot: after };
    }
    return { kind: 'json' as const, json: metadata };
  }, [metadata]);

  if (view.kind === 'empty') {
    return <p className="text-xs text-slate-500 italic">No metadata recorded.</p>;
  }

  if (view.kind === 'diff') {
    const keys = unionKeys(view.before, view.after);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-3 py-2 w-32">Field</th>
              <th className="text-left font-semibold px-3 py-2">Before</th>
              <th className="text-left font-semibold px-3 py-2">After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252c52]">
            {keys.map((k) => {
              const b = view.before[k];
              const a = view.after[k];
              const changed = !valueEq(b, a);
              return (
                <tr key={k} className={changed ? 'bg-amber-400/[0.04]' : ''}>
                  <td className="px-3 py-2 font-mono text-slate-300">{k}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono break-all">
                    {render(b)}
                  </td>
                  <td
                    className={
                      'px-3 py-2 font-mono break-all ' +
                      (changed ? 'text-amber-200' : 'text-slate-400')
                    }
                  >
                    {render(a)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (view.kind === 'snapshot') {
    const entries = Object.entries(view.snapshot);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold px-3 py-2 w-32">Field</th>
              <th className="text-left font-semibold px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252c52]">
            {entries.map(([k, v]) => (
              <tr key={k}>
                <td className="px-3 py-2 font-mono text-slate-300">{k}</td>
                <td className="px-3 py-2 text-slate-200 font-mono break-all">{render(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback: raw JSON.
  return (
    <pre className="text-[11px] text-slate-300 bg-[#0a0f24] border border-[#252c52] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
      {JSON.stringify(view.json, null, 2)}
    </pre>
  );
}

// ---------- helpers ----------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function unionKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  return Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
}

function valueEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => valueEq(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function render(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
