import { useEffect, useState } from 'react';
import { Users, UsersRound, ScrollText, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';

interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'connected' | 'disconnected';
  uptimeSeconds: number;
  version: string;
}

export function DashboardPage() {
  const { user, organisation } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.get<HealthResponse>('/health').then((r) => setHealth(r.data)).catch(() => null);
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-slate-400">Welcome back,</p>
        <h1 className="text-3xl font-bold text-slate-100">
          {user?.name}
          <span className="text-slate-400 font-normal"> · </span>
          <span className="bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
            {organisation?.name}
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Phase 1 complete. Auth, audit logs, and multi-tenant data layer are live.
        </p>
      </header>

      {/* Live system status */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Authenticated session
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label="User" value={`${user?.email} (${user?.role})`} />
          <Row label="Organisation" value={`${organisation?.name} · ${organisation?.slug}`} />
          <Row
            label="Backend"
            value={health ? `${health.status} · v${health.version}` : '…'}
            tone={health?.status === 'ok' ? 'good' : 'neutral'}
          />
          <Row
            label="Database"
            value={health?.db ?? '…'}
            tone={health?.db === 'connected' ? 'good' : 'neutral'}
          />
        </dl>
      </Card>

      {/* Upcoming phases — placeholder cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlaceholderCard
          icon={<Users className="h-5 w-5 text-cyan-300" />}
          title="Employees"
          desc="Phase 2 will add CRUD for employees, scoped to your organisation."
        />
        <PlaceholderCard
          icon={<UsersRound className="h-5 w-5 text-cyan-300" />}
          title="Teams"
          desc="Many-to-many team assignments arrive in Phase 2."
        />
        <PlaceholderCard
          icon={<ScrollText className="h-5 w-5 text-cyan-300" />}
          title="Audit Log"
          desc="Already being written. A read-only viewer ships in Phase 3."
        />
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'neutral';
}) {
  const dot = tone === 'good' ? 'bg-emerald-400' : 'bg-slate-500';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#252c52]/60 last:border-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-100 font-mono text-xs flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {value}
      </dd>
    </div>
  );
}

function PlaceholderCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card className="!p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-cyan-400/10 border border-cyan-400/20 p-2">{icon}</div>
        <div className="flex-1">
          <h3 className="text-slate-100 font-semibold flex items-center gap-2">
            {title}
            <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
              soon
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1.5">{desc}</p>
          <div className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            Phase 2/3 <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Card>
  );
}
