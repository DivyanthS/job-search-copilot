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
  poweredByHeader: false,
  // Basic browser security settings for every page.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Don't let other websites show this app inside a frame (stops "clickjacking").
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // A private app: keep it out of search results.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ]
  },
}

export default nextConfig
