import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UsersRound,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, Skeleton } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import {
  useCreateTeam,
  useDeleteTeam,
  useTeamsList,
  useUpdateTeam,
} from '../hooks/useTeams';
import { TeamForm } from '../features/teams/TeamForm';
import { ManageMembersDialog } from '../features/teams/ManageMembersDialog';
import { getErrorMessage } from '../lib/api';
import type { Team } from '../lib/types';

/**
 * /teams — card-grid view, one card per team.
 *
 * Each card shows:
 *   • Team name + description
 *   • Member count badge
 *   • Actions: Edit · Delete · Manage members (opens a dedicated dialog)
 *
 * Pagination lives at the bottom; search debounces 350 ms.
 */
export function TeamsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState<Team | null>(null);
  const [managing, setManaging] = useState<Team | null>(null);

  useMemo(() => setPage(1), [debouncedSearch]);

  const limit = 12;
  const { data, isLoading, isFetching, isError, refetch } = useTeamsList({
    page,
    limit,
    q: debouncedSearch || undefined,
  });

  const createMut = useCreateTeam();
  const updateMut = useUpdateTeam(editing?.id ?? '');
  const deleteMut = useDeleteTeam();

  async function handleCreate(values: Parameters<typeof createMut.mutateAsync>[0]) {
    try {
      await createMut.mutateAsync(values);
      setCreateOpen(false);
      toast.success('Team created');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleUpdate(values: Parameters<typeof updateMut.mutateAsync>[0]) {
    try {
      await updateMut.mutateAsync(values);
      setEditing(null);
      toast.success('Team updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      setDeleting(null);
      toast.success('Team deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Teams</h1>
          <p className="text-sm text-slate-400 mt-1">
            Group employees into teams. An employee can belong to many teams.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New team
        </Button>
      </header>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-slate-500 sm:ml-auto">
          {isFetching ? 'Refreshing…' : `${total} ${total === 1 ? 'team' : 'teams'}`}
        </div>
      </div>

      {/* Card grid */}
      {isError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-6 text-sm text-rose-200">
          Couldn't load teams.{' '}
          <button onClick={() => refetch()} className="underline hover:text-rose-100">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="!p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-8 w-full mt-3" />
            </Card>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UsersRound className="h-5 w-5" />}
            title={debouncedSearch ? 'No matches' : 'No teams yet'}
            description={
              debouncedSearch
                ? `Nothing matches "${debouncedSearch}".`
                : 'Teams help you organise employees by function, project, or location.'
            }
            action={
              !debouncedSearch && (
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="h-4 w-4" /> Create your first team
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={() => setEditing(team)}
              onDelete={() => setDeleting(team)}
              onManage={() => setManaging(team)}
            />
          ))}
        </div>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data?.pagination.hasPrevPage}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.pagination.hasNextPage}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create team"
        description="Name your team and add a description. You can add members afterwards."
      >
        <TeamForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          loading={createMut.isPending}
        />
      </Dialog>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit team"
        description="Update the team's name or description."
      >
        {editing && (
          <TeamForm
            mode="edit"
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={updateMut.isPending}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete team?"
        description={
          deleting
            ? `"${deleting.name}" will be removed and all ${deleting.memberCount} membership${
                deleting.memberCount === 1 ? '' : 's'
              } detached. Employees themselves are not deleted.`
            : ''
        }
        confirmLabel="Delete team"
        loading={deleteMut.isPending}
      />

      {managing && (
        <ManageMembersDialog
          open={!!managing}
          onClose={() => setManaging(null)}
          teamId={managing.id}
        />
      )}
    </div>
  );
}

function TeamCard({
  team,
  onEdit,
  onDelete,
  onManage,
}: {
  team: Team;
  onEdit: () => void;
  onDelete: () => void;
  onManage: () => void;
}) {
  return (
    <Card className="!p-5 flex flex-col justify-between hover:border-brand-500/40 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100 truncate">{team.name}</h3>
          <Badge tone="brand">
            {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
          </Badge>
        </div>
        <p className="text-sm text-slate-400 mt-2 line-clamp-3 min-h-[40px]">
          {team.description ?? <span className="italic text-slate-500">No description</span>}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onManage} className="flex-1">
          <Settings2 className="h-3.5 w-3.5" /> Manage members
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5 text-rose-300" />
        </Button>
      </div>
    </Card>
  );
}
