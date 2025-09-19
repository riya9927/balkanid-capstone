import axios from "axios";

const base = import.meta.env.VITE_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: base,
  timeout: 120000,
});

api.interceptors.request.use((cfg) => {
  const username = localStorage.getItem("username");
  if (username) {
    cfg.headers = cfg.headers || {};
    (cfg.headers as any)["X-User"] = username;  
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response) {
      const status = err.response.status;
      if (status === 429) {
        alert("Rate limit exceeded. Slow down your requests.");
      } else if (status === 403) {
        const data = err.response.data;
        if (data && data.error && data.error.toLowerCase().includes("quota")) {
          alert("Storage quota exceeded: " + (data.error || ""));
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
