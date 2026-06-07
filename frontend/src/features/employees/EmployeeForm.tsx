import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';
import { TeamMultiSelect } from './TeamMultiSelect';
import type { Employee } from '../../lib/types';
import type {
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from '../../lib/employeesApi';

/**
 * Shared form for creating + editing an employee.
 *
 *   • The Zod schema mirrors the backend (`employees.schema.ts`) so the user
 *     gets the same validation errors before the request even leaves the
 *     browser.
 *   • In edit mode, `teamIds` is intentionally left out of the submit
 *     payload — team membership for an existing employee is managed from
 *     the Teams page (see "Manage Members").
 */

const formSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(80),
  lastName: z.string().trim().min(1, 'Required').max(80),
  email: z.string().trim().min(1, 'Required').email('Invalid email').toLowerCase(),
  position: z.string().trim().max(120).optional().or(z.literal('')),
  joinedAt: z.string().optional().or(z.literal('')),
  teamIds: z.array(z.string().uuid()).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initial?: Employee;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function EmployeeForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  loading,
}: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initial?.firstName ?? '',
      lastName: initial?.lastName ?? '',
      email: initial?.email ?? '',
      position: initial?.position ?? '',
      joinedAt: initial?.joinedAt ? initial.joinedAt.slice(0, 10) : '',
      teamIds: initial?.teams.map((t) => t.id) ?? [],
    },
  });

  // Keep form in sync if a different employee gets passed in while the
  // dialog is mounted.
  useEffect(() => {
    reset({
      firstName: initial?.firstName ?? '',
      lastName: initial?.lastName ?? '',
      email: initial?.email ?? '',
      position: initial?.position ?? '',
      joinedAt: initial?.joinedAt ? initial.joinedAt.slice(0, 10) : '',
      teamIds: initial?.teams.map((t) => t.id) ?? [],
    });
  }, [initial, reset]);

  const teamIds = watch('teamIds') ?? [];

  const submit = handleSubmit(async (values) => {
    const payload: CreateEmployeePayload | UpdateEmployeePayload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      position: values.position ? values.position : undefined,
      joinedAt: values.joinedAt ? values.joinedAt : undefined,
    };
    if (mode === 'create') {
      (payload as CreateEmployeePayload).teamIds = values.teamIds ?? [];
    }
    await onSubmit(payload);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="First name" error={errors.firstName?.message}>
          <Input
            {...register('firstName')}
            error={errors.firstName?.message}
            placeholder="Jane"
            autoFocus
          />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <Input
            {...register('lastName')}
            error={errors.lastName?.message}
            placeholder="Cooper"
          />
        </Field>
      </div>

      <Field label="Email" error={errors.email?.message}>
        <Input
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="jane.cooper@example.com"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Position" error={errors.position?.message}>
          <Input
            {...register('position')}
            error={errors.position?.message}
            placeholder="Senior Engineer"
          />
        </Field>
        <Field label="Joined on" error={errors.joinedAt?.message}>
          <Input type="date" {...register('joinedAt')} error={errors.joinedAt?.message} />
        </Field>
      </div>

      {mode === 'create' && (
        <Field label="Teams (optional)">
          <TeamMultiSelect
            value={teamIds}
            onChange={(ids) => setValue('teamIds', ids, { shouldDirty: true })}
          />
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading || isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={loading || isSubmitting}>
          {mode === 'create' ? 'Create employee' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
