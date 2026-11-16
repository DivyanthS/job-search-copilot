import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logLoginError, safeNextPath, toLoginErrorCode } from "@/lib/auth-errors"

// Where the email link lands once the Supabase "Magic Link" email template is
// updated (see SETUP.md). Unlike /auth/callback, this works even when the link
// is opened on a different device or browser from the one that requested it.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNextPath(searchParams.get("next"))

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    const errorCode = toLoginErrorCode(error)
    logLoginError("confirm", error, errorCode)
    return NextResponse.redirect(`${origin}/login?error=${errorCode}`)
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
