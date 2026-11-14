import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv } from "./env"

// Pages anyone can open without being signed in.
// "/dev" holds development-only previews and returns 404 in production.
const PUBLIC_PATHS = ["/login", "/auth", ...(process.env.NODE_ENV === "development" ? ["/dev"] : [])]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// Runs before every page request: keeps the sign-in session fresh and sends
// signed-out visitors to the login page.
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv()

  // Not set up yet: let the login page explain what to do.
  if (!env) {
    if (isPublic(request.nextUrl.pathname)) return NextResponse.next()
    return NextResponse.redirect(new URL("/login", request.url))
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      },
    },
  })

  // Don't put any code between createServerClient and getClaims():
  // this call is what refreshes an expiring session.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  if (!signedIn && !isPublic(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (signedIn && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}
