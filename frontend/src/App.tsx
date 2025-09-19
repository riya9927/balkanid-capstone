import React, { useEffect, useState } from "react";
import Upload from "./components/Upload";
import UserFiles from "./components/UserFiles";
import AdminPanel from "./components/AdminPanel";
import Search from "./components/Search";
import Stats from "./components/Stats";
import { useRealtime } from "./hooks/useRealtime";

export default function App() {
  const [username, setUsername] = useState<string>("");
  const [mode, setMode] = useState<"user" | "admin">("user");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  useRealtime((msg) => {
    // optional global toast for uploads/downloads
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

  return (
    <div className="container">
      <header className="header">
        <h1>BalkanID — File Manager</h1>
        <div>
          <input
            placeholder="username (e.g. alice)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-sm"
          />
          <button onClick={saveUsername} className="btn-sm">Save</button>
          <button onClick={() => setMode("user")} className="btn-sm">User Mode</button>
          <button onClick={() => setMode("admin")} className="btn-sm">Admin Mode</button>
        </div>
      </header>

      {message && <div className="toast">{message}</div>}

      <main>
        {mode === "user" ? (
          <>
            <section className="card">
              <h2>Upload</h2>
              <Upload onDone={() => { /* optional refresh */ }} />
            </section>

            <section className="card">
              <h2>Your Files</h2>
              <UserFiles />
            </section>
          </>
        ) : (
          <section className="card">
            <AdminPanel />
          </section>
        )}

        <section className="card">
          <Search />
        </section>

        <section className="card">
          <Stats />
        </section>
      </main>

      <footer className="footer">
        Minimal frontend — connected to {import.meta.env.VITE_API_URL || "http://localhost:8080"}
      </footer>
    </div>
  );
}
