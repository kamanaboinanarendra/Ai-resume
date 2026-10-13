import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIChatProvider } from './context/AIChatContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedLayout from './components/AuthenticatedLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MyResumesPage from './pages/MyResumesPage';
import TemplateGalleryPage from './pages/TemplateGalleryPage';
import ResumeBuilderPage from './pages/ResumeBuilderPage';
import EditResumePage from './pages/EditResumePage';
import AccountPage from './pages/AccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyResetCodePage from './pages/VerifyResetCodePage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ATSCheckerPage from './pages/ATSCheckerPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7F7] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin"></div>
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AIChatProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-reset-code" element={<VerifyResetCodePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Authenticated Application Routes (Wrapped with Navbar & Persistent Floating AI Assistant) */}
            <Route
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/templates" element={<TemplateGalleryPage />} />
              <Route path="/builder" element={<EditResumePage />} />
              <Route path="/edit-resume" element={<EditResumePage />} />
              <Route path="/builder/:resumeId" element={<ResumeBuilderPage />} />
              <Route path="/my-resumes" element={<MyResumesPage />} />
              <Route path="/ats-checker" element={<ATSCheckerPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AIChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
