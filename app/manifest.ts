import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vibe Chat",
    short_name: "Vibe",
    description: "Real-time group chat, supercharged",
    start_url: "/chat",
    display: "standalone",
    background_color: "#050510",
    theme_color: "#8B5CF6",
    orientation: "any",
    categories: ["social", "communication"],
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
