import { NextRequest, NextResponse } from "next/server"
import { generateOAuthState, getGoogleAuthUrl, getGoogleRedirectUri, oauthStateCookieName, oauthStateMaxAge } from "../../../../lib/auth"

export async function GET(req: NextRequest) {
    const origin = new URL(req.url).origin
    const redirectUri = getGoogleRedirectUri(origin)
    const state = generateOAuthState()
    const authUrl = getGoogleAuthUrl(redirectUri, state)

    const response = NextResponse.redirect(authUrl)
    response.cookies.set(oauthStateCookieName, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "lax",
        maxAge: oauthStateMaxAge,
        path: "/",
    })

    return response
}
