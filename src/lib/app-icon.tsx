import { ImageResponse } from "next/og"

// The app icon as a PNG, for phones' home screens. `inset` leaves a safe
// margin for icons that Android crops into circles ("maskable").
export function appIconPng(size: number, { rounded = true, inset = 0.22 } = {}) {
  const glyph = Math.round(size * (1 - inset * 2))
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1, #7c3aed)",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12h.01" />
          <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M22 13a18.15 18.15 0 0 1-20 0" />
          <rect width="20" height="14" x="2" y="6" rx="2" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}
