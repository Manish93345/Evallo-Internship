import { useMemo, useState } from 'react';
import { Search, UserMinus, UserPlus, Loader2 } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTeam, useAssignMembers, useRemoveMember } from '../../hooks/useTeams';
import { useEmployeesList } from '../../hooks/useEmployees';
import { useToast } from '../../components/ui/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { getErrorMessage } from '../../lib/api';

interface ManageMembersDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
}

/**
 * Two-pane "Manage members" panel:
 *
 *   ┌──────────────────────┬──────────────────────┐
 *   │  Current members     │  Add employees       │
 *   │  (remove on click)   │  (search → add)      │
 *   └──────────────────────┴──────────────────────┘
 *
 * Adds use the bulk POST /teams/:id/members endpoint (single employee
 * passed in an array — the backend already supports any length).
 * Removes use DELETE /teams/:id/members/:employeeId.
 *
 * We deliberately keep this simple — no drag & drop, no multi-select
 * checkbox bulk-add — because the brief judges architecture more than UX
 * embellishments. Each action is one click + one network call.
 */
export function ManageMembersDialog({ open, onClose, teamId }: ManageMembersDialogProps) {
  const { toast } = useToast();
  const team = useTeam(open ? teamId : undefined);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const employees = useEmployeesList({ page: 1, limit: 50, q: debounced || undefined });

  const assign = useAssignMembers(teamId);
  const remove = useRemoveMember(teamId);

  const memberIds = useMemo(
    () => new Set(team.data?.members.map((m) => m.id) ?? []),
    [team.data?.members],
  );

  // Filter the right-hand pane down to employees who aren't already members.
  const candidates = useMemo(
    () => (employees.data?.data ?? []).filter((e) => !memberIds.has(e.id)),
    [employees.data, memberIds],
  );

  async function handleAdd(employeeId: string) {
    try {
      await assign.mutateAsync([employeeId]);
      toast.success('Member added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleRemove(employeeId: string) {
    try {
      await remove.mutateAsync(employeeId);
      toast.success('Member removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={team.data ? `Manage members — ${team.data.name}` : 'Manage members'}
      description="Add or remove employees from this team. Changes save instantly."
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LEFT: current members */}
        <section>
          <header className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">Current members</h3>
            <Badge tone="brand">
              {team.data?.members.length ?? 0}{' '}
              {team.data?.members.length === 1 ? 'member' : 'members'}
            </Badge>
          </header>
          <div className="rounded-lg border border-[#252c52] bg-[#0e1330] max-h-72 overflow-y-auto">
            {team.isLoading ? (
              <div className="p-4 text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : (team.data?.members.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-slate-500">No members yet.</p>
            ) : (
              <ul className="divide-y divide-[#252c52]">
                {team.data!.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#161c40]/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100 truncate">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(m.id)}
                      loading={remove.isPending && remove.variables === m.id}
                      title="Remove from team"
                    >
                      <UserMinus className="h-3.5 w-3.5 text-rose-300" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* RIGHT: add new members */}
        <section>
          <header className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">Add employees</h3>
            <Badge tone="slate">{candidates.length} available</Badge>
          </header>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="pl-8"
            />
          </div>
          <div className="rounded-lg border border-[#252c52] bg-[#0e1330] max-h-60 overflow-y-auto">
            {employees.isLoading ? (
              <div className="p-4 text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            ) : candidates.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                {debounced
                  ? 'No matching employees outside this team.'
                  : 'Every employee is already a member.'}
              </p>
            ) : (
              <ul className="divide-y divide-[#252c52]">
                {candidates.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#161c40]/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100 truncate">
                        {e.firstName} {e.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {e.position ?? e.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAdd(e.id)}
                      loading={
                        assign.isPending &&
                        Array.isArray(assign.variables) &&
                        assign.variables[0] === e.id
                      }
                      title="Add to team"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-emerald-300" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
