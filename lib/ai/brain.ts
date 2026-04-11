import type { Hypothesis, MasterContext } from "@/lib/types"
import { doClient, REASONING_MODEL } from "./client"

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

  const response = await doClient.chat.completions.create({
    model: REASONING_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `You are a scientific research synthesizer. Given experiment findings, update the master research context.
Return ONLY a valid JSON object matching this exact schema — no markdown, no explanation:
{
  "summary": "2-3 sentence synthesis of all research progress so far",
  "key_insights": ["insight1", "insight2", ...],
  "eliminated_approaches": ["approach that was ruled out", ...],
  "promising_directions": ["direction worth pursuing", ...],
  "current_focus": "single most promising direction to investigate next",
  "confidence_level": 0.0-1.0
}`,
      },
      {
        role: "user",
        content: `Research question: "${researchQuestion}"
Domain: ${domain}

Current context:
${JSON.stringify(currentContext, null, 2)}

New experiment findings:
${newFindings.join("\n\n---\n\n")}

All hypotheses status:
${hypothesesSummary}

Update the master context to integrate these new findings.`,
      },
    ],
  })

  const text = response.choices[0].message.content || "{}"
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      ...parsed,
      total_experiments_run: totalExperimentsRun,
      last_updated: new Date().toISOString(),
    }
  } catch {
    return {
      ...currentContext,
      summary: text.slice(0, 1000) || currentContext.summary,
      total_experiments_run: totalExperimentsRun,
      last_updated: new Date().toISOString(),
    }
  }
}

export interface ResearchPaperSections {
  abstract: string
  introduction: string
  methodology: string
  discussion: string
  conclusion: string
  recommended_next_steps: string[]
  // Legacy fields kept for backwards compat
  narrative: string
  executiveSummary: string
}

// Called on-demand — generates the full structured research paper
export async function generateBriefing(params: {
  researchQuestion: string
  domain: string
  masterContext: MasterContext
  hypotheses: Hypothesis[]
}): Promise<ResearchPaperSections> {
  const { researchQuestion, domain, masterContext, hypotheses } = params

  const succeededCount = hypotheses.filter((h) => h.status === "succeeded").length
  const failedCount = hypotheses.filter((h) => h.status === "failed").length
  const totalCount = hypotheses.length

  // Build a rich per-hypothesis summary including findings
  const hypothesesDetail = hypotheses
    .map((h, i) => {
      const refId = `H-${String(i + 1).padStart(3, "0")}`
      const findingsSummary = h.findings
        .map((f) => `  - [${f.type.toUpperCase()}] ${f.description} (confidence: ${Math.round(f.confidence * 100)}%) → ${f.implication}`)
        .join("\n")
      const result = h.conclusion || h.failure_reason || h.description.slice(0, 150)
      return `[${refId}] [${h.status.toUpperCase()}] ${h.title}
Approach: ${h.approach}
Generation: ${h.generation} | Plausibility: ${Math.round(h.plausibility_score * 100)}%
Result: ${result}${findingsSummary ? `\nFindings:\n${findingsSummary}` : ""}`
    })
    .join("\n\n")

  const response = await doClient.chat.completions.create({
    model: REASONING_MODEL,
    max_tokens: 6000,
    messages: [
      {
        role: "system",
        content: `You are a scientific research director writing a formal research paper synthesizing an AI-driven autonomous research program. 

Return ONLY a valid JSON object with these exact fields — no markdown, no preamble:
{
  "abstract": "200-250 word abstract covering objective, methods, key findings, and significance",
  "introduction": "2-3 paragraphs introducing the research question, its importance, prior context in the domain, and the autonomous AI-driven methodology used",
  "methodology": "2-3 paragraphs describing the autonomous hypothesis tree exploration: how branches were generated, how experiments were run, how results fed back into the next generation of hypotheses",
  "discussion": "3-4 paragraphs cross-cutting analysis: patterns across experiments, why certain approaches succeeded vs failed, emergent insights not obvious from individual results, contradictions or surprises",
  "conclusion": "1-2 paragraphs summarizing the overall answer to the research question, confidence level, and significance of findings",
  "recommended_next_steps": ["actionable step 1", "actionable step 2", "actionable step 3", "actionable step 4", "actionable step 5"]
}

Be specific — cite experiment reference IDs like [H-001], hypothesis titles, and actual findings. Write at graduate-level scientific prose.`,
      },
      {
        role: "user",
        content: `Research question: "${researchQuestion}"
Domain: ${domain}

Master context:
${JSON.stringify(masterContext, null, 2)}

Experiments: ${succeededCount} succeeded, ${failedCount} failed, ${totalCount} total

All hypotheses with findings:
${hypothesesDetail}

Generate the full research paper sections as JSON.`,
      },
    ],
  })

  const text = response.choices[0].message.content || "{}"
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      abstract: parsed.abstract || "",
      introduction: parsed.introduction || "",
      methodology: parsed.methodology || "",
      discussion: parsed.discussion || "",
      conclusion: parsed.conclusion || "",
      recommended_next_steps: parsed.recommended_next_steps || [],
      narrative: [parsed.introduction, parsed.discussion, parsed.conclusion].filter(Boolean).join("\n\n"),
      executiveSummary: parsed.abstract || "",
    }
  } catch {
    // Fallback: treat entire response as narrative
    const narrative = text
    const firstParagraph = narrative.split("\n\n")[0] || narrative.slice(0, 300)
    return {
      abstract: firstParagraph.replace(/^#+\s*/, "").trim(),
      introduction: narrative,
      methodology: "",
      discussion: "",
      conclusion: "",
      recommended_next_steps: [],
      narrative,
      executiveSummary: firstParagraph.replace(/^#+\s*/, "").trim(),
    }
  }
}
