import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, ErrorBanner } from '../../components/ui/Primitives';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ta'>('en');

  const mutation = useMutation({
    mutationFn: api.register,
    onSuccess: ({ user, token }) => {
      setSession(user, token);
      navigate('/portal');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      password,
      preferredLanguage,
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-architectural border border-champagne-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
          Patient Portal Registration
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          Create Visitor Account
        </h1>

        {mutation.error && (
          <div className="mt-4">
            <ErrorBanner
              message={mutation.error instanceof Error ? mutation.error.message : 'Registration failed'}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reg-name" className="mb-1 block text-xs font-medium text-ink">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-1 block text-xs font-medium text-ink">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="reg-phone" className="mb-1 block text-xs font-medium text-ink">
              Phone Number (Optional)
            </label>
            <input
              id="reg-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="reg-lang" className="mb-1 block text-xs font-medium text-ink">
              Preferred Language
            </label>
            <select
              id="reg-lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'ta')}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1 block text-xs font-medium text-ink">
              Password (8+ characters)
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Create Account</span>
          </Button>
        </form>

        <p className="mt-6 border-t border-champagne-border pt-4 text-center text-sm text-ink">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-ink hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
