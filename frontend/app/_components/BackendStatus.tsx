"use client";
import { useEffect, useState } from "react";

export default function BackendStatus() {
  const [msg, setMsg] = useState("Checking backend…");
  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setMsg(j.message || "OK"))
      .catch(() => setMsg("Backend not reachable"));
  }, []);
  return <p className="text-sm text-gray-600">Backend: {msg}</p>;
}
