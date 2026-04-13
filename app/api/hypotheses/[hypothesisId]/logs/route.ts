import { NextRequest, NextResponse } from "next/server"
import { getLogsFromCursor } from "@/lib/redis/db"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hypothesisId: string }> }
) {
  const { hypothesisId } = await params
  const { searchParams } = new URL(req.url)
  const programId = searchParams.get("programId")

  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 })
  }

  // Fetch all stored logs in one shot (up to 2000)
  const { logs } = await getLogsFromCursor(programId, 0, hypothesisId, 2000)
  return NextResponse.json({ logs })
}
