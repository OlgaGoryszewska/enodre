import type { Metadata } from "next";
import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { MotionConfig } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://enodre.com"),
  title: {
    default: "Enodre — Digital workflows for growing businesses",
    template: "%s | Enodre",
  },
  description:
    "We design and build digital workflows that turn paper trails and spreadsheets into clear, working systems.",
  icons: {
    icon: [
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/icon1.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <MotionConfig reducedMotion="user">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-black/10 py-8">
            <div className="shell flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} Enodre</p>
              <div className="flex items-center gap-4">
                <p>Clear systems for complex work.</p>
                <Link
                  href="/login"
                  aria-label="Admin"
                  className="ml-auto text-accent transition hover:opacity-70 sm:ml-0"
                >
                  <DoorOpen className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </footer>
        </MotionConfig>
      </body>
    </html>
  );
}
