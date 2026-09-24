import type { MetadataRoute } from "next";
import { expertiseAreas, products } from "@/lib/content";

const BASE_URL = "https://enodre.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/products`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/services`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = expertiseAreas.map((area) => ({
    url: `${BASE_URL}/services/${area.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes, ...serviceRoutes];
}
