import type { MetadataRoute } from "next";

// Makes the app installable to your phone's home screen (PWA).
// Icons get added in the last Phase 1 step.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutrition Tracker",
    short_name: "Nutrition",
    description: "Personal calorie, macro, and water tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#2dd4bf",
    icons: [
      // Placeholder — replace with real 192px and 512px icons later.
      // { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      // { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
