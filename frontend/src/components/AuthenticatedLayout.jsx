import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import FloatingAIChat from './FloatingAIChat';

export default function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-[#FFF7F7] flex flex-col relative">
      {/* Shared Navigation */}
      <Navbar />

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>

      {/* Persistent Floating AI Chat (Mounted once across all authenticated routes) */}
      <FloatingAIChat />
    </div>
  );
}
