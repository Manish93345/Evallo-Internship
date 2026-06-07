import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { TeamsPage } from './pages/TeamsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';

/**
 * Top-level route tree.
 *
 *   /login, /register         — public-only (kicks signed-in users to /)
 *   /                         — Dashboard (stats + recent activity)
 *   /employees                — Employees CRUD
 *   /teams                    — Teams CRUD + member management
 *   /audit-logs               — Filterable audit trail (OWNER only)
 *
 * Provider order:
 *   ErrorBoundary
 *     → QueryClient
 *       → BrowserRouter
 *         → ThemeProvider     (so the recovery screen also picks up theme)
 *           → ToastProvider
 *             → AuthProvider
 *
 * Theme is mounted high so any persisted preference is applied before the
 * first paint of the shell. Toast lives below Theme because toasts need
 * to read the theme to style their backdrop blur properly.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <Routes>
                  <Route element={<PublicOnlyRoute />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Route>

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppShell />}>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/employees" element={<EmployeesPage />} />
                      <Route path="/teams" element={<TeamsPage />} />
                      <Route path="/audit-logs" element={<AuditLogsPage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
