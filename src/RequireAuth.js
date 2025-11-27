// src/RequireAuth.js
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { socket } from "./socket";

export default function RequireAuth({ children }) {
  const [status, setStatus] = useState("checking"); // "checking" | "ok" | "no"

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatus("no");
      return;
    }

    const askServer = () => {
      socket.emit("verifyAdminToken", { token }, (res) => {
        if (res && res.valid) {
          setStatus("ok");
        } else {
          localStorage.removeItem("token");
          setStatus("no");
        }
      });
    };

    if (socket.connected) {
      askServer();
    } else {
      socket.once("connect", askServer);
    }

    const timeoutId = setTimeout(() => {
      setStatus((prev) => (prev === "checking" ? "no" : prev));
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  if (status === "checking") {
    return <div style={{ padding: 30 }}>Checking auth…</div>;
  }

  if (status === "no") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
