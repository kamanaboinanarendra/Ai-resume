import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7F7] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium text-[#6B7280]">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
