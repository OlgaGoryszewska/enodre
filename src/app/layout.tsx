import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const title = {
  default: "Enodre — Digital workflows for growing businesses",
  template: "%s | Enodre",
};
const description =
  "We design and build digital workflows that turn paper trails and spreadsheets into clear, working systems.";

export const metadata: Metadata = {
  metadataBase: new URL("https://enodre.com"),
  title,
  description,
  keywords: [
    "custom software development",
    "MVP development",
    "web development agency",
    "SaaS development",
    "mobile app development",
    "UI UX design",
    "software development studio",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon0.svg", type: "image/svg+xml" },
      { url: "/icon1.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
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
        </MotionConfig>
      </body>
    </html>
  );
}
