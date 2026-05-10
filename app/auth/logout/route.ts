import { NextResponse } from "next/server"
import { sessionCookieName } from "../../../lib/auth"

export async function GET() {
    const response = NextResponse.redirect("/auth/login")
    response.cookies.delete(sessionCookieName)
    return response
}
