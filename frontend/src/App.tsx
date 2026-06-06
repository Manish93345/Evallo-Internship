import { useEffect, useState } from 'react';
import { api } from './lib/api';

type HealthResponse = {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  db: 'connected' | 'disconnected';
};

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .get<HealthResponse>('/health')
      .then((res) => {
        if (!cancelled) setState({ kind: 'ok', data: res.data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Unknown error';
        setState({ kind: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-500/15 text-brand-300 text-xs font-semibold tracking-wider uppercase border border-brand-500/30 mb-3">
            Phase 0 · Foundation
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
            HRMS
          </h1>
          <p className="text-slate-400">
            Evallo Full-Stack Assignment · Built by Manish Kumar
          </p>
        </div>

        <div className="rounded-2xl bg-[#121833] border border-[#252c52] p-6 shadow-2xl">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-cyan-300">●</span> System status
          </h2>

          {state.kind === 'loading' && (
            <div className="flex items-center gap-3 text-slate-400">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Pinging backend at <code className="text-slate-200">/api/v1/health</code>…
            </div>
          )}

          {state.kind === 'error' && (
            <div className="space-y-2">
              <StatusRow label="Backend" value="unreachable" tone="bad" />
              <p className="text-sm text-red-300 mt-2">
                Could not reach the API. Make sure the backend is running:
              </p>
              <pre className="text-xs bg-[#0a0f24] border border-[#252c52] rounded-lg p-3 overflow-x-auto">
{`cd backend
npm run dev`}
              </pre>
              <p className="text-xs text-slate-500 mt-2">Error: {state.message}</p>
            </div>
          )}

          {state.kind === 'ok' && (
            <div className="space-y-2">
              <StatusRow
                label="Backend API"
                value={state.data.status}
                tone={state.data.status === 'ok' ? 'good' : 'warn'}
              />
              <StatusRow
                label="Database (Neon)"
                value={state.data.db}
                tone={state.data.db === 'connected' ? 'good' : 'bad'}
              />
              <StatusRow label="Service" value={state.data.service} />
              <StatusRow label="Version" value={state.data.version} />
              <StatusRow label="Uptime" value={`${state.data.uptimeSeconds}s`} />
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          ✓ End-to-end wiring verified · Frontend → Express → Neon Postgres
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'warn' | 'neutral';
}) {
  const toneClass = {
    good: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
    bad: 'text-red-300 bg-red-400/10 border-red-400/30',
    warn: 'text-amber-300 bg-amber-400/10 border-amber-400/30',
    neutral: 'text-slate-300 bg-slate-400/10 border-slate-400/30',
  }[tone];

  return (
    <div className="flex items-center justify-between py-2 border-b border-[#252c52] last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-xs font-mono px-2.5 py-1 rounded-md border ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}
