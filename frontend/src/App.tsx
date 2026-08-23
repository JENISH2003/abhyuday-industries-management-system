import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';

// Dashboard Layout Pages
import { Dashboard } from './pages/Dashboard';
import { Certificates } from './pages/Certificates';
import { Meetings } from './pages/Meetings';
import { Logs } from './pages/Logs';
import { UsersList } from './pages/Users';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { CategoryAdmin } from './pages/CategoryAdmin';
import { StabilityReminders } from './pages/StabilityReminders';
import { PersonalReminders } from './pages/PersonalReminders';

import { RootState } from './store';
import { ShieldAlert } from 'lucide-react';

// Role Guard Component
const RoleGuard: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

// Access Denied Fallback Screen
const AccessDenied: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-16 bg-card border border-border rounded-lg shadow-soft text-center select-none max-w-md mx-auto my-12 animate-in fade-in duration-200">
      <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
        <ShieldAlert size={26} />
      </div>
      <h3 className="text-md font-bold text-foreground">Access Denied</h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        Your current operator clearance role does not possess the permissions required to view this panel.
      </p>
      <Navigate to="/dashboard" replace={false} />
    </div>
  );
};

// NotFound Fallback Screen
const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center select-none">
      <h1 className="text-4xl font-extrabold text-foreground tracking-tight">404</h1>
      <p className="text-sm font-semibold text-muted-foreground mt-2">Compliance Workspace Not Found</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
        The workspace path requested does not exist or has been archived by the security administration.
      </p>
      <a
        href="/dashboard"
        className="mt-6 bg-brand hover:bg-brand-dark text-white font-semibold text-xs py-2 px-5 rounded-lg shadow-soft"
      >
        Return to Overview
      </a>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Route>

        {/* Private Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/categories" element={<CategoryAdmin />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/stability" element={<StabilityReminders />} />
          <Route path="/personal-reminders" element={<PersonalReminders />} />
          <Route path="/expiring" element={<Navigate to="/certificates?status=expiring_soon" replace />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/logs"
            element={
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <Logs />
              </RoleGuard>
            }
          />
          <Route
            path="/users"
            element={
              <RoleGuard allowedRoles={['super_admin', 'admin']}>
                <UsersList />
              </RoleGuard>
            }
          />

          {/* Super Admin Guarded Settings */}
          <Route
            path="/settings"
            element={
              <RoleGuard allowedRoles={['super_admin']}>
                <Settings />
              </RoleGuard>
            }
          />

          {/* 404 inside layout */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
export default App;
