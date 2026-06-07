import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Filter,
  Lock,
  RefreshCw,
  ScrollText,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Table, THead, TBody, TR, TH, TD, EmptyState, Skeleton } from '../components/ui/Table';
import {
  ClipboardIllustration,
  SearchIllustration,
} from '../components/ui/EmptyIllustration';
import { useAuditLogsList } from '../hooks/useAuditLogs';
import { MetadataDiff } from '../features/auditLogs/MetadataDiff';
import type { AuditLog } from '../lib/types';

/**
 * /audit-logs — full filterable audit trail.
 *
 * Owner-only on the backend, so non-owners get a friendly gate rather than
 * a 403 toast. The filter panel pushes selected values into the query
 * params, which the React Query key picks up and refetches automatically.
 *
 *   • Action dropdown   → server-side `action=…` filter
 *   • Entity dropdown   → server-side `entityType=…` filter
 *   • Date range        → server-side `from=…&to=…` (ISO 8601 with offset)
 *   • Free text search  → client-side (the backend doesn't index any
 *                          free-text column for audit logs, so server
 *                          filtering would mean a full-table scan).
 *   • Expandable row    → click any row to toggle the metadata diff.
 *
 * Pagination matches the Employees / Teams pages — `placeholderData: prev`
 * keeps the previous page on screen during navigation.
 */

const ACTIONS: { value: string; label: string }[] = [
  { value: 'LOGIN_SUCCESS', label: 'Login success' },
  { value: 'LOGIN_FAILED', label: 'Login failed' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'REGISTER', label: 'Register' },
  { value: 'REFRESH_TOKEN', label: 'Refresh token' },
  { value: 'CREATE_EMPLOYEE', label: 'Create employee' },
  { value: 'UPDATE_EMPLOYEE', label: 'Update employee' },
  { value: 'DELETE_EMPLOYEE', label: 'Delete employee' },
  { value: 'CREATE_TEAM', label: 'Create team' },
  { value: 'UPDATE_TEAM', label: 'Update team' },
  { value: 'DELETE_TEAM', label: 'Delete team' },
  { value: 'ASSIGN_TEAM_MEMBERS', label: 'Assign team members' },
  { value: 'REMOVE_TEAM_MEMBER', label: 'Remove team member' },
];

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'USER', label: 'User' },
  { value: 'SESSION', label: 'Session' },
  { value: 'ORGANISATION', label: 'Organisation' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'TEAM', label: 'Team' },
];

export function AuditLogsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const limit = 15;

  // Convert the local datetime-input values to ISO with offset so Zod
  // accepts them. `datetime-local` produces "YYYY-MM-DDTHH:mm".
  const params = useMemo(
    () => ({
      page,
      limit,
      action: action || undefined,
      entityType: entityType || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }),
    [page, action, entityType, from, to],
  );

  const { data, isLoading, isFetching, isError, refetch } = useAuditLogsList(params, isOwner);

  // Free-text search is purely client-side (over the user's name/email,
  // entity id, and action). The point is fast in-page filtering of the
  // page that's already on screen; for cross-page search we'd need a
  // backend index.
  const visibleRows = useMemo(() => {
    const rows = data?.data ?? [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const hay = [
        r.action,
        r.entityType,
        r.entityId,
        r.user?.name,
        r.user?.email,
        r.ipAddress,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data?.data, search]);

  function clearFilters() {
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
    setSearch('');
    setPage(1);
  }

  const hasActiveFilter = !!(action || entityType || from || to || search);
  const totalPages = data?.pagination.totalPages ?? 1;

  // ----- Non-owner gate -----
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-100">Audit logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            A timeline of everything that has happened in your organisation.
          </p>
        </header>
        <Card>
          <div className="flex flex-col items-center text-center py-8 px-4">
            <div className="h-12 w-12 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-100">Owner-only area</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Audit logs are visible to organisation owners. Ask the owner of{' '}
              <span className="text-slate-200">your organisation</span> to share access
              if you need this data.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Audit logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Every authentication event and every mutation, captured with a full
            before/after diff. Click any row to expand.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={'h-3.5 w-3.5 ' + (isFetching ? 'animate-spin' : '')} />
          Refresh
        </Button>
      </header>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-300">Filters</h2>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs text-slate-400 hover:text-slate-100 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label htmlFor="filter-action">Action</Label>
            <Select
              id="filter-action"
              value={action}
              onChange={(v) => {
                setAction(v);
                setPage(1);
              }}
              options={[{ value: '', label: 'All actions' }, ...ACTIONS]}
            />
          </div>
          <div>
            <Label htmlFor="filter-entity">Entity type</Label>
            <Select
              id="filter-entity"
              value={entityType}
              onChange={(v) => {
                setEntityType(v);
                setPage(1);
              }}
              options={[{ value: '', label: 'All entities' }, ...ENTITY_TYPES]}
            />
          </div>
          <div>
            <Label htmlFor="filter-from">From</Label>
            <Input
              id="filter-from"
              type="datetime-local"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label htmlFor="filter-to">To</Label>
            <Input
              id="filter-to"
              type="datetime-local"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label htmlFor="filter-search">Search (in page)</Label>
            <Input
              id="filter-search"
              placeholder="name, email, ip…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Status line */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          {isFetching && !isLoading
            ? 'Refreshing…'
            : data
              ? `Showing ${visibleRows.length} of ${data.pagination.total.toLocaleString()} events`
              : '\u00A0'}
        </div>
        {data && (
          <div>
            Page {data.pagination.page} of {totalPages}
          </div>
        )}
      </div>

      {/* Table */}
      {isError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-6 text-sm text-rose-200">
          Couldn't load audit logs.{' '}
          <button onClick={() => refetch()} className="underline hover:text-rose-100">
            Try again
          </button>
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH className="w-8" />
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>Actor</TH>
              <TH>When</TH>
              <TH>IP</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TR key={i}>
                  <TD>
                    <Skeleton className="h-3 w-3" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-32" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-24" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-40" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-28" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-20" />
                  </TD>
                </TR>
              ))
            ) : visibleRows.length === 0 ? (
              <TR>
                <TD colSpan={6}>
                  <EmptyState
                    icon={
                      hasActiveFilter ? (
                        <SearchIllustration className="h-10 w-10 text-slate-400" />
                      ) : (
                        <ClipboardIllustration className="h-10 w-10 text-slate-400" />
                      )
                    }
                    title={hasActiveFilter ? 'No matching events' : 'No activity yet'}
                    description={
                      hasActiveFilter
                        ? 'Try widening the date range or clearing a filter.'
                        : 'Once people start signing in and editing data, every event will appear here.'
                    }
                    action={
                      hasActiveFilter && (
                        <Button onClick={clearFilters} variant="secondary" size="sm">
                          <X className="h-3.5 w-3.5" /> Clear filters
                        </Button>
                      )
                    }
                  />
                </TD>
              </TR>
            ) : (
              visibleRows.map((log) => (
                <Row
                  key={log.id}
                  log={log}
                  expanded={expanded === log.id}
                  onToggle={() => setExpanded((curr) => (curr === log.id ? null : log.id))}
                />
              ))
            )}
          </TBody>
        </Table>
      )}

      {/* Pagination */}
      {!isError && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Page {data?.pagination.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                setExpanded(null);
              }}
              disabled={!data?.pagination.hasPrevPage}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPage((p) => p + 1);
                setExpanded(null);
              }}
              disabled={!data?.pagination.hasNextPage}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Helper / footer */}
      <p className="text-xs text-slate-500 flex items-center gap-2 pt-2">
        <ScrollText className="h-3.5 w-3.5" />
        Audit logs are append-only and retained per your organisation's policy. The
        backend enforces owner-only access — this UI is just a friendly view.
      </p>
    </div>
  );
}

// ---------- internals ----------

function Row({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TR
        className="cursor-pointer"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <TD>
          <ChevronRightIcon
            className={
              'h-3.5 w-3.5 text-slate-500 transition-transform ' +
              (expanded ? 'rotate-90 text-slate-200' : '')
            }
          />
        </TD>
        <TD>
          <ActionBadge action={log.action} />
        </TD>
        <TD>
          {log.entityType ? (
            <div className="flex flex-col">
              <span className="text-slate-200 text-xs uppercase tracking-wider">
                {log.entityType}
              </span>
              {log.entityId && (
                <span className="text-slate-500 font-mono text-[10px] truncate max-w-[180px]">
                  {log.entityId}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </TD>
        <TD>
          {log.user ? (
            <div className="flex flex-col">
              <span className="text-slate-200">{log.user.name}</span>
              <span className="text-slate-500 text-xs">{log.user.email}</span>
            </div>
          ) : (
            <span className="text-slate-500 italic">System</span>
          )}
        </TD>
        <TD>
          <div className="flex flex-col">
            <span className="text-slate-200 text-xs">{formatAbs(log.createdAt)}</span>
            <span className="text-slate-500 text-[11px]">{formatRelative(log.createdAt)}</span>
          </div>
        </TD>
        <TD>
          <span className="text-slate-400 font-mono text-xs">{log.ipAddress ?? '—'}</span>
        </TD>
      </TR>
      {expanded && (
        <tr className="bg-[#0a0f24]/60">
          <td />
          <td colSpan={5} className="px-4 py-4">
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                <span className="text-slate-500">Event ID:</span>{' '}
                <span className="font-mono text-slate-300">{log.id}</span>
                {log.userAgent && (
                  <>
                    <span className="text-slate-500 ml-4">User agent:</span>{' '}
                    <span className="font-mono text-slate-300 break-all">
                      {log.userAgent}
                    </span>
                  </>
                )}
              </div>
              <MetadataDiff metadata={log.metadata} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ActionBadge({ action }: { action: string }) {
  const tone: Parameters<typeof Badge>[0]['tone'] =
    action.includes('DELETE') || action.includes('FAILED') || action.includes('REMOVE')
      ? 'rose'
      : action.includes('CREATE') || action.includes('REGISTER')
        ? 'emerald'
        : action.includes('UPDATE') || action.includes('ASSIGN')
          ? 'amber'
          : action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('REFRESH')
            ? 'cyan'
            : 'slate';
  return <Badge tone={tone}>{action}</Badge>;
}

interface SelectOption {
  value: string;
  label: string;
}

function Select({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          'w-full appearance-none px-3 py-2 pr-8 text-sm rounded-lg ' +
          'bg-[#0a0f24] border border-[#252c52] text-slate-100 ' +
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60'
        }
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0a0f24]">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-500" />
    </div>
  );
}

function formatAbs(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
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
  return '';
}
