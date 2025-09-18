import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import Upload from "./components/Upload";
import FileManager from "./components/FileManager";
import AdminPanel from "./components/AdminPanel";
import Search from "./components/Search";
import Statistics from "./components/Statistics";
import Login from "./components/Login";
import "./styles/global.css";

export default function App() {
  const [username, setUsername] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    const stored = localStorage.getItem("username");
    const role = localStorage.getItem("userRole") as "user" | "admin" || "user";
    if (stored) {
      setUsername(stored);
      setUserRole(role);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (user: string, role: "user" | "admin" = "user") => {
    setUsername(user);
    setUserRole(role);
    setIsAuthenticated(true);
    localStorage.setItem("username", user);
    localStorage.setItem("userRole", role);
  };

  const handleLogout = () => {
    setUsername("");
    setUserRole("user");
    setIsAuthenticated(false);
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <Navbar 
          username={username} 
          userRole={userRole} 
          onLogout={handleLogout} 
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="/search" element={<Search />} />
            <Route path="/statistics" element={<Statistics />} />
            {userRole === "admin" && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}