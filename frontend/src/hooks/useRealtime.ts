import { useEffect } from "react";

export function useRealtime(onMessage: (data: any) => void) {
  useEffect(() => {
    const url = (import.meta.env.VITE_API_URL || "http://localhost:8080") + "/realtime";
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        console.error("Invalid SSE message", e.data);
      }
    };

    es.onerror = (err) => {
      console.error("SSE error", err);
      // try reconnect on error (EventSource handles retries by default)
    };

    return () => es.close();
  }, [onMessage]);
}
