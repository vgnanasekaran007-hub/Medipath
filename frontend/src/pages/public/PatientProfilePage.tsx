import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, ErrorBanner, SectionHeader, SuccessBanner } from '../../components/ui/Primitives';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

export function PatientProfilePage() {
  const user = useAppStore((s) => s.user);
  const updateUserProfileLocal = useAppStore((s) => s.updateUserProfileLocal);
  const setAccessibleOnly = useAppStore((s) => s.setAccessibleOnly);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ta'>(
    user?.preferredLanguage ?? 'en',
  );
  const [accessibilityRequired, setAccessibilityRequired] = useState(
    user?.accessibilityRequired ?? false,
  );
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: ({ user: updated }) => {
      updateUserProfileLocal(updated);
      setAccessibleOnly(updated.accessibilityRequired);
      setSaved(true);
    },
  });

  if (!user) return <Navigate to="/login" replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate({
      fullName: fullName.trim(),
      phone: phone.trim(),
      preferredLanguage,
      accessibilityRequired,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHeader
        headingAs="h1"
        eyebrow="Patient Preferences"
        title="Profile & Wayfinding Settings"
        description="Save your default language and step-free elevator routing preference across sessions."
      />

      {saved && <SuccessBanner message="Profile preferences updated cleanly." />}
      {mutation.error && (
        <ErrorBanner message={mutation.error instanceof Error ? mutation.error.message : 'Update failed'} />
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-architectural border border-champagne-border bg-surface p-6 sm:p-8"
      >
        <div>
          <label htmlFor="prof-email" className="mb-1 block text-xs font-medium text-ink">
            Email (Read-only)
          </label>
          <input
            id="prof-email"
            type="email"
            disabled
            value={user.email}
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-ivory px-3 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="prof-name" className="mb-1 block text-xs font-medium text-ink">
            Full Name
          </label>
          <input
            id="prof-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="prof-phone" className="mb-1 block text-xs font-medium text-ink">
            Phone Number
          </label>
          <input
            id="prof-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="prof-lang" className="mb-1 block text-xs font-medium text-ink">
            Default Interface &amp; Turn-by-Turn Language
          </label>
          <select
            id="prof-lang"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'ta')}
            className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
          >
            <option value="en">English (EN)</option>
            <option value="ta">தமிழ் (Tamil)</option>
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-architectural border border-champagne-border bg-ivory p-3.5 text-sm">
          <input
            type="checkbox"
            checked={accessibilityRequired}
            onChange={(e) => setAccessibilityRequired(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          <span className="font-medium text-ink">
            Always default to Wheelchair / Step-Free (Elevators Only) routing
          </span>
        </label>

        <Button type="submit" variant="primary" loading={mutation.isPending}>
          Save Profile Changes
        </Button>
      </form>
    </div>
  );
}
