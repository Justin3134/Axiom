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
  limitations: string
  keywords: string[]
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
    max_tokens: 10000,
    messages: [
      {
        role: "system",
        content: `You are a senior scientific research director authoring a peer-reviewed research paper that synthesizes the results of an AI-driven autonomous research program. Your writing must meet the standards of a top-tier academic journal submission.

Return ONLY a valid JSON object with these exact fields — no markdown, no preamble, no trailing text:
{
  "keywords": ["6-8 precise domain keywords covering the research area, methods, and key concepts"],
  "abstract": "250-300 word structured abstract with four implicit parts: Background (1-2 sentences on why this question matters), Objective (1 sentence), Methods (2-3 sentences on the autonomous hypothesis-tree methodology, number of experiments), Results (2-3 sentences citing the most significant findings with reference IDs like [H-001]), Conclusions (1-2 sentences on significance and confidence). Do NOT use subheadings inside the abstract.",
  "introduction": "4-5 paragraphs. P1: establish the broader scientific/practical context and motivate the research question with specific domain knowledge. P2: survey the landscape of prior approaches and their limitations — reference specific experiment IDs where they map to known approaches (e.g., '[H-003] revisited the classic assumption that...'). P3: articulate the specific gap or open question this program addresses. P4: describe the Axiom autonomous AI research system and why it is suited to this problem. P5: state the paper's organization ('The remainder of this paper is structured as follows...').",
  "methodology": "3-4 paragraphs describing the experimental design in rigorous detail. Include: (a) how the hypothesis tree was seeded and how branches were generated across generations, (b) the evaluation criteria — plausibility scoring, confidence thresholds, and how failing experiments pruned the search space, (c) specific generation counts and branching factors drawn from the data, (d) how findings from one generation fed back into the next. Reference specific experiment IDs (e.g., [H-001], [H-007]) as concrete examples of methodological decisions.",
  "discussion": "5-6 paragraphs of rigorous cross-cutting analysis. P1: what overarching patterns emerged across all experiments. P2: deep analysis of the most successful approaches — what they share mechanistically, citing [H-NNN] IDs. P3: analysis of failures — what hypotheses failed and why, whether failures were informative, citing [H-NNN] IDs. P4: contradictions, surprises, or results that challenge prior assumptions. P5: emergent insights that could only be seen by comparing experiments, not from any single result. P6: interpretation of confidence trajectory across generations.",
  "limitations": "1 substantive paragraph covering: the bounds of the autonomous AI methodology (what kinds of hypotheses it cannot generate), confidence bounds and how they were derived, potential sources of bias in the hypothesis-generation process, what experimental conditions or confounders were not controlled, and what important sub-questions remain unanswered.",
  "conclusion": "2-3 paragraphs. P1: restate the research question and give a direct, evidence-backed answer citing key experiment IDs. P2: articulate the broader significance — what this means for the field, for practitioners, or for follow-on research. P3: one forward-looking sentence on the most promising direction.",
  "recommended_next_steps": ["5-7 specific, actionable research steps that follow directly from the findings — each step should name the specific hypothesis or finding that motivates it"]
}

CRITICAL STYLE RULES:
1. Every prose section MUST contain multiple inline citations in the form [H-001], [H-002], etc. — woven naturally into sentences, not appended as afterthoughts. Example: "The failure of [H-007] to replicate the baseline result strongly suggests that the mechanism is context-dependent."
2. Where a figure exists for a hypothesis (any hypothesis with a visualization), reference it in the prose: "as illustrated in Figure N" or "Figure N depicts the relationship between..."
3. Write at graduate dissertation / Nature journal level — precise, analytical, quantitative where possible. Use hedged language appropriately: "suggest", "indicate", "provide evidence for", "are consistent with".
4. DO NOT use bullet points or subheadings inside any prose field. Continuous flowing paragraphs only.
5. Use exact plausibility scores from the data (e.g., "achieving a plausibility score of 84% [H-003]").`,
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
      limitations: parsed.limitations || "",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
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
      limitations: "",
      keywords: [],
      recommended_next_steps: [],
      narrative,
      executiveSummary: firstParagraph.replace(/^#+\s*/, "").trim(),
    }
  }
}
