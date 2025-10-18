import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div className="space-y-4">
        <span className="rounded-full border border-border bg-muted/60 px-4 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          Welcome to SmartSpeak
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Build conversational experiences faster.
        </h1>
        <p className="text-lg text-muted-foreground sm:max-w-2xl">
          This scaffold ships with Next.js 14, Tailwind CSS, and shadcn/ui so you can focus on
          crafting delightful voice-enabled interfaces.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="https://nextjs.org/docs">Read the docs</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="https://ui.shadcn.com">Explore shadcn/ui</Link>
        </Button>
      </div>
    </section>
  );
}
