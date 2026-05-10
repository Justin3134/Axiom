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

/** Extract and parse a JSON array from raw model output, stripping markdown fences. */
function extractJsonArray(text: string): unknown[] {
  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?\n?/g, "").trim()

  // Find the first '[' and last ']' to isolate the array
  const start = cleaned.indexOf("[")
  const end = cleaned.lastIndexOf("]")
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }

  return JSON.parse(cleaned)
}

/** Call the model and parse a JSON array response, retrying once on parse failure. */
async function callForJsonArray<T>(
  prompt: string,
  maxTokens: number,
  retries = 1,
): Promise<T[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await doClient.chat.completions.create({
      model: REASONING_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.choices[0].message.content ?? "[]"
    try {
      return extractJsonArray(text) as T[]
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[hypothesis-generator] JSON parse failed (attempt ${attempt + 1}), retrying…`, err)
        continue
      }
      throw new Error(`Model returned invalid JSON after ${retries + 1} attempts: ${(err as Error).message}`)
    }
  }
  return []
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

Return ONLY a valid JSON array. No markdown, no prose. Start your response with [ and end with ].

Schema:
[{
  "title": "Short descriptive name (5-8 words)",
  "description": "2-3 sentences describing the hypothesis scientifically",
  "rationale": "Why this approach might work, grounded in existing science",
  "approach": "Specific computational experiment to test this via Python",
  "plausibilityScore": 0.75,
  "priorityRank": 1
}]`

  const parsed = await callForJsonArray<{
    title: string
    description: string
    rationale: string
    approach: string
    plausibilityScore: number
    priorityRank: number
  }>(prompt, 8000)

  return parsed.map((h, i) => ({
    title: h.title ?? `Hypothesis ${i + 1}`,
    description: h.description ?? "",
    rationale: h.rationale ?? "",
    approach: h.approach ?? "",
    plausibility_score: typeof h.plausibilityScore === "number" ? h.plausibilityScore : 0.5,
    priority_rank: typeof h.priorityRank === "number" ? h.priorityRank : i + 1,
    depth: 0,
    generation: 0,
    branch_path: [],
  }))
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

Return ONLY a valid JSON array. No markdown, no prose. Start with [ and end with ].
[{
  "title": "Short descriptive name (5-8 words)",
  "description": "2-3 sentences — specific variant of parent",
  "rationale": "Why this follow-up is promising given parent findings",
  "approach": "More targeted Python experiment to test this",
  "plausibility_score": 0.75
}]`

  return callForJsonArray<
    Omit<CreateHypothesisPayload, "program_id" | "parent_id" | "depth" | "generation" | "branch_path">
  >(prompt, 3000)
}
