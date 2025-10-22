"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { History, LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalUser } from "@/lib/hooks/useLocalUser";

export function UserSwitcher() {
  const { userId, setUserId } = useLocalUser();
  const [draft, setDraft] = useState(userId);

  useEffect(() => {
    setDraft(userId);
  }, [userId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserId(draft.trim());
  };

  return (
    <div className="flex items-center gap-2">
      <nav
        aria-label="Primary"
        className="hidden items-center gap-3 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur md:flex"
      >
        <Link href="/" className="flex items-center gap-1 transition hover:text-foreground">
          <UserRound className="h-3.5 w-3.5" aria-hidden /> Dashboard
        </Link>
        <span aria-hidden className="h-4 w-px bg-border" />
        <Link href="/history" className="flex items-center gap-1 transition hover:text-foreground">
          <History className="h-3.5 w-3.5" aria-hidden /> History
        </Link>
      </nav>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 shadow-sm backdrop-blur"
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Save analyses with your email"
          className="h-9 w-48 border-none bg-transparent text-sm focus-visible:ring-0"
        />
        <Button type="submit" size="sm" variant="default" className="gap-1 text-xs font-semibold">
          <LogIn className="h-3.5 w-3.5" aria-hidden />
          {userId ? "Update" : "Save"}
        </Button>
      </form>
    </div>
  );
}
