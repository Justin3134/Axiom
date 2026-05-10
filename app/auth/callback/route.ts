import { NextRequest, NextResponse } from "next/server"
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleRedirectUri,
  oauthStateCookieName,
  sessionCookieName,
  createSessionCookieValue,
} from "../../../lib/auth"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const savedState = req.cookies.get(oauthStateCookieName)?.value

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/auth/login?error=verification_failed", new URL(req.url).origin))
  }

  const origin = new URL(req.url).origin
  const redirectUri = getGoogleRedirectUri(origin)

  try {
    const tokens = await exchangeGoogleCodeForTokens(code, redirectUri)
    const user = await fetchGoogleUserInfo(tokens.access_token)
    const sessionValue = createSessionCookieValue({
      sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    })

    const response = NextResponse.redirect(new URL("/dashboard", origin))
    response.cookies.set(sessionCookieName, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    response.cookies.delete(oauthStateCookieName)
    return response
  } catch (error) {
    return NextResponse.redirect(new URL("/auth/login?error=token_exchange_failed", origin))
  }
}
