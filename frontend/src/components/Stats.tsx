import React, { useEffect, useState } from "react";
import api from "../api";

export default function Stats() {
  const [global, setGlobal] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchGlobal();
    fetchUser();
  }, []);

  const fetchGlobal = async () => {
    try {
      const res = await api.get("/storage/stats");
      setGlobal(res.data);
    } catch {}
  };

  const fetchUser = async () => {
    try {
      const res = await api.get("/stats");
      setUser(res.data);
    } catch {}
  };

  return (
    <div>
      <h3>Storage Statistics</h3>
      <div style={{ display: "flex", gap: 20 }}>
        <div className="card" style={{ flex: 1 }}>
          <h4>Global</h4>
          {global ? (
            <ul>
              <li>Original: {global.original_bytes} bytes</li>
              <li>Deduped: {global.deduped_bytes} bytes</li>
              <li>Savings: {global.savings_bytes} bytes ({global.savings_percent?.toFixed(2)}%)</li>
            </ul>
          ) : <div>Loading...</div>}
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h4>Per-user</h4>
          {user ? (
            <ul>
              <li>User: {user.username}</li>
              <li>Original: {user.original_bytes}</li>
              <li>Deduped: {user.deduped_bytes}</li>
              <li>Savings: {user.savings_bytes} ({user.savings_percent?.toFixed(2)}%)</li>
            </ul>
          ) : <div>Loading...</div>}
        </div>
      </div>
    </div>
  );
}
