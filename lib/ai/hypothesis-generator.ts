import type { Domain, Hypothesis, Finding, CreateHypothesisPayload } from "@/lib/types"
import { doClient, REASONING_MODEL } from "./client"

const DOMAIN_CONTEXT: Record<Domain, string> = {
  drug_discovery:
    "computational drug discovery, molecular docking, ADMET properties, target binding, protein-ligand interactions",
  genomics:
    "gene expression, CRISPR mechanisms, protein folding, regulatory networks, variant analysis",
  materials:
    "crystal structures, electronic properties, mechanical strength, synthesis routes, DFT calculations",
  chemistry:
    "reaction mechanisms, catalysis, molecular properties, thermodynamics, reaction kinetics",
  climate:
    "atmospheric modeling, carbon cycles, feedback loops, tipping points, climate forcing",
  physics:
    "quantum mechanics, condensed matter, particle interactions, field theories, statistical mechanics",
}

// Generate root hypotheses for a new research program
export async function generateRootHypotheses(params: {
  researchQuestion: string
  domain: Domain
  count?: number
}): Promise<Omit<CreateHypothesisPayload, "program_id">[]> {
  const { researchQuestion, domain, count = 10 } = params

  const prompt = `You are a world-class research scientist specializing in ${DOMAIN_CONTEXT[domain]}.

Research Question: "${researchQuestion}"

Generate exactly ${count} distinct scientific hypotheses to investigate this question.
Each hypothesis must:
1. Propose a SPECIFIC mechanistic approach (not vague)
2. Be computationally testable via Python (simulation, data analysis, or mathematical modeling)
3. Be genuinely different from the others (diverse approaches, not variations of one idea)
4. Have a realistic plausibility based on current scientific knowledge

Return ONLY a valid JSON array. No markdown. No explanation. Just the array.

Schema:
[{
  "title": "Short descriptive name (5-8 words)",
  "description": "2-3 sentences describing the hypothesis scientifically",
  "rationale": "Why this approach might work, grounded in existing science",
  "approach": "Specific computational experiment to test this via Python",
  "plausibilityScore": 0.0-1.0,
  "priorityRank": 1-${count}
}]`

  const response = await doClient.chat.completions.create({
    model: REASONING_MODEL,
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.choices[0].message.content || "[]"
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim()
  const parsed = JSON.parse(cleaned)

  return parsed.map(
    (
      h: {
        title: string
        description: string
        rationale: string
        approach: string
        plausibilityScore: number
        priorityRank: number
      },
      i: number
    ) => ({
      title: h.title,
      description: h.description,
      rationale: h.rationale,
      approach: h.approach,
      plausibility_score: h.plausibilityScore,
      priority_rank: h.priorityRank ?? i + 1,
      depth: 0,
      generation: 0,
      branch_path: [],
    })
  )
}

// Generate child hypotheses drilling into a successful parent's findings
export async function generateChildHypotheses(params: {
  parentHypothesis: Hypothesis
  researchQuestion: string
  domain: Domain
  masterContext: string
  findings: Finding[]
}): Promise<
  Omit<
    CreateHypothesisPayload,
    "program_id" | "parent_id" | "depth" | "generation" | "branch_path"
  >[]
> {
  const {
    parentHypothesis,
    researchQuestion,
    domain,
    masterContext,
    findings,
  } = params

  const findingSummary = findings
    .map((f) => `[${f.type.toUpperCase()}] ${f.description} → ${f.implication}`)
    .join("\n")

  const prompt = `You are a research scientist analyzing successful experimental results.

Original research question: "${researchQuestion}"
Domain: ${domain}

Parent hypothesis that SUCCEEDED:
"${parentHypothesis.description}"

Experimental findings:
${findingSummary}

Master context (what we know overall):
${(masterContext || "").slice(0, 1000)}

Generate exactly 3 child hypotheses that explore MORE SPECIFIC variants of what was found.
These should drill deeper into the promising direction, not branch into unrelated areas.

Return ONLY valid JSON array. No markdown:
[{
  "title": "Short descriptive name (5-8 words)",
  "description": "2-3 sentences — specific variant of parent",
  "rationale": "Why this follow-up is promising given parent findings",
  "approach": "More targeted Python experiment to test this",
  "plausibility_score": 0.0-1.0
}]`

  const response = await doClient.chat.completions.create({
    model: REASONING_MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.choices[0].message.content || "[]"
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim()
  return JSON.parse(cleaned)
}
