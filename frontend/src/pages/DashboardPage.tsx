import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UsersRound,
  ScrollText,
  ShieldCheck,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Table';
import { api } from '../lib/api';
import { employeesApi } from '../lib/employeesApi';
import { teamsApi } from '../lib/teamsApi';
import { auditLogsApi } from '../lib/auditLogsApi';
import type { AuditLog } from '../lib/types';

interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'connected' | 'disconnected';
  uptimeSeconds: number;
  version: string;
}

/**
 * Dashboard — landing screen after login.
 *
 * Three stat cards pull live counts from the paginated list endpoints (we
 * read `pagination.total` rather than fetching all rows). The "Recent
 * activity" panel hits /audit-logs (OWNER-only) and gracefully degrades
 * for non-owners.
 */
export function DashboardPage() {
  const { user, organisation } = useAuth();

  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<HealthResponse>('/health').then((r) => r.data),
    staleTime: 60_000,
  });

  const employees = useQuery({
    queryKey: ['employees', 'list', { page: 1, limit: 1 }],
    queryFn: () => employeesApi.list({ page: 1, limit: 1 }),
  });

  const teams = useQuery({
    queryKey: ['teams', 'list', { page: 1, limit: 1 }],
    queryFn: () => teamsApi.list({ page: 1, limit: 1 }),
  });

  const audit = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => auditLogsApi.list({ page: 1, limit: 6 }),
    enabled: user?.role === 'OWNER',
    retry: false,
  });

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
          Multi-tenant HRMS — auth, audit logs, and full CRUD are live.
        </p>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          to="/employees"
          icon={<Users className="h-5 w-5 text-cyan-300" />}
          label="Employees"
          value={employees.data?.pagination.total}
          loading={employees.isLoading}
          tint="cyan"
        />
        <StatCard
          to="/teams"
          icon={<UsersRound className="h-5 w-5 text-brand-300" />}
          label="Teams"
          value={teams.data?.pagination.total}
          loading={teams.isLoading}
          tint="brand"
        />
        <StatCard
          to="#"
          icon={<Activity className="h-5 w-5 text-emerald-300" />}
          label="Recent activity"
          value={audit.data?.pagination.total}
          loading={audit.isLoading}
          tint="emerald"
          disabled={user?.role !== 'OWNER'}
          disabledLabel="Owner-only"
        />
      </section>

      {/* Two-column: session + recent activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Session card */}
        <Card className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Authenticated session
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="User" value={`${user?.email}`} />
            <Row label="Role" value={user?.role ?? '—'} />
            <Row label="Org" value={`${organisation?.name} · ${organisation?.slug}`} />
            <Row
              label="Backend"
              value={health.data ? `${health.data.status} · v${health.data.version}` : '…'}
              tone={health.data?.status === 'ok' ? 'good' : 'neutral'}
            />
            <Row
              label="Database"
              value={health.data?.db ?? '…'}
              tone={health.data?.db === 'connected' ? 'good' : 'neutral'}
            />
          </dl>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-cyan-300" /> Recent activity
            </h2>
            {user?.role === 'OWNER' && (
              <span className="text-xs text-slate-500">Audit logs · last 6</span>
            )}
          </div>

          {user?.role !== 'OWNER' ? (
            <p className="text-sm text-slate-500">
              Audit logs are visible to organisation owners only.
            </p>
          ) : audit.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : audit.isError ? (
            <p className="text-sm text-rose-300">Couldn't load activity.</p>
          ) : (audit.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-[#252c52]">
              {audit.data!.data.map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

// ---------- internals ----------

function StatCard({
  to,
  icon,
  label,
  value,
  loading,
  tint,
  disabled,
  disabledLabel,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  tint: 'cyan' | 'brand' | 'emerald';
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const ring = {
    cyan: 'border-cyan-400/20 bg-cyan-400/5',
    brand: 'border-brand-500/20 bg-brand-500/5',
    emerald: 'border-emerald-400/20 bg-emerald-400/5',
  }[tint];

  const inner = (
    <Card
      className={`!p-5 transition-colors ${
        disabled ? 'opacity-60' : 'hover:border-brand-500/40 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-lg border p-2 ${ring}`}>{icon}</div>
        {!disabled && <ArrowRight className="h-4 w-4 text-slate-500" />}
      </div>
      <p className="text-xs uppercase tracking-wider text-slate-400 mt-4">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <span className="text-3xl font-bold text-slate-100">
            {disabled ? '—' : (value ?? 0).toLocaleString()}
          </span>
        )}
        {disabled && disabledLabel && (
          <Badge tone="slate" className="ml-1">
            {disabledLabel}
          </Badge>
        )}
      </div>
    </Card>
  );

  return disabled ? inner : <Link to={to}>{inner}</Link>;
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

function ActivityRow({ log }: { log: AuditLog }) {
  return (
    <li className="py-2.5 flex items-start gap-3">
      <ActionBadge action={log.action} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200">
          <span className="font-medium">{log.user?.name ?? 'System'}</span>{' '}
          <span className="text-slate-400">{describe(log.action)}</span>{' '}
          {log.entityType && (
            <span className="text-slate-500 text-xs">· {log.entityType.toLowerCase()}</span>
          )}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{formatRelative(log.createdAt)}</p>
      </div>
    </li>
  );
}

function ActionBadge({ action }: { action: string }) {
  const tone: Parameters<typeof Badge>[0]['tone'] = action.includes('DELETE')
    ? 'rose'
    : action.includes('CREATE') || action.includes('REGISTER')
      ? 'emerald'
      : action.includes('UPDATE') || action.includes('ASSIGN')
        ? 'amber'
        : action.includes('LOGIN') || action.includes('LOGOUT')
          ? 'cyan'
          : 'slate';
  return <Badge tone={tone}>{action}</Badge>;
}

function describe(action: string): string {
  const map: Record<string, string> = {
    LOGIN: 'signed in',
    LOGOUT: 'signed out',
    REGISTER: 'created the organisation',
    CREATE_EMPLOYEE: 'added an employee',
    UPDATE_EMPLOYEE: 'updated an employee',
    DELETE_EMPLOYEE: 'deleted an employee',
    CREATE_TEAM: 'created a team',
    UPDATE_TEAM: 'updated a team',
    DELETE_TEAM: 'deleted a team',
    ASSIGN_TEAM_MEMBERS: 'assigned members to a team',
    REMOVE_TEAM_MEMBER: 'removed a team member',
  };
  return map[action] ?? action.toLowerCase().replace(/_/g, ' ');
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
