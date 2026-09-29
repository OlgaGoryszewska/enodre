import type { Metadata } from "next";

const title = "Enodre — Systemy AI i Audyty Kodu AI";
const description =
  "Budujemy systemy przepływu pracy oparte na AI dla firm o rozbudowanych operacjach oraz przeprowadzamy audyty kodu AI dla produktów, które przerosły tempo, w jakim powstały.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: {
    canonical: "/pl",
    languages: {
      en: "/",
      pl: "/pl",
    },
  },
  openGraph: {
    type: "website",
    url: "/pl",
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

export default function PlLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
