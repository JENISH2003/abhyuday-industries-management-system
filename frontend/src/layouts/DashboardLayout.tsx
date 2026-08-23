import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { RootState } from '../store';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-250">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content viewport */}
      <div className="flex flex-col flex-grow h-screen overflow-hidden">
        {/* Dynamic header with 3-line toggle button for left panel */}
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        
        {/* Main nested route element */}
        <main className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
