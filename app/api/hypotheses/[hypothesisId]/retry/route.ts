import { NextRequest, NextResponse } from "next/server"
import { getHypothesis, updateHypothesis, getProgram, updateProgram } from "@/lib/redis/db"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hypothesisId: string }> }
) {
  const { hypothesisId } = await params

  const hypothesis = await getHypothesis(hypothesisId)
  if (!hypothesis) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 })
  }

  if (hypothesis.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot retry a hypothesis with status "${hypothesis.status}"` },
      { status: 400 }
    )
  }

  // Reset the hypothesis so the orchestrator will pick it up again
  await updateHypothesis(hypothesisId, {
    status: "queued",
    failure_reason: null,
    raw_output: null,
    findings: [],
    conclusion: null,
    sandbox_last_active: null,
  })

  // Reactivate the program if it was marked completed
  const program = await getProgram(hypothesis.program_id)
  if (program && program.status === "completed") {
    await updateProgram(hypothesis.program_id, { status: "active" })
  }

  return NextResponse.json({ success: true })
}
