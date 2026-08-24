import type { Metadata } from "next";
import { CeylonsHouseShowcase } from "@/components/products/CeylonsHouseShowcase";

export const metadata: Metadata = {
  title: "Ceylon's House",
  description:
    "A tropical luxury brand identity and website for a boutique hotel and rooftop restaurant in Hikkaduwa, Sri Lanka — from first logo concept to a live, deployed site.",
};

export default function CeylonsHousePage() {
  return <CeylonsHouseShowcase />;
}
