import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Cache Components (and Partial Prefetching, which depends on it) are off on
  // purpose: almost every page here is private to the signed-in person, so
  // ordinary per-request rendering is simpler and just as fast.
  experimental: {
    serverActions: {
      // Resume uploads are capped at 4 MB. Vercel rejects request bodies
      // over 4.5 MB, so this is the most that can usefully be allowed.
      bodySizeLimit: "4.5mb",
    },
  },
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
