import { NextRequest, NextResponse } from "next/server"
import { getProgram } from "@/lib/redis/db"
import { runOrchestratorCycle } from "@/lib/orchestrator"

export const maxDuration = 300

interface Params {
  params: Promise<{ programId: string }>
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { programId } = await params

  const program = await getProgram(programId)
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 })
  }

  if (program.status !== "active") {
    return NextResponse.json({ error: "Program is not active" }, { status: 400 })
  }

  try {
    const result = await runOrchestratorCycle()
    return NextResponse.json({ success: true, programId, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[launch] Orchestrator cycle failed:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
