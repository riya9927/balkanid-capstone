import React, { useState } from "react";

interface LoginProps {
  onLogin: (username: string, role: "user" | "admin") => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim(), role);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-icon">🔒</div>
          <h1 className="login-title">SecureVault</h1>
          <p className="login-subtitle">Secure File Storage & Management</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="form-select"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg login-btn">
            Sign In
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm text-secondary">
            Demo credentials: Use any username with User or Admin role
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-100) 100%);
          padding: var(--space-4);
        }

        .login-card {
          background: white;
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          padding: var(--space-10);
          width: 100%;
          max-width: 400px;
          border: 1px solid var(--secondary-200);
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .brand-icon {
          font-size: 3rem;
          margin-bottom: var(--space-4);
        }

        .login-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-2);
          background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          color: var(--secondary-600);
          font-size: 0.875rem;
        }

        .login-form {
          margin-bottom: var(--space-6);
        }

        .login-btn {
          width: 100%;
          margin-top: var(--space-2);
        }

        .login-footer {
          text-align: center;
          padding-top: var(--space-4);
          border-top: 1px solid var(--secondary-200);
        }

        @media (max-width: 480px) {
          .login-card {
            padding: var(--space-6);
          }
        }
      `}</style>
    </div>
  );
}