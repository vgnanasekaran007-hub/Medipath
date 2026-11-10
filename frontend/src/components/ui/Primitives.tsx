import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'emergency' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const styles = {
    primary: 'bg-teal-deep text-white hover:bg-teal-forest border border-transparent',
    secondary: 'bg-teal-forest text-white hover:bg-teal-deep border border-transparent',
    accent: 'bg-champagne text-[#102C35] hover:bg-champagne/90 border border-champagne-border font-semibold',
    outline: 'bg-surface text-ink border border-champagne-border hover:border-ink',
    ghost: 'bg-transparent text-ink hover:bg-champagne-soft border border-transparent',
    emergency: 'bg-emergency text-white hover:bg-emergency/90 border border-transparent',
  }[variant];

  const sizes = {
    sm: 'min-h-[38px] px-3.5 py-1.5 text-sm',
    md: 'min-h-[44px] px-5 py-2.5 text-sm',
    lg: 'min-h-[48px] px-6 py-3 text-base',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-architectural font-medium transition-transform duration-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55',
        styles,
        sizes,
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: 'teal' | 'champagne' | 'emergency' | 'success' | 'neutral';
  children: ReactNode;
}) {
  const styles = {
    teal: 'bg-teal-mist text-ink border-champagne-border',
    champagne: 'bg-champagne-soft text-ink border-champagne-border',
    emergency: 'bg-emergency-soft text-emergency border-emergency/35',
    success: 'bg-teal-mist text-ink border-champagne-border',
    neutral: 'bg-ivory text-ink border-champagne-border',
  }[tone];

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-architectural border px-2.5 py-0.5 text-xs font-medium tracking-wide',
        styles,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  headingAs = 'h2',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  headingAs?: 'h1' | 'h2';
}) {
  const HeadingTag = headingAs;
  return (
    <div className="flex flex-col gap-4 border-b border-champagne-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
            {eyebrow}
          </p>
        )}
        <HeadingTag className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {title}
        </HeadingTag>
        {description && <p className="mt-2 text-base leading-relaxed text-ink">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading architectural data…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-architectural border border-champagne-border bg-surface p-8 text-ink"
    >
      <Loader2 className="h-6 w-6 animate-spin text-ink" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ErrorBanner({
  title = 'Unable to load record',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col justify-between gap-4 rounded-architectural border border-emergency/35 bg-emergency-soft p-5 text-ink sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-emergency" aria-hidden="true" />
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-ink">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-architectural border border-champagne-border bg-teal-mist p-4 text-ink"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-architectural border border-dashed border-champagne-border bg-surface p-10 text-center">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
