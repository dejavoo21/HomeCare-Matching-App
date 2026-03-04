import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { ProfessionalDashboard } from './pages/ProfessionalDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { UserRole } from './types/index';
import './App.css';

interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ element, allowedRoles }: ProtectedRouteProps) {
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

  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case UserRole.CLIENT:
      return <ClientDashboard />;
    case UserRole.NURSE:
    case UserRole.DOCTOR:
      return <ProfessionalDashboard />;
    case UserRole.ADMIN:
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" />;
  }
}

export function App() {
  return (
    <RealTimeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute element={<DashboardRouter />} />}
          />
          <Route
            path="/create-request"
            element={
              <ProtectedRoute
                element={<CreateRequestPage />}
                allowedRoles={[UserRole.CLIENT]}
              />
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/unauthorized" element={<div>Access Denied</div>} />
        </Routes>
      </Router>
    </RealTimeProvider>
  );
}

export default App;
