import type { MetadataRoute } from "next"

// Lets people add the app to their phone's home screen, where it opens
// full-screen like a regular app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Job Copilot",
    short_name: "Job Copilot",
    description: "Track your job applications and generate tailored application kits.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
