import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, ErrorBanner } from '../../components/ui/Primitives';
import { api, hasSupabaseFrontendConfig } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: ({ user, token }) => {
      setSession(user, token);
      if (user.role === 'admin' || user.role === 'hospital_staff') {
        navigate('/admin');
      } else {
        navigate('/portal');
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-architectural border border-champagne-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
          Patient &amp; Visitor Access
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          Sign In to MEDIPATH
        </h1>
        <p className="mt-1 text-sm text-ink">
          Manage outpatient bookings, saved mobility preferences, and concierge escort requests.
        </p>

        {mutation.error && (
          <div className="mt-4">
            <ErrorBanner
              title="Authentication failed"
              message={mutation.error instanceof Error ? mutation.error.message : 'Unable to sign in'}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-medium text-ink">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-medium text-ink">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-ink hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Sign In</span>
          </Button>
        </form>

        {/* Demo Quick Fill ONLY shown for local/non-production sandbox development */}
        {!hasSupabaseFrontendConfig && (
          <div className="mt-6 rounded border border-champagne-border bg-ivory p-3.5 text-xs text-ink">
            <p className="font-semibold text-ink">Local Sample Mode Account</p>
            <p className="mt-1">Patient Demo: patient@medipath.demo</p>
            <button
              type="button"
              onClick={() => {
                setEmail('patient@medipath.demo');
                setPassword('MediPathDemo!2026');
              }}
              className="mt-2 font-semibold text-ink underline"
            >
              Fill sample patient credentials
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-champagne-border pt-4 text-center text-sm text-ink">
          New visitor?{' '}
          <Link to="/register" className="font-semibold text-ink hover:underline">
            Create patient account
          </Link>
          <span className="mx-2">·</span>
          <Link to="/admin/login" className="font-medium text-ink hover:underline">
            Staff / Admin Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
