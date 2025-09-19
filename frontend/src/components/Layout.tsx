import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

interface LayoutProps {
  username: string;
  userRole: 'user' | 'admin';
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ username, userRole, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar username={username} userRole={userRole} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;