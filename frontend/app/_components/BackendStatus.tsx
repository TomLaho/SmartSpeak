"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BackendState = "loading" | "online" | "offline";

interface BackendStatusProps {
  readonly className?: string;
}

export default function BackendStatus({ className }: BackendStatusProps) {
  const [status, setStatus] = useState<BackendState>("loading");
  const [message, setMessage] = useState("Checking backend connectivity…");

  const checkHealth = useCallback(async () => {
    setStatus("loading");
    setMessage("Checking backend connectivity…");
    try {
      const response = await fetch("/api/health");
      if (!response.ok) {
        throw new Error("Health check failed");
      }
      const payload = (await response.json()) as { message?: string };
      setStatus("online");
      setMessage(payload.message ?? "SmartSpeak backend is running");
    } catch (error) {
      console.warn("Backend health check failed", error);
      setStatus("offline");
      setMessage("Backend not reachable. SmartSpeak will use local fallbacks.");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const { badgeClass, icon } = useMemo(() => {
    if (status === "online") {
      return {
        badgeClass: "bg-emerald-500 text-white",
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
      };
    }
    if (status === "offline") {
      return {
        badgeClass: "bg-red-500 text-white",
        icon: <ServerCrash className="h-4 w-4" aria-hidden />,
      };
    }
    return {
      badgeClass: "bg-primary/80 text-white animate-pulse-soft",
      icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden />,
    };
  }, [status]);

  return (
    <Card
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-elevated backdrop-blur lg:w-fit",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold", badgeClass)}>
          {icon}
          {status === "loading" ? "Checking" : status === "online" ? "Online" : "Offline"}
        </span>
        <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => void checkHealth()}
        className="mt-2 flex items-center gap-2 text-xs font-medium lg:mt-0"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Re-check
      </Button>
    </Card>
  );
}
