import type { Metadata } from "next";
import { FuelFloShowcase } from "@/components/products/FuelFloShowcase";

export const metadata: Metadata = {
  title: "FuelFlo",
  description:
    "The proof layer behind fuel operations — a field-to-report system that turns every fuel delivery into verified, timestamped, photo-backed evidence.",
  alternates: { canonical: "/products/fuelflo" },
  openGraph: {
    title: "FuelFlo | Enodre",
    description:
      "The proof layer behind fuel operations — a field-to-report system that turns every fuel delivery into verified, timestamped, photo-backed evidence.",
    url: "/products/fuelflo",
  },
};

export default function FuelFloPage() {
  return <FuelFloShowcase />;
}
