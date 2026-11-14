import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Cache Components (and Partial Prefetching, which depends on it) are off on
  // purpose: almost every page here is private to the signed-in person, so
  // ordinary per-request rendering is simpler and just as fast.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
