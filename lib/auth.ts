import crypto from "crypto"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const AUTH_COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET
const SESSION_COOKIE_NAME = "axiom_session"
const OAUTH_STATE_COOKIE_NAME = "axiom_oauth_state"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const OAUTH_STATE_MAX_AGE = 60 * 5 // 5 minutes

if (!GOOGLE_CLIENT_ID) {
  throw new Error("Missing required environment variable GOOGLE_CLIENT_ID")
}

if (!GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing required environment variable GOOGLE_CLIENT_SECRET")
}

if (!AUTH_COOKIE_SECRET) {
  throw new Error("Missing required environment variable AUTH_COOKIE_SECRET")
}

function normalizeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  return normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
}

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function signPayload(payload: Record<string, unknown>) {
  const encoded = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"))
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", AUTH_COOKIE_SECRET).update(encoded).digest(),
  )
  return `${encoded}.${signature}`
}

function verifySignedPayload(token: string) {
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return null

  const expected = base64UrlEncode(
    crypto.createHmac("sha256", AUTH_COOKIE_SECRET).update(encoded).digest(),
  )

  const signatureBuffer = Buffer.from(normalizeBase64Url(signature), "base64")
  const expectedBuffer = Buffer.from(normalizeBase64Url(expected), "base64")
  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  const json = Buffer.from(normalizeBase64Url(encoded), "base64").toString("utf8")
  const payload = JSON.parse(json) as Record<string, unknown>
  if (typeof payload !== "object" || payload === null) return null
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export function generateOAuthState() {
  return crypto.randomBytes(20).toString("hex")
}

export function getGoogleRedirectUri(origin: string) {
  return `${origin}/auth/callback`
}

export function getGoogleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google token exchange failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<{
    access_token: string
    expires_in: number
    refresh_token?: string
    scope: string
    token_type: string
    id_token?: string
  }>
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google user info fetch failed: ${response.status} ${errorText}`)
  }

  return response.json() as Promise<{
    sub: string
    email: string
    email_verified: boolean
    name: string
    picture: string
    locale?: string
  }>
}

export function createSessionCookieValue(user: { sub: string; email: string; name: string; picture: string }) {
  return signPayload({
    id: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  })
}

export function verifySessionCookieValue(cookieValue: string) {
  return verifySignedPayload(cookieValue)
}

export const sessionCookieName = SESSION_COOKIE_NAME
export const oauthStateCookieName = OAUTH_STATE_COOKIE_NAME
export const sessionMaxAge = SESSION_MAX_AGE
export const oauthStateMaxAge = OAUTH_STATE_MAX_AGE
