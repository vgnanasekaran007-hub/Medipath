import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function QrBadge({
  code,
  label,
  compact = false,
}: {
  code: string;
  label?: string;
  compact?: boolean;
}) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const deepLinkPath = `/qr/${encodeURIComponent(code)}`;
  const fullUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${deepLinkPath}` : deepLinkPath;

  useEffect(() => {
    let active = true;
    QRCode.toString(fullUrl, {
      type: 'svg',
      width: compact ? 104 : 156,
      margin: 1,
      color: { dark: '#102C35', light: '#FFFFFF' },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });
    return () => {
      active = false;
    };
  }, [fullUrl, compact]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback unavailable
    }
  };

  return (
    <div className="inline-flex flex-col gap-3 rounded-architectural border border-champagne-border bg-surface p-4 text-ink">
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 overflow-hidden rounded border border-champagne-border bg-white p-1"
          aria-label={`QR code for ${code}`}
          dangerouslySetInnerHTML={svgMarkup ? { __html: svgMarkup } : undefined}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
            <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{code}</span>
          </div>
          {label && <p className="mt-1 font-display text-sm font-semibold text-ink">{label}</p>}
          <p className="mt-1 break-all text-xs text-ink">{deepLinkPath}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={deepLinkPath}
              className="inline-flex items-center gap-1 rounded border border-champagne-border bg-ivory px-2.5 py-1 text-xs font-medium text-ink hover:border-ink"
            >
              <span>Simulate Scan</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded border border-champagne-border bg-ivory px-2.5 py-1 text-xs font-medium text-ink hover:border-ink"
            >
              {copied ? <Check className="h-3 w-3 text-ink" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
