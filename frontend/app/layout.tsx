import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
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
      <body className={`${inter.variable} bg-background font-sans text-foreground antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border bg-muted/40">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                SmartSpeak
              </Link>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm" className="md:hidden">
                  <Link href="/history">History</Link>
                </Button>
                <UserSwitcher />
              </div>
            </div>
          </header>
          <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/20">{children}</main>
          <footer className="border-t border-border bg-muted/40">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} SmartSpeak. Level up your speaking confidence.</p>
              <div className="flex gap-4">
                <Link href="https://nextjs.org" className="hover:text-foreground">
                  Next.js
                </Link>
                <Link href="https://ui.shadcn.com" className="hover:text-foreground">
                  shadcn/ui
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
