import type { Domain, Finding } from "@/lib/types"
import { doClient, CODE_MODEL } from "./client"

const DOMAIN_IMPORTS: Record<Domain, string> = {
  drug_discovery:
    "import numpy as np\nimport json\nfrom collections import defaultdict",
  genomics:
    "import numpy as np\nimport json\nfrom collections import Counter",
  materials: "import numpy as np\nimport scipy\nimport json",
  chemistry: "import numpy as np\nimport json\nfrom collections import defaultdict",
  climate: "import numpy as np\nimport scipy\nimport json",
  physics:
    "import numpy as np\nimport scipy\nfrom scipy import constants\nimport json",
}

export async function writeExperimentCode(params: {
  hypothesis: string
  approach: string
  domain: Domain
  masterContext: string
  previousFindings: string[]
  searchContext?: string
  syntaxFeedback?: string
  siblingFindings?: Finding[]
}): Promise<string> {
  const { hypothesis, approach, domain, masterContext, previousFindings, searchContext = "", syntaxFeedback, siblingFindings = [] } =
    params

  const previousContext =
    previousFindings.length > 0
      ? `\nPrevious findings from earlier sessions:\n${previousFindings.slice(0, 5).join("\n")}`
      : ""

  const siblingContext =
    siblingFindings.length > 0
      ? `\nFindings from ${siblingFindings.length} parallel agent(s) working on this program:\n` +
        siblingFindings
          .slice(0, 10)
          .map((f) => `[${f.type.toUpperCase()}] ${f.description} (confidence: ${Math.round(f.confidence * 100)}%) → ${f.implication}`)
          .join("\n")
      : ""

  const response = await doClient.chat.completions.create({
    model: CODE_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert scientific programmer writing Python experiments for AI research agents.

CRITICAL RULES:
1. Code must be completely self-contained and runnable
2. Use ONLY standard Python + numpy, scipy, pandas, json, math, random, collections
3. Suggested imports for this domain: ${DOMAIN_IMPORTS[domain]}
4. Code must complete within 60 seconds
5. Use print() for ALL output — stdout is captured
6. Format findings as: print("FINDING: <description> | CONFIDENCE: <0-1> | IMPLICATION: <impact>")
7. End with: print("CONCLUSION: <one sentence summary of what was discovered>")
8. Handle all errors with try/except — never crash silently
9. No file I/O except reading from /tmp
10. No network requests
11. Return ONLY the Python code. Nothing else. No markdown. No backticks.`,
      },
      {
        role: "user",
        content: `Domain: ${domain}
Hypothesis: ${hypothesis}
Approach: ${approach}
Scientific context: ${(masterContext || "").slice(0, 500)}
${previousContext}${siblingContext}${searchContext}${syntaxFeedback ? `\n\nPREVIOUS ATTEMPT HAD A SYNTAX ERROR — you must fix it before returning the code:\n${syntaxFeedback}` : ""}

Write a complete, self-contained Python script to test this hypothesis computationally.`,
      },
    ],
    max_tokens: 2500,
    temperature: 0.3,
  })

  let code =
    response.choices[0].message.content ||
    "print('ERROR: No code generated')\nprint('CONCLUSION: Code generation failed')"

  // Strip markdown code fences if the model wrapped the output despite instructions
  code = code.replace(/^```(?:python)?\n?/m, "").replace(/\n?```\s*$/m, "").trim()

  return code
}
