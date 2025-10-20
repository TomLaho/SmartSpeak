"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function BackendStatus() {
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [message, setMessage] = useState("Checking backend…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Status error"))))
      .then((j) => {
        setStatus("online");
        setMessage(j.message ?? "Backend reachable");
      })
      .catch(() => {
        setStatus("offline");
        setMessage("Backend not reachable. Using local fallbacks.");
      });
  }, []);

  return (
    <Alert className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{message}</span>
      <Badge className={status === "online" ? "bg-emerald-600/10 text-emerald-600" : status === "offline" ? "bg-destructive/10 text-destructive" : ""}>
        {status === "loading" ? "Checking" : status === "online" ? "Online" : "Offline"}
      </Badge>
    </Alert>
  );
}
