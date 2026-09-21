import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
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
          <SiteFooter />
        </MotionConfig>
      </body>
    </html>
  );
}
