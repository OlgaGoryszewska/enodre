import type { Metadata } from "next";
import { BialyLotosShowcase } from "@/components/products/BialyLotosShowcase";

export const metadata: Metadata = {
  title: "Biały Lotos",
  description:
    "A gold lotus mark, a content system built from six data modules, and a live Next.js site — the full build for a cosmetology salon in Ciechanów, Poland, from first sketch to Vercel deploy.",
};

export default function BialyLotosPage() {
  return <BialyLotosShowcase />;
}
