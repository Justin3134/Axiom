import { NextResponse } from "next/server"

// Auth removed — app runs in demo mode with no login required.
export async function GET() {
  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_URL || "http://localhost:3000"))
}
