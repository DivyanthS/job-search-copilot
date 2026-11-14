// Turns Supabase's technical sign-in errors into plain-English messages.

export type LoginErrorCode = "not_invited" | "link_expired" | "rate_limited" | "unknown"

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  not_invited:
    "This email hasn't been invited yet. Ask the app owner to send you an invite.",
  link_expired:
    "That sign-in link has expired or was already used. Request a new one below.",
  rate_limited:
    "Too many sign-in emails were sent recently. Please wait a few minutes and try again.",
  unknown: "Something went wrong while signing you in. Please try again.",
}

export function toLoginErrorCode(message: string | null | undefined): LoginErrorCode {
  const m = (message ?? "").toLowerCase()
  // Our database blocks sign-ups for emails that aren't on the invite list,
  // which Supabase reports as a generic "database error".
  if (m.includes("not_invited") || m.includes("database error saving new user")) {
    return "not_invited"
  }
  if (m.includes("rate limit") || m.includes("too many")) return "rate_limited"
  if (m.includes("expired") || m.includes("invalid") || m.includes("otp")) {
    return "link_expired"
  }
  return "unknown"
}

// Only allow redirects to pages inside this app.
export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}
