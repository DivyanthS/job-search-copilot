"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { LOGIN_ERROR_MESSAGES, logLoginError, toLoginErrorCode } from "@/lib/auth-errors"

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string }

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }
  const h = await headers()
  const origin = h.get("origin")
  if (origin) return origin
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function sendMagicLink(
  _prev: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  if (!getSupabaseEnv()) {
    return { status: "error", message: "The app isn't connected to Supabase yet. See SETUP.md." }
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Please enter a valid email address." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  })

  if (error) {
    const code = toLoginErrorCode(error)
    logLoginError("send link", error, code)
    return {
      status: "error",
      message: code === "link_expired" ? LOGIN_ERROR_MESSAGES.unknown : LOGIN_ERROR_MESSAGES[code],
    }
  }

  return { status: "sent", email }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback` },
  })
  if (error || !data.url) {
    if (error) logLoginError("google", error, "unknown")
    redirect("/login?error=unknown")
  }
  redirect(data.url)
}
