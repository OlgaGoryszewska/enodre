import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
    icon: "/favicon.png",
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
        <header className="border-b border-black/10">
          <div className="shell flex h-20 items-center justify-between">
            <Link href="/">
              <Image
                src="/enodre-logo-full.svg"
                alt="Enodre"
                width={183}
                height={46}
                className="h-9 w-auto"
              />
            </Link>
            <nav aria-label="Primary navigation" className="flex gap-5 text-sm font-medium sm:gap-8">
              <Link className="nav-link" href="/services">Services</Link>
              <Link className="nav-link" href="/case-studies">Case studies</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/10 py-8">
          <div className="shell flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Enodre</p>
            <p>Clear systems for complex work.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
