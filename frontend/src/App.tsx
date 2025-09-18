import React, { useState, useEffect } from "react";
import Upload from "./components/Upload";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [username, setUsername] = useState<string>("");
  const [mode, setMode] = useState<"user" | "admin">("user");

  useEffect(() => {
    // restore username from localStorage
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  const handleSaveUsername = () => {
    localStorage.setItem("username", username);
    alert(`Username saved as ${username}`);
  };
return (
    <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>BalkanID File System</h1>

      <div style={{ marginBottom: 20 }}>
        <label>
          Username:{" "}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: "5px", marginRight: "10px" }}
          />
        </label>
        <button onClick={handleSaveUsername}>Save</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setMode("user")}>User Mode</button>
        <button onClick={() => setMode("admin")} style={{ marginLeft: 10 }}>
          Admin Mode
        </button>
      </div>

      {mode === "user" ? <Upload onDone={() => console.log("Upload finished")} /> : <AdminPanel />}
    </div>
  );
}