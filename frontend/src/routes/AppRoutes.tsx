import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/index';

import { AdminShell } from '../layouts/AdminShell';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ClientDashboard } from '../pages/ClientDashboard';
import { CreateRequestPage } from '../pages/CreateRequestPage';
import { ClinicianVisitsPage } from '../pages/ClinicianVisitsPage';

import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminDispatchPage } from '../pages/AdminDispatchPage';
import { AdminSchedulingPage } from '../pages/AdminSchedulingPage';
import { AdminTeamPage } from '../pages/AdminTeamPage';
import { AdminAccessPage } from '../pages/AdminAccessPage';
import { AdminAuditPage } from '../pages/AdminAuditPage';
import { AdminAnalyticsPage } from '../pages/AdminAnalyticsPage';
import { AdminConnectedSystemsPage } from '../pages/AdminConnectedSystemsPage';
import { AdminReliabilityPage } from '../pages/AdminReliabilityPage';
import { AdminFhirPage } from '../pages/AdminFhirPage';
import { AdminSettingsPage } from '../pages/AdminSettingsPage';

function ProtectedRoute({
  element,
  allowedRoles,
}: {
  element: React.ReactElement;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return element;
}

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case UserRole.CLIENT:
      return <ClientDashboard />;
    case UserRole.NURSE:
    case UserRole.DOCTOR:
      return <Navigate to="/clinician/visits" replace />;
    case UserRole.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={<ProtectedRoute element={<DashboardRouter />} />}
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            element={<AdminShell />}
            allowedRoles={[UserRole.ADMIN]}
          />
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="dispatch" element={<AdminDispatchPage />} />
        <Route path="scheduling" element={<AdminSchedulingPage />} />
        <Route path="team" element={<AdminTeamPage />} />
        <Route path="access" element={<AdminAccessPage />} />
        <Route path="access-requests" element={<Navigate to="/admin/access" replace />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="integrations" element={<AdminConnectedSystemsPage />} />
        <Route path="integrations/reliability" element={<AdminReliabilityPage />} />
        <Route path="integrations/fhir" element={<AdminFhirPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route
        path="/create-request"
        element={
          <ProtectedRoute
            element={<CreateRequestPage />}
            allowedRoles={[UserRole.CLIENT]}
          />
        }
      />

      <Route
        path="/clinician/visits"
        element={
          <ProtectedRoute
            element={<ClinicianVisitsPage />}
            allowedRoles={[UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN]}
          />
        }
      />

      <Route path="/unauthorized" element={<div>Access Denied</div>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
