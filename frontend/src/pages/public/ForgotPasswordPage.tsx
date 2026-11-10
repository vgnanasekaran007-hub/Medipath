import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, ErrorBanner, SuccessBanner } from '../../components/ui/Primitives';
import { api } from '../../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (addr: string) => api.forgotPassword(addr),
    onSuccess: (res) => {
      setMessage(res.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    mutation.mutate(email.trim());
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-architectural border border-champagne-border bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Reset Password</h1>
        <p className="mt-2 text-sm text-ink">
          Enter your registered email address to request a password reset link.
        </p>

        {message && (
          <div className="mt-4">
            <SuccessBanner message={message} />
          </div>
        )}
        {mutation.error && (
          <div className="mt-4">
            <ErrorBanner
              message={mutation.error instanceof Error ? mutation.error.message : 'Unable to send reset request'}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="fp-email" className="mb-1 block text-xs font-medium text-ink">
              Email Address
            </label>
            <input
              id="fp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
            Send Reset Instructions
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="font-semibold text-ink hover:underline">
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
