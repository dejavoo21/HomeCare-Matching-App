import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/index';
import RequirePermission from '../components/auth/RequirePermission';
import { PERMISSIONS } from '../lib/auth/permissions';

import { AdminShell } from '../layouts/AdminShell';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ClientDashboard } from '../pages/ClientDashboard';
import { CreateRequestPage } from '../pages/CreateRequestPage';
import { ClinicianVisitsPage } from '../pages/ClinicianVisitsPage';

import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminDispatchPage } from '../pages/AdminDispatchPage';
import { AdminRequestQueuePage } from '../pages/AdminRequestQueuePage';
import { AdminRequestDetailPage } from '../pages/AdminRequestDetailPage';
import { AdminSchedulingPage } from '../pages/AdminSchedulingPage';
import { AdminTeamPage } from '../pages/AdminTeamPage';
import { AdminAccessPage } from '../pages/AdminAccessPage';
import { AdminAuditPage } from '../pages/AdminAuditPage';
import { AdminAnalyticsPage } from '../pages/AdminAnalyticsPage';
import { AdminConnectedSystemsPage } from '../pages/AdminConnectedSystemsPage';
import { AdminReliabilityPage } from '../pages/AdminReliabilityPage';
import { AdminFhirPage } from '../pages/AdminFhirPage';
import { AdminSettingsPage } from '../pages/AdminSettingsPage';
import { AdminClinicianReviewPage } from '../pages/AdminClinicianReviewPage';
import { UnresolvedItemsPage } from '../pages/UnresolvedItemsPage';
import { EscalationHandlingPage } from '../pages/EscalationHandlingPage';
import { ReleaseReadinessPage } from '../pages/ReleaseReadinessPage';

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

function WithPermission({
  permission,
  element,
}: {
  permission: string;
  element: React.ReactElement;
}) {
  return <RequirePermission permission={permission}>{element}</RequirePermission>;
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
        <Route
          path="dashboard"
          element={<WithPermission permission={PERMISSIONS.DASHBOARD_READ} element={<AdminDashboardPage />} />}
        />
        <Route
          path="dispatch"
          element={<WithPermission permission={PERMISSIONS.DISPATCH_READ} element={<AdminDispatchPage />} />}
        />
        <Route
          path="requests"
          element={<WithPermission permission={PERMISSIONS.DISPATCH_READ} element={<AdminRequestQueuePage />} />}
        />
        <Route
          path="requests/:requestId"
          element={<WithPermission permission={PERMISSIONS.DISPATCH_READ} element={<AdminRequestDetailPage />} />}
        />
        <Route
          path="scheduling"
          element={<WithPermission permission={PERMISSIONS.SCHEDULING_READ} element={<AdminSchedulingPage />} />}
        />
        <Route
          path="team"
          element={<WithPermission permission={PERMISSIONS.TEAM_READ} element={<AdminTeamPage />} />}
        />
        <Route
          path="access"
          element={
            <WithPermission
              permission={PERMISSIONS.ACCESS_REQUESTS_READ}
              element={<AdminAccessPage />}
            />
          }
        />
        <Route path="access-requests" element={<Navigate to="/admin/access" replace />} />
        <Route
          path="audit"
          element={<WithPermission permission={PERMISSIONS.AUDIT_READ} element={<AdminAuditPage />} />}
        />
        <Route
          path="clinician-review"
          element={
            <WithPermission
              permission={PERMISSIONS.NOTES_REVIEW}
              element={<AdminClinicianReviewPage />}
            />
          }
        />
        <Route
          path="analytics"
          element={
            <WithPermission permission={PERMISSIONS.ANALYTICS_READ} element={<AdminAnalyticsPage />} />
          }
        />
        <Route
          path="unresolved-items"
          element={<WithPermission permission={PERMISSIONS.DASHBOARD_READ} element={<UnresolvedItemsPage />} />}
        />
        <Route
          path="escalations"
          element={<WithPermission permission={PERMISSIONS.DASHBOARD_READ} element={<EscalationHandlingPage />} />}
        />
        <Route
          path="release-readiness"
          element={<WithPermission permission={PERMISSIONS.DASHBOARD_READ} element={<ReleaseReadinessPage />} />}
        />
        <Route
          path="integrations"
          element={
            <WithPermission
              permission={PERMISSIONS.CONNECTED_SYSTEMS_READ}
              element={<AdminConnectedSystemsPage />}
            />
          }
        />
        <Route
          path="integrations/reliability"
          element={
            <WithPermission
              permission={PERMISSIONS.RELIABILITY_READ}
              element={<AdminReliabilityPage />}
            />
          }
        />
        <Route
          path="integrations/fhir"
          element={<WithPermission permission={PERMISSIONS.FHIR_READ} element={<AdminFhirPage />} />}
        />
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
