import type { Hypothesis, MasterContext } from "@/lib/types"

const WORDWARE_BASE = "https://app.wordware.ai/api/released-app"

async function callWordware(
  inputs: Record<string, string>
): Promise<string> {
  const response = await fetch(
    `${WORDWARE_BASE}/${process.env.WORDWARE_APP_ID}/run`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORDWARE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs, version: "^1.0" }),
    }
  )

  if (!response.ok) {
    throw new Error(`Wordware API error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let result = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split("\n")

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      try {
        const parsed = JSON.parse(line.slice(6))
        // Handle various Wordware streaming formats
        if (parsed.value?.outputs?.generation) {
          result += parsed.value.outputs.generation
        } else if (parsed.value?.output) {
          result += parsed.value.output
        } else if (parsed.type === "chunk" && parsed.value) {
          result += typeof parsed.value === "string" ? parsed.value : ""
        } else if (parsed.output) {
          result += parsed.output
        }
      } catch {
        // Non-JSON lines are safe to skip
      }
    }
  }

  return result.trim()
}

// Called after each orchestrator cycle — updates the master context with new findings
export async function synthesizeFindings(params: {
  researchQuestion: string
  domain: string
  currentContext: MasterContext
  newFindings: string[]
  hypothesesSummary: string
  totalExperimentsRun: number
}): Promise<MasterContext> {
  const {
    researchQuestion,
    domain,
    currentContext,
    newFindings,
    hypothesesSummary,
    totalExperimentsRun,
  } = params

  const result = await callWordware({
    task: "synthesize",
    research_question: researchQuestion,
    domain,
    current_context: JSON.stringify(currentContext),
    new_findings: newFindings.join("\n\n---\n\n"),
    hypotheses_summary: hypothesesSummary,
  })

  try {
    const cleaned = result.replace(/```json\n?|```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return {
      ...parsed,
      total_experiments_run: totalExperimentsRun,
      last_updated: new Date().toISOString(),
    }
  } catch {
    // If JSON parsing fails, return enriched current context with the raw text as summary
    return {
      ...currentContext,
      summary: result.slice(0, 1000) || currentContext.summary,
      total_experiments_run: totalExperimentsRun,
      last_updated: new Date().toISOString(),
    }
  }
}

// Called daily (or on-demand) — generates the full narrative briefing
export async function generateBriefing(params: {
  researchQuestion: string
  domain: string
  masterContext: MasterContext
  hypotheses: Hypothesis[]
}): Promise<{ narrative: string; executiveSummary: string }> {
  const { researchQuestion, domain, masterContext, hypotheses } = params

  const hypothesesSummary = hypotheses
    .map(
      (h) =>
        `[${h.status.toUpperCase()}] ${h.title}: ${h.conclusion || h.description.slice(0, 100)}`
    )
    .join("\n")

  const narrative = await callWordware({
    task: "brief",
    research_question: researchQuestion,
    domain,
    current_context: JSON.stringify(masterContext),
    new_findings: masterContext.key_insights.join("\n"),
    hypotheses_summary: hypothesesSummary,
  })

  // Extract executive summary from first paragraph of narrative
  const firstParagraph = narrative.split("\n\n")[0] || narrative.slice(0, 300)

  return {
    narrative,
    executiveSummary: firstParagraph.replace(/^#+\s*/, "").trim(),
  }
}
