import {
  Activity,
  Building2,
  CalendarCheck,
  Compass,
  FileClock,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Menu,
  Moon,
  QrCode,
  Route,
  Settings,
  ShieldAlert,
  Stethoscope,
  Sun,
  Users,
  Clock,
  GitBranch,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

const adminNavGroups = [
  {
    group: 'Operations',
    items: [
      { to: '/admin', label: 'Overview Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/appointments', label: 'Appointments', icon: CalendarCheck },
      { to: '/admin/queue', label: 'Queue Control', icon: Activity },
      { to: '/admin/service-requests', label: 'Assistance Requests', icon: HelpCircle },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    group: 'Clinical Catalog',
    items: [
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
      { to: '/admin/schedules', label: 'Doctor Schedules', icon: Clock },
    ],
  },
  {
    group: '3D Spatial Studio',
    items: [
      { to: '/admin/map-editor', label: '3D / 2D Map Editor', icon: MapIcon },
      { to: '/admin/buildings', label: 'Buildings', icon: Building2 },
      { to: '/admin/floors', label: 'Floors & SVG Plans', icon: Layers },
      { to: '/admin/destinations', label: 'Destinations', icon: MapPin },
      { to: '/admin/nodes', label: 'Navigation Nodes', icon: GitBranch },
      { to: '/admin/pathways', label: 'Pathway Edges', icon: Route },
      { to: '/admin/qr-checkpoints', label: 'QR Checkpoints', icon: QrCode },
    ],
  },
  {
    group: 'Governance',
    items: [
      { to: '/admin/patients', label: 'Patients', icon: Users },
      { to: '/admin/users', label: 'Users & Roles', icon: ShieldAlert },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileClock },
      { to: '/admin/settings', label: 'Hospital Settings', icon: Settings },
    ],
  },
];

export function AdminLayout({ children }: { children?: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const clearSession = useAppStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDark = theme === 'dark';

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== 'admin' && user.role !== 'hospital_staff') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ivory p-6 text-center text-ink">
        <div className="max-w-md rounded-architectural border border-champagne-border bg-surface p-8">
          <h1 className="font-display text-xl font-semibold text-ink">
            Staff or Administrator Access Required
          </h1>
          <p className="mt-2 text-sm text-ink">
            Your signed-in account ({user.email}) is registered as a patient. Please switch to an
            authorized staff or administrator credential to open the Operations Console.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center rounded-architectural border border-champagne-border bg-ivory px-4 text-sm font-medium text-ink"
            >
              Return to Public Site
            </Link>
            <button
              type="button"
              onClick={() => {
                clearSession();
                navigate('/admin/login');
              }}
              className="inline-flex min-h-[44px] items-center rounded-architectural bg-teal-deep px-4 text-sm font-medium text-white"
            >
              Sign In as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0D232A] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link to="/admin" className="flex items-center gap-2.5">
          <Compass className="h-5 w-5 text-champagne" aria-hidden="true" />
          <div>
            <span className="block font-display text-sm font-bold tracking-[0.14em] text-white">
              MEDIPATH OPS
            </span>
            <span className="block text-[11px] text-white/75">Aurelia Pavilion Console</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close admin sidebar"
          className="rounded p-1 text-white/80 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Admin sidebar navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {adminNavGroups.map((group) => (
          <div key={group.group}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-champagne">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-[38px] items-center gap-2.5 rounded-architectural px-3 text-sm transition ${
                          isActive
                            ? 'bg-teal-forest font-semibold text-white'
                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-85" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs">
        <p className="truncate font-medium text-white">{user.fullName}</p>
        <p className="mt-0.5 truncate uppercase tracking-wider text-champagne">{user.role}</p>
        <button
          type="button"
          onClick={() => {
            clearSession();
            navigate('/admin/login');
          }}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded border border-white/25 py-2 text-xs font-medium text-white hover:bg-white/10"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ivory text-ink">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-champagne-border lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 shrink-0 shadow-xl">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/45"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-champagne-border bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded border border-champagne-border text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">
              Hospital Operations &amp; Spatial Control
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-pressed={isDark}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded border border-champagne-border bg-ivory px-2.5 text-xs font-medium text-ink hover:border-ink"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
            </button>
            <Link
              to="/navigate"
              className="inline-flex min-h-[36px] items-center rounded border border-champagne-border px-3 text-xs font-medium text-ink hover:bg-champagne-soft"
            >
              Public 3D View →
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
