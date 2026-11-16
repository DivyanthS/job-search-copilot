// Turns Supabase's technical sign-in errors into plain-English messages.

export type LoginErrorCode =
  | "not_invited"
  | "link_expired"
  | "rate_limited"
  | "email_failed"
  | "unknown"

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  not_invited:
    "This email hasn't been invited yet. Ask the app owner to send you an invite.",
  link_expired:
    "That sign-in link has expired or was already used. Request a new one below.",
  rate_limited:
    "Too many sign-in emails were sent recently. Please wait a few minutes and try again.",
  email_failed:
    "We couldn't send the sign-in email just now. Try again later, or use Continue with Google if you see it.",
  unknown: "Something went wrong while signing you in. Please try again.",
}

// What Supabase gives us: either just a message (from a URL) or an error with a code.
type AuthErrorLike = string | null | undefined | { message?: string; code?: string }

// Supabase's error codes for a link or sign-in attempt that is no longer usable.
const EXPIRED_CODES = new Set([
  "otp_expired",
  "flow_state_expired",
  "flow_state_not_found",
  "bad_code_verifier",
  "bad_oauth_state",
])

export function toLoginErrorCode(error: AuthErrorLike): LoginErrorCode {
  const message = typeof error === "string" ? error : error?.message
  const code = typeof error === "object" && error ? error.code : undefined
  const m = (message ?? "").toLowerCase()

  // Our database blocks sign-ups for emails that aren't on the invite list,
  // which Supabase reports as a generic "database error".
  if (m.includes("not_invited") || m.includes("database error saving new user")) {
    return "not_invited"
  }
  if (code?.startsWith("over_") || m.includes("rate limit") || m.includes("too many")) {
    return "rate_limited"
  }
  // The email server refused to send (for example, a wrong Gmail app password).
  if (m.includes("error sending") || m.includes("smtp")) return "email_failed"
  if (
    (code && EXPIRED_CODES.has(code)) ||
    m.includes("expired") ||
    m.includes("flow state") ||
    m.includes("code verifier") ||
    m.includes("otp")
  ) {
    return "link_expired"
  }
  return "unknown"
}

// Records the real error in the server logs (Vercel → Logs) for anything
// we can't explain to the person signing in, so it can be diagnosed later.
export function logLoginError(where: string, error: AuthErrorLike, code: LoginErrorCode) {
  if (code === "unknown" || code === "email_failed") {
    const detail = typeof error === "string" ? error : `${error?.code ?? "no code"}: ${error?.message}`
    console.error(`Sign-in error (${where}):`, detail)
  }
}

// Only allow redirects to pages inside this app.
export function safeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}
