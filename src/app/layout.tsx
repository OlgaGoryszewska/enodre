import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingCta } from "@/components/FloatingCta";
import "./globals.css";

const title = {
  default: "Enodre — AI Workflow Systems & AI-Code Audits",
  template: "%s | Enodre",
};
const description =
  "Enodre: AI-powered workflow systems for operations-heavy businesses, and fixed-price AI-code audits for products that outgrew how fast they were built.";

export const metadata: Metadata = {
  metadataBase: new URL("https://enodre.com"),
  title,
  description,
  keywords: [
    "custom software development",
    "MVP development",
    "web development agency",
    "vertical SaaS development",
    "mobile app development",
    "UI UX design",
    "legacy system modernization",
    "fractional CTO",
  ],
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      pl: "/pl",
      no: "/no",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Enodre",
    title,
    description,
    images: [{ url: "/logo-border-enodre.png", width: 1230, height: 1278, alt: "Enodre" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/logo-border-enodre.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Enodre",
  url: "https://enodre.com",
  logo: "https://enodre.com/logo-border-enodre.png",
  description,
  founder: {
    "@type": "Person",
    name: "Olga",
  },
  sameAs: ["https://www.linkedin.com/company/enodre/"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <MotionConfig reducedMotion="user">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <FloatingCta />
        </MotionConfig>
      </body>
    </html>
  );
}
