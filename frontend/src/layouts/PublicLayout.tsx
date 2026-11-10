import {
  Activity,
  CalendarPlus,
  Compass,
  Home,
  Languages,
  Menu,
  Moon,
  PhoneCall,
  Shield,
  Stethoscope,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/translations';
import { useAppStore } from '../stores/appStore';

function BrandMark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#102C35" />
      <rect x="6.5" y="6.5" width="51" height="51" rx="11.5" stroke="#B7A58A" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M18 41V27L32 18L46 27V41" stroke="#EEF2F1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 27V39" stroke="#C6B292" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26 33H38" stroke="#C6B292" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="32" cy="18" r="4" fill="#B7A58A" stroke="#0B1D24" strokeWidth="1.5" />
      <path d="M16 46H48" stroke="#B7A58A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function PublicLayout({ children }: { children?: ReactNode }) {
  const { t, lang } = useTranslation();
  const toggleLanguage = useAppStore((s) => s.toggleLanguage);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const user = useAppStore((s) => s.user);
  const clearSession = useAppStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = theme === 'dark';

  const navItems = [
    { to: '/explore', label: t.nav.explore },
    { to: '/navigate', label: t.nav.navigate },
    { to: '/map-2d', label: t.nav.map2d },
    { to: '/departments', label: t.nav.departments },
    { to: '/doctors', label: t.nav.doctors },
    { to: '/services', label: t.nav.services },
    { to: '/queue', label: t.nav.queue },
  ];

  const mobileDockItems = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/navigate', label: t.nav.navigate, icon: Compass },
    { to: '/services', label: t.nav.services, icon: Stethoscope },
    { to: '/appointments/book', label: t.home.bookCta, icon: CalendarPlus },
    { to: '/queue', label: t.nav.queue, icon: Activity },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-ink pb-16 md:pb-0">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Architectural Sample Disclosure & Emergency Utility Strip */}
      <div className="border-b border-champagne-border bg-[#0F2830] text-xs text-white">
        <div className="mx-auto flex max-w-editorial flex-col gap-1.5 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6">
          <p className="min-w-0 leading-snug text-white/95 sm:truncate">{t.sampleBanner}</p>
          <div className="flex shrink-0 items-center gap-4">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-1.5 font-medium text-white hover:text-champagne"
            >
              <PhoneCall className="h-3.5 w-3.5 shrink-0 text-champagne" aria-hidden="true" />
              <span>Emergency Gate A · +91 44 4019 2911</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Editorial Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-champagne-border bg-surface">
        <div className="mx-auto flex max-w-editorial items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 focus-visible:outline-ink">
            <BrandMark />
            <div>
              <span className="block font-display text-lg font-bold tracking-[0.14em] text-ink">
                {t.brandName}
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide text-ink sm:block">
                Aurelia Pavilion Medical Center
              </span>
            </div>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 xl:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex min-h-[40px] whitespace-nowrap items-center rounded-architectural px-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-teal-deep text-white'
                      : 'text-ink hover:bg-champagne-soft'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-pressed={isDark}
              className="inline-flex min-h-[40px] whitespace-nowrap items-center gap-1.5 rounded-architectural border border-champagne-border bg-ivory px-3 text-xs font-semibold text-ink hover:border-ink"
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{isDark ? t.nav.lightMode : t.nav.darkMode}</span>
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              aria-label="Switch language between English and Tamil"
              className="inline-flex min-h-[40px] whitespace-nowrap items-center gap-1.5 rounded-architectural border border-champagne-border bg-ivory px-3 text-xs font-semibold text-ink hover:border-ink"
            >
              <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{lang === 'en' ? 'EN · தமிழ்' : 'தமிழ் · EN'}</span>
            </button>

            <Link
              to="/emergency"
              className="inline-flex min-h-[40px] whitespace-nowrap items-center rounded-architectural bg-emergency px-3.5 text-xs font-semibold tracking-wide text-white hover:bg-emergency/90"
            >
              {t.nav.emergency}
            </Link>

            {user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  to={user.role === 'admin' || user.role === 'hospital_staff' ? '/admin' : '/portal'}
                  className="inline-flex min-h-[40px] whitespace-nowrap items-center gap-1.5 rounded-architectural border border-champagne-border bg-ivory px-3 text-xs font-semibold text-ink hover:border-ink"
                >
                  {user.role === 'admin' || user.role === 'hospital_staff' ? (
                    <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {user.role === 'admin' || user.role === 'hospital_staff'
                      ? t.nav.admin
                      : t.nav.portal}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    clearSession();
                    navigate('/');
                  }}
                  className="inline-flex min-h-[40px] whitespace-nowrap items-center rounded-architectural px-2.5 text-xs font-medium text-ink hover:bg-champagne-soft"
                >
                  {t.nav.signOut}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-[40px] whitespace-nowrap items-center rounded-architectural border border-champagne-border px-3.5 text-xs font-semibold text-ink hover:border-ink"
              >
                {t.nav.signIn}
              </Link>
            )}
          </div>

          {/* Mobile & Tablet utility controls */}
          <div className="flex items-center gap-1.5 xl:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-pressed={isDark}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-architectural border border-champagne-border bg-ivory text-ink"
            >
              {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label="Toggle language"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-architectural border border-champagne-border bg-ivory px-2.5 text-xs font-semibold text-ink"
            >
              {lang === 'en' ? 'தமிழ்' : 'EN'}
            </button>
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-architectural border border-champagne-border bg-ivory text-ink"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation drawer"
            className="border-t border-champagne-border bg-surface px-4 py-4 xl:hidden"
          >
            <div className="grid gap-1">
              {[
                ...navItems,
                { to: '/appointments/book', label: t.home.bookCta },
                { to: '/assistance', label: t.nav.assistance },
                { to: '/emergency', label: t.nav.emergency },
                { to: user ? '/portal' : '/login', label: user ? t.nav.portal : t.nav.signIn },
                { to: '/admin', label: `${t.nav.admin} Operations` },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] items-center rounded-architectural px-3 text-sm font-medium text-ink hover:bg-champagne-soft"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {children ?? <Outlet />}
      </main>

      <footer className="mt-16 border-t border-champagne-border bg-surface text-sm text-ink">
        <div className="mx-auto grid max-w-editorial gap-10 px-4 py-12 sm:px-6 md:grid-cols-12">
          <div className="min-w-0 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <Compass className="h-5 w-5 text-ink" aria-hidden="true" />
              <span className="font-display text-base font-bold tracking-[0.14em] text-ink">
                MEDIPATH
              </span>
            </div>
            <p className="mt-3 max-w-md leading-relaxed text-ink">
              {t.tagline} Spatial navigation architecture for Aurelia Pavilion Medical Center,
              unifying interactive 3D modeling, bilingual guidance, and clinical operations.
            </p>
            <p className="mt-3 rounded border border-champagne-border bg-ivory px-3 py-2 text-xs text-ink">
              Demonstration Note: All facility blueprints, physicians, queues, and sample visits
              represent a fictional single-hospital model. No real patient health data is stored.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:col-span-7 md:grid-cols-3">
            <div>
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-ink">
                Wayfinding
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                <li><Link to="/navigate" className="hover:underline">3D Navigator</Link></li>
                <li><Link to="/map-2d" className="hover:underline">Full-Page 2D Map</Link></li>
                <li><Link to="/explore" className="hover:underline">Floor Explorer</Link></li>
                <li><Link to="/qr/MP-QR-ENTRANCE" className="hover:underline">QR Entrance Totem</Link></li>
                <li><Link to="/assistance" className="hover:underline">Wheelchair Escort</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-ink">
                Patient Services
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                <li><Link to="/departments" className="hover:underline">Departments</Link></li>
                <li><Link to="/doctors" className="hover:underline">Specialist Directory</Link></li>
                <li><Link to="/appointments/book" className="hover:underline">Book Visit</Link></li>
                <li><Link to="/queue" className="hover:underline">Queue Status</Link></li>
                <li><Link to="/emergency" className="font-semibold text-emergency hover:underline">Emergency Protocol</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-ink">
                Portal &amp; Staff
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                <li><Link to="/portal" className="hover:underline">Patient Dashboard</Link></li>
                <li><Link to="/appointments" className="hover:underline">My Appointments</Link></li>
                <li><Link to="/login" className="hover:underline">Patient Sign In</Link></li>
                <li><Link to="/admin/login" className="hover:underline">Admin Console</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-champagne-border bg-ivory/70 py-4 text-xs text-ink">
          <div className="mx-auto flex max-w-editorial flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
            <span>© {new Date().getFullYear()} MEDIPATH — Aurelia Pavilion (Sample Campus Model)</span>
            <span>Outpatient 07:00 – 21:00 · Emergency Trauma 24/7</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Friendly Quick Navigation Bar */}
      <nav
        aria-label="Mobile quick wayfinding bar"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-champagne-border bg-surface md:hidden"
      >
        {mobileDockItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium ${
                  isActive ? 'bg-teal-deep text-white font-semibold' : 'text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
