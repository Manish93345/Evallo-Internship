import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/api';
import { Card, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label, FieldError } from '../components/ui/Label';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Where to redirect back to after login (if a guard sent us here)
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setSubmitError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
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
            Sign in to HRMS
          </h1>
        </div>

        <Card>
          <CardTitle subtitle="Use the account you created when registering your organisation.">
            Welcome back
          </CardTitle>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email" required>Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="current-password"
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
              <LogIn className="h-4 w-4" /> Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an organisation account yet?{' '}
            <Link to="/register" className="text-brand-300 hover:underline">
              Register
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
