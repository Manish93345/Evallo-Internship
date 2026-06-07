import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/api';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label, FieldError } from '../components/ui/Label';

// Mirror the backend's RegisterSchema so the client-side errors line up
// with what the server would reject anyway.
const schema = z.object({
  organisationName: z.string().min(2, 'Organisation name is required').max(100),
  name: z.string().min(1, 'Your name is required').max(80),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), {
      message: 'Must contain at least one letter and one number',
    }),
});
type Form = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: doRegister } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setSubmitError(null);
    try {
      await doRegister(values);
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-500/15 text-brand-300 text-xs font-semibold tracking-wider uppercase border border-brand-500/30 mb-3">
            Phase 1 · Auth
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
            Create your organisation
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            You'll be the owner of this workspace and can invite teammates later.
          </p>
        </div>

        <Card>
          <CardTitle>Organisation & owner details</CardTitle>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="organisationName" required>Organisation name</Label>
              <Input
                id="organisationName"
                placeholder="Acme Corp"
                error={errors.organisationName?.message}
                {...register('organisationName')}
              />
              <FieldError message={errors.organisationName?.message} />
            </div>

            <div>
              <Label htmlFor="name" required>Your name</Label>
              <Input
                id="name"
                placeholder="Manish Kumar"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="email" required>Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div>
              <Label htmlFor="password" required>Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 chars, 1 letter + 1 number"
                error={errors.password?.message}
                {...register('password')}
              />
              <FieldError message={errors.password?.message} />
            </div>

            {submitError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {submitError}
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              <UserPlus className="h-4 w-4" /> Create organisation
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-300 hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
