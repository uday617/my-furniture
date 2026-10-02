import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function ActivityTracker() {
  const location = useLocation();

  useEffect(() => {
    const startedAt = Date.now();
    let reported = false;
    const reportActivity = () => {
      if (reported) return;
      reported = true;
      const durationSeconds = Math.min(1800, Math.floor((Date.now() - startedAt) / 1000));
      if (durationSeconds < 3) return;
      const params = new URLSearchParams(location.search);
      const query = location.pathname === "/neuheiten" ? params.get("q") || "" : "";
      fetch(`${apiUrl}/account/activity`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: location.pathname,
          query,
          durationSeconds,
        }),
      }).catch(error => {
        console.error("Could not send signed-in browsing activity.", error);
      });
    };
    window.addEventListener("pagehide", reportActivity);
    return () => {
      window.removeEventListener("pagehide", reportActivity);
      reportActivity();
    };
  }, [location.pathname, location.search]);

  return null;
}
