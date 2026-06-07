import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';
import type { Team } from '../../lib/types';

const schema = z.object({
  name: z.string().trim().min(1, 'Required').max(80),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface TeamFormProps {
  mode: 'create' | 'edit';
  initial?: Team;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TeamForm({ mode, initial, onSubmit, onCancel, loading }: TeamFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      description: values.description ? values.description : undefined,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Team name</Label>
        <Input
          {...register('name')}
          error={errors.name?.message}
          placeholder="Engineering"
          autoFocus
        />
        {errors.name && <p className="text-xs text-rose-300">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="What does this team do?"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[#0a0f24] border border-[#252c52] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 resize-none"
        />
        {errors.description && (
          <p className="text-xs text-rose-300">{errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading || isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={loading || isSubmitting}>
          {mode === 'create' ? 'Create team' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
