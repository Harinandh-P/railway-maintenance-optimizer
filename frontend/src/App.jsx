import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { OperatorDashboard } from './pages/OperatorDashboard';
import { PipelineRunner } from './pages/PipelineRunner';
import { FinalBlockPlan } from './pages/FinalBlockPlan';
import { Phase1Results } from './pages/Phase1Results';
import { Phase2Results } from './pages/Phase2Results';
import { Phase3Results } from './pages/Phase3Results';
import { MaintenanceRequests } from './pages/MaintenanceRequests';
import { TrainMaster } from './pages/TrainMaster';
import { TrainRoutes } from './pages/TrainRoutes';
import { StationKmMapping } from './pages/StationKmMapping';
import { Corridors } from './pages/Corridors';
import { Workers } from './pages/Workers';
import { Equipment } from './pages/Equipment';
import { MaintenanceHistory } from './pages/MaintenanceHistory';
import { AuditLog } from './pages/AuditLog';

// Role Guard for Admin-only routes
const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/operator" replace />;
  }
  return children;
};

const ProtectedLayout = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div style={{ color: 'white', padding: '40px' }}>Loading Portal...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const defaultRedirect = isAdmin ? '/admin' : '/operator';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* Default entry point based on role */}
          <Route path="/" element={<Navigate to={defaultRedirect} replace />} />

          {/* OPERATOR ROUTES (Engineers) */}
          <Route path="/operator" element={<OperatorDashboard activeTab="overview" />} />
          <Route path="/operator/requests" element={<OperatorDashboard activeTab="requests" />} />
          <Route path="/operator/slots" element={<OperatorDashboard activeTab="slots" />} />

          {/* ADMIN ROUTES (Railway Control Officers) */}
          <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/pipeline" element={<AdminRoute><PipelineRunner /></AdminRoute>} />
          <Route path="/final-plan" element={<AdminRoute><FinalBlockPlan /></AdminRoute>} />
          <Route path="/phase1-results" element={<AdminRoute><Phase1Results /></AdminRoute>} />
          <Route path="/phase2-results" element={<AdminRoute><Phase2Results /></AdminRoute>} />
          <Route path="/phase3-results" element={<AdminRoute><Phase3Results /></AdminRoute>} />
          <Route path="/requests" element={<AdminRoute><MaintenanceRequests /></AdminRoute>} />
          <Route path="/train-master" element={<AdminRoute><TrainMaster /></AdminRoute>} />
          <Route path="/train-routes" element={<AdminRoute><TrainRoutes /></AdminRoute>} />
          <Route path="/station-km" element={<AdminRoute><StationKmMapping /></AdminRoute>} />
          <Route path="/corridors" element={<AdminRoute><Corridors /></AdminRoute>} />
          <Route path="/workers" element={<AdminRoute><Workers /></AdminRoute>} />
          <Route path="/equipment" element={<AdminRoute><Equipment /></AdminRoute>} />
          <Route path="/history" element={<AdminRoute><MaintenanceHistory /></AdminRoute>} />
          <Route path="/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
        </Routes>
      </main>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
