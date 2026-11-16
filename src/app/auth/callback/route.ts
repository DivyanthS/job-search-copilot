import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logLoginError, safeNextPath, toLoginErrorCode } from "@/lib/auth-errors"

// Where the email link (default Supabase template) and Google sign-in land.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeNextPath(searchParams.get("next"))

  const providerError = searchParams.get("error_description") ?? searchParams.get("error")
  if (providerError) {
    const errorCode = toLoginErrorCode(providerError)
    logLoginError("callback", providerError, errorCode)
    return NextResponse.redirect(`${origin}/login?error=${errorCode}`)
  }

  const code = searchParams.get("code")
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    const errorCode = toLoginErrorCode(error)
    logLoginError("callback", error, errorCode)
    return NextResponse.redirect(`${origin}/login?error=${errorCode}`)
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
