import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TalentVault",
    short_name: "TalentVault",
    description: "Curated, anonymised talent for approved employers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#1a6840",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
