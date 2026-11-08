import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Connected — Find your people",
    short_name: "Connected",
    description: "Your people, your ideas, your next conversation.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f8f7fc",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Your assistant", url: "/coach" },
      { name: "Nearby people", url: "/map" },
      { name: "Events", url: "/events" },
    ],
  };
}
