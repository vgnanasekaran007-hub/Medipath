import { useMutation } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, ErrorBanner } from '../../components/ui/Primitives';
import { api, hasSupabaseFrontendConfig } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: ({ user, token }) => {
      if (user.role !== 'admin' && user.role !== 'hospital_staff') {
        setRoleNotice('Signed in as patient account — redirecting to Patient Portal.');
        setSession(user, token);
        navigate('/portal');
        return;
      }
      setSession(user, token);
      navigate('/admin');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setRoleNotice(null);
    mutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-architectural px-4 py-12">
      <div className="w-full max-w-md rounded-architectural border border-champagne-border bg-surface p-8 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
          <Shield className="h-4 w-4 text-ink" aria-hidden="true" />
          <span>MEDIPATH Operations Console</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          Hospital Administrator &amp; Staff Sign In
        </h1>
        <p className="mt-1 text-sm text-ink">
          Manage clinical schedules, queues, 3D/2D hospital blueprints, and audit governance.
        </p>

        {roleNotice && (
          <div className="mt-4">
            <ErrorBanner message={roleNotice} />
          </div>
        )}
        {mutation.error && (
          <div className="mt-4">
            <ErrorBanner
              message={mutation.error instanceof Error ? mutation.error.message : 'Login failed'}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="adm-email" className="mb-1 block text-xs font-medium text-ink">
              Staff / Admin Email
            </label>
            <input
              id="adm-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="adm-pass" className="mb-1 block text-xs font-medium text-ink">
              Password
            </label>
            <input
              id="adm-pass"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
            Enter Operations Console
          </Button>
        </form>

        {!hasSupabaseFrontendConfig && (
          <div className="mt-6 space-y-2 rounded border border-champagne-border bg-ivory p-3.5 text-xs text-ink">
            <p className="font-semibold text-ink">Local Sample Staff Credentials</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@medipath.demo');
                  setPassword('MediPathDemo!2026');
                }}
                className="min-h-[38px] rounded border border-champagne-border px-2.5 py-1 font-semibold text-ink hover:bg-surface"
              >
                Fill Admin Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('staff@medipath.demo');
                  setPassword('MediPathDemo!2026');
                }}
                className="min-h-[38px] rounded border border-champagne-border px-2.5 py-1 font-semibold text-ink hover:bg-surface"
              >
                Fill Staff Demo
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-champagne-border pt-4 text-center text-xs">
          <Link to="/" className="font-semibold text-ink hover:underline">
            ← Return to Public MEDIPATH Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
