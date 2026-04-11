import type { AgentRunResult, Domain } from "@/lib/types"
import { doClient, REASONING_MODEL } from "./client"

export async function analyzeResults(params: {
  hypothesis: string
  approach: string
  domain: Domain
  executionOutput: string
  exitCode: number | null
  masterContext: string
}): Promise<AgentRunResult> {
  const { hypothesis, approach, domain, executionOutput, exitCode, masterContext } =
    params

  // Crashed with no findings = automatic failure
  if (exitCode !== 0 && !executionOutput.includes("FINDING:")) {
    return {
      outcome: "failed",
      findings: [
        {
          type: "negative",
          description: "Experiment crashed or produced no findings",
          confidence: 0.9,
          implication: "This computational approach is not viable as specified",
          timestamp: new Date().toISOString(),
        },
      ],
      conclusion: `Experiment failed to execute: ${executionOutput.slice(0, 200)}`,
      should_spawn_children: false,
      new_plausibility_for_related: [],
    }
  }

  const response = await doClient.chat.completions.create({
    model: REASONING_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content:
          "You are a scientific result analyzer. Return ONLY valid JSON. No markdown. No explanation. No backticks.",
      },
      {
        role: "user",
        content: `Domain: ${domain}
Hypothesis tested: "${hypothesis}"
Approach: ${approach}
Scientific context: ${(masterContext || "").slice(0, 500)}

Experiment output:
${executionOutput.slice(0, 3000)}

Analyze the results and return this exact JSON structure:
{
  "outcome": "succeeded" | "failed" | "inconclusive",
  "findings": [{
    "type": "positive" | "negative" | "neutral" | "unexpected",
    "description": "what was specifically found",
    "confidence": 0.0-1.0,
    "implication": "what this means for the research question",
    "timestamp": "${new Date().toISOString()}"
  }],
  "conclusion": "one sentence summary of what was discovered",
  "should_spawn_children": true if outcome is succeeded and results are promising enough to explore further,
  "new_plausibility_for_related": []
}`,
      },
    ],
  })

  const text = response.choices[0].message.content || "{}"
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return {
      outcome: "inconclusive",
      findings: [
        {
          type: "neutral",
          description: "Could not parse experiment results",
          confidence: 0.1,
          implication: "Manual review needed",
          timestamp: new Date().toISOString(),
        },
      ],
      conclusion: "Results were inconclusive — could not parse output",
      should_spawn_children: false,
      new_plausibility_for_related: [],
    }
  }
}
