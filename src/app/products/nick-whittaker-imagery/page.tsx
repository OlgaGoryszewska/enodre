import type { Metadata } from "next";
import { NickWhittakerShowcase } from "@/components/products/NickWhittakerShowcase";

export const metadata: Metadata = {
  title: "Nick Whittaker Imagery",
  description:
    "A brand-to-checkout print storefront for an ocean and water photographer — design system, Supabase + Stripe commerce, and Next.js 16 built end to end.",
  alternates: { canonical: "/products/nick-whittaker-imagery" },
  openGraph: {
    title: "Nick Whittaker Imagery | Enodre",
    description:
      "A brand-to-checkout print storefront for an ocean and water photographer — design system, Supabase + Stripe commerce, and Next.js 16 built end to end.",
    url: "/products/nick-whittaker-imagery",
  },
};

export default function NickWhittakerImageryPage() {
  return <NickWhittakerShowcase />;
}
