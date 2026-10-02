import type { Metadata } from "next";

const title = "Enodre — AI-arbeidsflytsystemer og AI-kodeaudit";
const description =
  "Enodre: AI-drevne arbeidsflytsystemer for driftstunge bedrifter, og AI-kodeaudit for produkter som har vokst fra koden sin.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/no",
    languages: {
      en: "/",
      pl: "/pl",
      no: "/no",
    },
  },
  openGraph: {
    type: "website",
    url: "/no",
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

export default function NoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
