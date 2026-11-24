import type { MetadataRoute } from "next"

/** Web app manifest: makes DOORS installable to the home screen (served at /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DOORS: Food & groceries delivered",
    short_name: "DOORS",
    description: "Food and groceries from local vendors around ESUT and Agbani, delivered to your door.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#D71920",
    theme_color: "#D71920",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
