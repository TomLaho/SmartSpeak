import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SmartSpeak",
  description: "SmartSpeak frontend scaffold",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-muted/40">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
              <span className="text-lg font-semibold">SmartSpeak</span>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border bg-muted/40">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 text-sm text-muted-foreground">
              <p>Build faster with shadcn/ui and Tailwind CSS.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
