import { NextRequest, NextResponse } from "next/server"
import { getProgram, createHypothesis, updateProgram } from "@/lib/redis/db"
import { generateRootHypotheses } from "@/lib/ai/hypothesis-generator"
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

  if (program.status !== "initializing") {
    return NextResponse.json({ message: "Already initialized" })
  }

  try {
    const hypotheses = await generateRootHypotheses({
      researchQuestion: program.research_question,
      domain: program.domain,
      count: 10,
    })

    await Promise.all(
      hypotheses.map((h) =>
        createHypothesis({
          ...h,
          program_id: programId,
          plausibility_score: h.plausibility_score ?? 0.5,
          priority_rank: h.priority_rank ?? 0,
        })
      )
    )

    await updateProgram(programId, {
      status: "active",
      total_hypotheses: hypotheses.length,
    })

    // Run the first orchestrator cycle directly — no HTTP self-call,
    // which can be silently dropped by the runtime after a response is sent.
    await runOrchestratorCycle()

    return NextResponse.json({ success: true, hypothesesCreated: hypotheses.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[initialize] Failed:", msg)
    await updateProgram(programId, { status: "error" }).catch(() => null)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
