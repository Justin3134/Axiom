import { NextRequest, NextResponse } from "next/server"
import { getHypothesis, updateHypothesis } from "@/lib/redis/db"
import { doClient, REASONING_MODEL } from "@/lib/ai/client"

interface Params {
  params: Promise<{ hypothesisId: string }>
}

// ── GET — return stored diagram (mermaid preferred, svg fallback) ──
export async function GET(_req: NextRequest, { params }: Params) {
  const { hypothesisId } = await params

  const hypothesis = await getHypothesis(hypothesisId)
  if (!hypothesis) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 })
  }

  return NextResponse.json({
    mermaid: hypothesis.visualization_mermaid ?? null,
    svg: hypothesis.visualization_svg ?? null,
  })
}

// ── POST — generate Mermaid diagram via LLM, persist, return ──────
export async function POST(_req: NextRequest, { params }: Params) {
  const { hypothesisId } = await params

  const hypothesis = await getHypothesis(hypothesisId)
  if (!hypothesis) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 })
  }

  // Build structured context from all available hypothesis fields
  const findingsSummary = (hypothesis.findings ?? [])
    .map((f) => `- [${f.type}] ${f.description}`)
    .join("\n")

  const contextBlock = [
    `Title: ${hypothesis.title}`,
    hypothesis.approach    ? `Approach: ${hypothesis.approach}`       : null,
    hypothesis.description ? `Description: ${hypothesis.description}` : null,
    hypothesis.conclusion  ? `Conclusion: ${hypothesis.conclusion}`   : null,
    findingsSummary        ? `Findings:\n${findingsSummary}`          : null,
    `Status: ${hypothesis.status ?? "unknown"}`,
  ].filter(Boolean).join("\n\n")

  const systemPrompt = `You are a scientific diagram generator. Output ONLY valid Mermaid diagram syntax — no explanation, no markdown code fences, no backticks, no prose.

DIAGRAM TYPE — choose whichever best represents the hypothesis:
- flowchart LR   for left-to-right experimental pipelines or workflows
- flowchart TD   for top-down hierarchies, decision trees, or causal chains
- sequenceDiagram for step-by-step temporal or interaction sequences

RULES
- 5–9 nodes total
- Use 1–3 subgraph blocks to group related concepts (subgraph id [Label])
- Node IDs must be concise camelCase words (e.g. replicationFork, checkpointSignal)
- Node labels max 30 characters — use short, meaningful phrases
- Use descriptive arrow labels for key relationships: A -->|inhibits| B
- For decision/branch nodes use rhombus shape: node{Label}
- For terminal/result nodes use stadium shape: node([Label])

EXAMPLE OUTPUT (for reference style — do not copy content):
flowchart LR
    subgraph setup [Experimental Setup]
        syntheticGenome[Synthetic Genome] --> applyLesions[Apply Lesions]
    end
    subgraph replication [Replication Process]
        applyLesions --> repFork{Replication Fork}
        repFork -->|activates| checkpoint[Checkpoint Signal]
        repFork -->|triggers| genomicTrigger[Genomic Trigger]
    end
    subgraph outcomes [Outcomes]
        checkpoint --> forkStable([Fork Stabilization])
        genomicTrigger -->|leads to| collapse([Collapse Failure])
    end`

  const userPrompt = `Generate a Mermaid diagram for the following research hypothesis:

${contextBlock}

Output only the Mermaid diagram code. Choose the diagram type that best communicates the key entities, relationships, mechanisms, or experimental steps.`

  let mermaid: string
  try {
    const completion = await doClient.chat.completions.create({
      model: REASONING_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""

    // Strip any accidental markdown fences the model might wrap around it
    mermaid = raw
      .replace(/^```(?:mermaid)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    if (!mermaid) {
      return NextResponse.json({ error: "LLM did not return Mermaid content" }, { status: 502 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Failed to generate visualization: ${message}` },
      { status: 502 }
    )
  }

  await updateHypothesis(hypothesisId, { visualization_mermaid: mermaid } as Parameters<typeof updateHypothesis>[1])

  return NextResponse.json({ mermaid })
}
