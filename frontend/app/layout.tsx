import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./globals.css";
import { UserSwitcher } from "./_components/UserSwitcher";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SmartSpeak — AI-powered speech coach",
  description: "Record, analyse, and improve your public speaking with realtime insights.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background/80 font-sans text-foreground antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-hero-grid opacity-70" aria-hidden />
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
              <Link href="/" className="group flex items-center gap-2 text-xl font-semibold tracking-tight">
                <span className="rounded-full bg-gradient-to-r from-primary to-accent p-2 text-background shadow-glow transition-transform group-hover:scale-105">
                  SS
                </span>
                <div className="flex flex-col">
                  <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    SmartSpeak
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">AI-powered speaking coach</span>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <nav className="hidden items-center gap-3 text-sm font-medium text-muted-foreground md:flex">
                  <Link href="/" className="transition hover:text-foreground">Product</Link>
                  <Link href="/history" className="transition hover:text-foreground">History</Link>
                </nav>
                <Button asChild size="sm" variant="ghost" className="md:hidden">
                  <Link href="/history">History</Link>
                </Button>
                <Button asChild variant="outline" className="hidden items-center gap-1 text-sm font-medium md:flex">
                  <Link href="https://github.com/" target="_blank" rel="noreferrer">
                    GitHub <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <UserSwitcher />
              </div>
            </div>
          </header>
          <main className="relative flex-1">{children}</main>
          <footer className="border-t border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl">
                © {new Date().getFullYear()} SmartSpeak. Crafted to help you present with clarity, confidence, and charisma.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-wide">
                <Link href="https://nextjs.org" className="transition hover:text-foreground">
                  Built with Next.js
                </Link>
                <Link href="https://ui.shadcn.com" className="transition hover:text-foreground">
                  UI components by shadcn/ui
                </Link>
                <Link href="https://openai.com" className="transition hover:text-foreground">
                  Powered by OpenAI
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
