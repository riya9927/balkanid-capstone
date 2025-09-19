import React from "react";
import { Link, useLocation } from "react-router-dom";

interface NavbarProps {
  username: string;
  userRole: "user" | "admin";
  onLogout: () => void;
}

export default function Navbar({ username, userRole, onLogout }: NavbarProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-link">

            <span className="brand-text">SecureVault</span>
          </Link>
        </div>

        <div className="navbar-menu">
          <Link 
            to="/" 
            className={`nav-link ${isActive("/") ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/upload" 
            className={`nav-link ${isActive("/upload") ? "active" : ""}`}
          >
            Upload
          </Link>
          <Link 
            to="/files" 
            className={`nav-link ${isActive("/files") ? "active" : ""}`}
          >
            Files
          </Link>
          <Link 
            to="/search" 
            className={`nav-link ${isActive("/search") ? "active" : ""}`}
          >
            Search
          </Link>
          <Link 
            to="/statistics" 
            className={`nav-link ${isActive("/statistics") ? "active" : ""}`}
          >
            Statistics
          </Link>
          {userRole === "admin" && (
            <Link 
              to="/admin" 
              className={`nav-link ${isActive("/admin") ? "active" : ""}`}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{username}</span>
            <span className={`user-role ${userRole}`}>{userRole}</span>
          </div>
          <button onClick={onLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          background: white;
          border-bottom: 1px solid var(--secondary-200);
          box-shadow: var(--shadow-sm);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .navbar-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          text-decoration: none;
          color: var(--secondary-800);
          font-weight: 700;
          font-size: 1.25rem;
        }

        .brand-icon {
          font-size: 1.5rem;
        }

        .brand-text {
          background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .navbar-menu {
          display: flex;
          align-items: center;
          gap: var(--space-6);
        }

        .nav-link {
          text-decoration: none;
          color: var(--secondary-600);
          font-weight: 500;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          position: relative;
        }

        .nav-link:hover {
          color: var(--primary-600);
          background-color: var(--primary-50);
        }

        .nav-link.active {
          color: var(--primary-600);
          background-color: var(--primary-100);
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: var(--primary-600);
          border-radius: 50%;
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: var(--space-1);
        }

        .user-name {
          font-weight: 600;
          color: var(--secondary-800);
          font-size: 0.875rem;
        }

        .user-role {
          font-size: 0.75rem;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .user-role.admin {
          background-color: var(--warning-100);
          color: var(--warning-700);
        }

        .user-role.user {
          background-color: var(--primary-100);
          color: var(--primary-700);
        }

        @media (max-width: 768px) {
          .navbar-container {
            padding: 0 var(--space-4);
          }

          .navbar-menu {
            gap: var(--space-4);
          }

          .nav-link {
            font-size: 0.875rem;
            padding: var(--space-2);
          }

          .user-info {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}