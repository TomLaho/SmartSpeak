"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";

export function UserSwitcher() {
  const { isLoaded, isSignedIn, userId, strategy, signIn, signOut, setLocalUserId, openUserProfile } = useAuth();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (strategy === "local" && userId) {
      setDraft(userId);
    }
  }, [strategy, userId]);

  const label = useMemo(() => {
    if (!isLoaded) return "Loading user";
    if (strategy === "clerk" && userId) return "Clerk session";
    if (userId) return "Local session";
    return "No session";
  }, [isLoaded, strategy, userId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setLocalUserId(draft.trim());
  };

  if (!isLoaded) {
    return <Skeleton className="h-10 w-48 rounded-full" />;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold text-foreground">
            {userId ?? "Sign in to save progress"}
          </span>
        </div>
      </div>
      {isSignedIn ? (
        <div className="flex items-center gap-1">
          {openUserProfile && (
            <Button size="sm" variant="ghost" onClick={openUserProfile} className="text-xs">
              Profile
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void signOut()}
            className="gap-1 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Email for history"
            className="h-9 w-40 border-none bg-transparent text-sm focus-visible:ring-0"
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1 text-xs font-semibold"
            onClick={() => signIn()}
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            Sign in
          </Button>
        </form>
      )}
    </div>
  );
}
