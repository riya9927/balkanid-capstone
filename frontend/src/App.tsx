
import React, { useEffect, useState } from "react";
import Upload from "./components/Upload";
import UserFiles from "./components/UserFiles";
import AdminPanel from "./components/AdminPanel";
import Search from "./components/Search";
import Stats from "./components/Stats";
import { useRealtime } from "./hooks/useRealtime";
import { User, Settings, Grid, BarChart3, Upload as UploadIcon,Search as searchIcon, Shield } from "lucide-react";

export default function App() {
  const [username, setUsername] = useState<string>("");
  const [mode, setMode] = useState<"user" | "admin">("user");
  const [activeTab, setActiveTab] = useState<"files" | "statistics" | "admin" | "upload">("files");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  useRealtime((msg) => {
    if (msg.type === "download") {
      setMessage(`File ${msg.file_id} downloaded (${msg.count})`);
      setTimeout(() => setMessage(null), 3000);
    } else if (msg.type === "upload") {
      setMessage(`File ${msg.filename} uploaded`);
      setTimeout(() => setMessage(null), 3000);
    }
  });

  const saveUsername = () => {
    localStorage.setItem("username", username);
    alert("Saved username: " + username);
  };

  const tabs = [
    { id: "files", label: "Files", icon: Grid },
    { id: "statistics", label: "Statistics", icon: BarChart3 },
    { id: "admin", label: "Admin", icon: Shield },
    { id: "upload", label: "Upload", icon: UploadIcon },
    { id: "search", label: "Search", icon: searchIcon},
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SecureVault</h1>
                <p className="text-sm text-gray-500">Enterprise File Management</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* User menu */}
              <div className="flex items-center space-x-3">
                <input
                  placeholder="username (e.g. alice)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button 
                  onClick={saveUsername}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  user
                </span>
              </div>

              {/* Upload button */}
              <button 
                onClick={() => setActiveTab("upload")}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UploadIcon className="w-4 h-4" />
                <span>Upload</span>
              </button>

              {/* Settings */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Toast notification */}
      {message && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          {message}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "files" && <UserFiles />}
        {activeTab === "statistics" && <Stats />}
        {activeTab === "admin" && <AdminPanel />}
        {activeTab === "upload" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Upload onDone={() => setActiveTab("files")} />
          </div>
        )}
        {activeTab === "search" && <Search />}
      </main>
    </div>
  );
}