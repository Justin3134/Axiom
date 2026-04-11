import { NextRequest, NextResponse } from "next/server"
import {
  getProgram,
  getProgramHypotheses,
  getLatestBriefing,
  updateProgram,
  deleteProgram,
} from "@/lib/redis/db"

interface Params {
  params: Promise<{ programId: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { programId } = await params

  const program = await getProgram(programId)
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 })
  }

  const [hypotheses, briefing] = await Promise.all([
    getProgramHypotheses(programId),
    getLatestBriefing(programId),
  ])

  return NextResponse.json({
    ...program,
    hypotheses,
    briefings: briefing ? [briefing] : [],
  })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { programId } = await params
  const body = await req.json()

  const allowedFields = ["status", "title"]
  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  const updated = await updateProgram(programId, updates)
  if (!updated) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { programId } = await params

  const program = await getProgram(programId)
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 })
  }

  await deleteProgram(programId)
  return NextResponse.json({ success: true })
}
