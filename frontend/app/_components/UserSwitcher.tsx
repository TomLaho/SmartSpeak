"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
      <nav className="hidden items-center gap-3 text-sm font-medium text-muted-foreground md:flex">
        <Link href="/" className="transition hover:text-foreground">
          Dashboard
        </Link>
        <Link href="/history" className="transition hover:text-foreground">
          History
        </Link>
      </nav>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Enter email or user id"
          className="h-9 w-48"
        />
        <Button type="submit" size="sm" variant="outline">
          {userId ? "Update" : "Save"}
        </Button>
      </form>
    </div>
  );
}
