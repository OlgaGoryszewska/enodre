import type { Metadata } from "next";
import { NickWhittakerShowcase } from "@/components/products/NickWhittakerShowcase";

export const metadata: Metadata = {
  title: "Nick Whittaker Imagery",
  description:
    "A brand-to-checkout print storefront for an ocean and water photographer — design system, Supabase + Stripe commerce, and Next.js 16 built end to end.",
};

export default function NickWhittakerImageryPage() {
  return <NickWhittakerShowcase />;
}
