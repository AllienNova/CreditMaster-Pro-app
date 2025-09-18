import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';
import AuthForm from '@/components/auth/AuthForm';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Upload from '@/pages/Upload';
import AIAnalysis from '@/pages/AIAnalysis';
import Disputes from '@/pages/Disputes';
import Reports from './pages/Reports';
import Improvement from './pages/Improvement';
import CreditAnalyticsDashboard from './pages/CreditAnalyticsDashboard';
import './App.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects authenticated users)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Placeholder components for pages not yet implemented
const CreditReports: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Credit Reports</h2>
    <p className="text-gray-600">Upload and manage your credit reports from all three bureaus.</p>
  </div>
);

const Strategies: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Advanced Strategies</h2>
    <p className="text-gray-600">Access all 28 advanced credit repair strategies.</p>
  </div>
);

const Documents: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Documents</h2>
    <p className="text-gray-600">View and download generated dispute letters and documents.</p>
  </div>
);

const Progress: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Progress Tracking</h2>
    <p className="text-gray-600">Monitor your credit improvement progress over time.</p>
  </div>
);

const Settings: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
    <p className="text-gray-600">Manage your account settings and preferences.</p>
  </div>
);

const Billing: React.FC = () => (
  <div className="text-center py-12">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Billing & Subscription</h2>
    <p className="text-gray-600">Manage your subscription and billing information.</p>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthForm />
              </PublicRoute>
            }
          />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="credit-reports" element={<CreditReports />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="ai-analysis" element={<AIAnalysis />} />
            <Route path="strategies" element={<Strategies />} />
            <Route path="reports" element={<Reports />} />
            <Route path="documents" element={<Documents />} />
            <Route path="progress" element={<Progress />} />
            <Route path="improvement" element={<Improvement />} />
            <Route path="analytics" element={<CreditAnalyticsDashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="settings" element={<Settings />} />
            <Route path="billing" element={<Billing />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Global Toast Notifications */}
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
