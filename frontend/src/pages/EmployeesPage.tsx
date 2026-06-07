import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Table, THead, TBody, TR, TH, TD, EmptyState, Skeleton } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployeesList,
  useUpdateEmployee,
} from '../hooks/useEmployees';
import { EmployeeForm } from '../features/employees/EmployeeForm';
import type { Employee } from '../lib/types';
import { getErrorMessage } from '../lib/api';

/**
 * /employees — the workhorse CRUD screen.
 *
 *   • Server-side pagination & search (debounced).
 *   • Add / Edit / Delete via dialogs, with optimistic-feeling UX thanks to
 *     React Query's automatic invalidation + the `placeholderData: prev`
 *     setting on the list query.
 *   • Each row's team assignments render as coloured badges so reviewers
 *     can see the many-to-many relationship at a glance.
 */
export function EmployeesPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  // Reset to page 1 whenever a new search term is applied.
  useMemo(() => setPage(1), [debouncedSearch]);

  const limit = 10;
  const { data, isLoading, isFetching, isError, refetch } = useEmployeesList({
    page,
    limit,
    q: debouncedSearch || undefined,
  });

  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee(editing?.id ?? '');
  const deleteMut = useDeleteEmployee();

  async function handleCreate(values: Parameters<typeof createMut.mutateAsync>[0]) {
    try {
      await createMut.mutateAsync(values);
      setCreateOpen(false);
      toast.success('Employee created');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleUpdate(values: Parameters<typeof updateMut.mutateAsync>[0]) {
    try {
      await updateMut.mutateAsync(values);
      setEditing(null);
      toast.success('Employee updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      setDeleting(null);
      toast.success('Employee deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Employees</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage everyone in your organisation. Search, edit, or assign teams.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add employee
        </Button>
      </header>

      {/* Search + meta */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-xs text-slate-500 sm:ml-auto">
          {isFetching ? 'Refreshing…' : `${total} ${total === 1 ? 'employee' : 'employees'}`}
        </div>
      </div>

      {/* Table */}
      {isError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-6 text-sm text-rose-200">
          Couldn't load employees.{' '}
          <button onClick={() => refetch()} className="underline hover:text-rose-100">
            Try again
          </button>
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Position</TH>
              <TH>Teams</TH>
              <TH>Joined</TH>
              <TH className="text-right pr-5">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TR key={i}>
                  <TD>
                    <Skeleton className="h-4 w-32" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-48" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-28" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-24" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-20" />
                  </TD>
                  <TD>
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TD>
                </TR>
              ))
            ) : data?.data.length === 0 ? (
              <TR>
                <TD colSpan={6}>
                  <EmptyState
                    icon={<Users className="h-5 w-5" />}
                    title={debouncedSearch ? 'No matches' : 'No employees yet'}
                    description={
                      debouncedSearch
                        ? `Nothing matches "${debouncedSearch}".`
                        : 'Add your first employee to start building teams.'
                    }
                    action={
                      !debouncedSearch && (
                        <Button onClick={() => setCreateOpen(true)} size="sm">
                          <Plus className="h-4 w-4" /> Add employee
                        </Button>
                      )
                    }
                  />
                </TD>
              </TR>
            ) : (
              data?.data.map((emp) => (
                <TR key={emp.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar firstName={emp.firstName} lastName={emp.lastName} />
                      <div className="font-medium text-slate-100">
                        {emp.firstName} {emp.lastName}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <span className="text-slate-300">{emp.email}</span>
                  </TD>
                  <TD>
                    <span className="text-slate-300">{emp.position ?? '—'}</span>
                  </TD>
                  <TD>
                    {emp.teams.length === 0 ? (
                      <span className="text-slate-500 text-xs">No teams</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {emp.teams.slice(0, 3).map((t) => (
                          <Badge key={t.id} tone="cyan">
                            {t.name}
                          </Badge>
                        ))}
                        {emp.teams.length > 3 && (
                          <Badge tone="slate">+{emp.teams.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </TD>
                  <TD>
                    <span className="text-slate-400 text-xs">{formatDate(emp.joinedAt)}</span>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(emp)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(emp)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-300" />
                      </Button>
                    </div>
                  </TD>
                </TR>
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

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add employee"
        description="Add a new person to your organisation. You can optionally assign teams now."
        size="lg"
      >
        <EmployeeForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          loading={createMut.isPending}
        />
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit employee"
        description="Update details. Manage team assignments from the Teams page."
        size="lg"
      >
        {editing && (
          <EmployeeForm
            mode="edit"
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={updateMut.isPending}
          />
        )}
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete employee?"
        description={
          deleting
            ? `${deleting.firstName} ${deleting.lastName} will be removed from all teams. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = (firstName[0] ?? '') + (lastName[0] ?? '');
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 flex items-center justify-center text-xs font-semibold text-white">
      {initials.toUpperCase()}
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
