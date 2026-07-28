import type { Metadata } from "next";
import { FuelFloShowcase } from "@/components/products/FuelFloShowcase";

export const metadata: Metadata = {
  title: "FuelFlo",
  description:
    "The proof layer behind fuel operations — a field-to-report system that turns every fuel delivery into verified, timestamped, photo-backed evidence.",
};

export default function FuelFloPage() {
  return <FuelFloShowcase />;
}
