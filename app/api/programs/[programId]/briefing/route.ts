import { NextRequest, NextResponse } from "next/server"
import { getProgram, getProgramHypotheses, saveBriefing } from "@/lib/redis/db"
import { generateBriefing } from "@/lib/ai/brain"
import type { Hypothesis } from "@/lib/types"

interface Params {
  params: Promise<{ programId: string }>
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { programId } = await params

  const program = await getProgram(programId)
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 })
  }

  const hypotheses = (await getProgramHypotheses(programId)) as Hypothesis[]

  if (hypotheses.length === 0) {
    return NextResponse.json(
      { error: "No hypotheses yet — run some agents first" },
      { status: 400 }
    )
  }

  try {
    const paperSections = await generateBriefing({
      researchQuestion: program.research_question,
      domain: program.domain,
      masterContext: program.master_context,
      hypotheses,
    })

    const keyFindings = hypotheses
      .filter((h) => h.status === "succeeded" && h.conclusion)
      .slice(0, 10)
      .map((h) => ({
        hypothesis_id: h.id,
        title: h.title,
        summary: h.conclusion || "",
        significance:
          h.plausibility_score > 0.7
            ? "breakthrough"
            : h.plausibility_score > 0.5
              ? "promising"
              : "neutral",
      }))

    const deadEnds = hypotheses
      .filter((h) => h.status === "failed" && h.failure_reason)
      .map((h) => `${h.title}: ${h.failure_reason}`)

    const briefing = await saveBriefing({
      program_id: programId,
      narrative: paperSections.narrative,
      executive_summary: paperSections.executiveSummary,
      abstract: paperSections.abstract,
      introduction: paperSections.introduction,
      methodology: paperSections.methodology,
      discussion: paperSections.discussion,
      conclusion: paperSections.conclusion,
      limitations: paperSections.limitations,
      keywords: paperSections.keywords,
      key_findings: keyFindings,
      dead_ends: deadEnds,
      breakthrough_alert: keyFindings.some((f) => f.significance === "breakthrough")
        ? { title: keyFindings.find((f) => f.significance === "breakthrough")!.title, description: "High-confidence positive result detected." }
        : null,
      recommended_next_steps: paperSections.recommended_next_steps,
      confidence_delta: 0,
      hypotheses_snapshot: {
        total: hypotheses.length,
        succeeded: hypotheses.filter((h) => h.status === "succeeded").length,
        failed: hypotheses.filter((h) => h.status === "failed").length,
        running: hypotheses.filter((h) => h.status === "running").length,
        queued: hypotheses.filter((h) => h.status === "queued").length,
      },
    })

    return NextResponse.json(briefing, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
