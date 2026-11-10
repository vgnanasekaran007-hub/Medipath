import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Button } from './components/ui/Primitives';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';

import {
  AdminAppointmentsPage,
  AdminDepartmentsPage,
  AdminDoctorsPage,
  AdminQueuePage,
  AdminSchedulesPage,
} from './pages/admin/AdminClinicalPages';
import {
  AdminAnnouncementsPage,
  AdminAuditLogsPage,
  AdminPatientsPage,
  AdminServiceRequestsPage,
  AdminSettingsPage,
  AdminUsersPage,
} from './pages/admin/AdminGovernancePages';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminMapEditorPage } from './pages/admin/AdminMapEditorPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import {
  AdminBuildingsPage,
  AdminDestinationsPage,
  AdminFloorsPage,
  AdminNodesPage,
  AdminPathwaysPage,
  AdminQrCheckpointsPage,
} from './pages/admin/AdminSpatialPages';

import { AssistanceRequestsPage } from './pages/public/AssistanceRequestsPage';
import { BookAppointmentPage } from './pages/public/BookAppointmentPage';
import { BookingConfirmationPage } from './pages/public/BookingConfirmationPage';
import { DepartmentDetailPage } from './pages/public/DepartmentDetailPage';
import { DepartmentsPage } from './pages/public/DepartmentsPage';
import { DoctorDetailPage } from './pages/public/DoctorDetailPage';
import { DoctorsPage } from './pages/public/DoctorsPage';
import { EmergencyPage } from './pages/public/EmergencyPage';
import { ExploreHospitalPage } from './pages/public/ExploreHospitalPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { FullMap2DPage } from './pages/public/FullMap2DPage';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { MyAppointmentsPage } from './pages/public/MyAppointmentsPage';
import { Navigate3DPage } from './pages/public/Navigate3DPage';
import { PatientDashboardPage } from './pages/public/PatientDashboardPage';
import { PatientProfilePage } from './pages/public/PatientProfilePage';
import { QueueTrackingPage } from './pages/public/QueueTrackingPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ServiceDetailPage } from './pages/public/ServiceDetailPage';
import { ServicesPage } from './pages/public/ServicesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
        Destination Not Found
      </h1>
      <p className="mt-2 text-sm text-ink">
        That campus route or page does not exist. Return to the main concourse or launch 3D wayfinding.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/"><Button variant="primary">Home Concourse</Button></Link>
        <Link to="/navigate"><Button variant="outline">3D Navigator</Button></Link>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Admin Authentication */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Admin Operations Shell (19 operational routes) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="departments" element={<AdminDepartmentsPage />} />
          <Route path="doctors" element={<AdminDoctorsPage />} />
          <Route path="schedules" element={<AdminSchedulesPage />} />
          <Route path="appointments" element={<AdminAppointmentsPage />} />
          <Route path="queue" element={<AdminQueuePage />} />
          <Route path="buildings" element={<AdminBuildingsPage />} />
          <Route path="floors" element={<AdminFloorsPage />} />
          <Route path="map-editor" element={<AdminMapEditorPage />} />
          <Route path="destinations" element={<AdminDestinationsPage />} />
          <Route path="nodes" element={<AdminNodesPage />} />
          <Route path="pathways" element={<AdminPathwaysPage />} />
          <Route path="qr-checkpoints" element={<AdminQrCheckpointsPage />} />
          <Route path="patients" element={<AdminPatientsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="service-requests" element={<AdminServiceRequestsPage />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Public Patient & Visitor Portal */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExploreHospitalPage />} />
          <Route path="/navigate" element={<Navigate3DPage />} />
          <Route path="/map-2d" element={<FullMap2DPage />} />
          <Route path="/qr/:code" element={<Navigate3DPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:slug" element={<DepartmentDetailPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:slug" element={<DoctorDetailPage />} />
          <Route path="/appointments/book" element={<BookAppointmentPage />} />
          <Route path="/appointments/confirmation/:id" element={<BookingConfirmationPage />} />
          <Route path="/appointments" element={<MyAppointmentsPage />} />
          <Route path="/queue" element={<QueueTrackingPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/portal" element={<PatientDashboardPage />} />
          <Route path="/portal/profile" element={<PatientProfilePage />} />
          <Route path="/assistance" element={<AssistanceRequestsPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </MotionConfig>
  );
}

