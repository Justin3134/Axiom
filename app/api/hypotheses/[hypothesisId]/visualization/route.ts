import { NextRequest, NextResponse } from "next/server"
import { getHypothesis, updateHypothesis } from "@/lib/redis/db"
import { doClient, CODE_MODEL } from "@/lib/ai/client"

interface Params {
  params: Promise<{ hypothesisId: string }>
}

// ── GET — return stored SVG ────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { hypothesisId } = await params

  const hypothesis = await getHypothesis(hypothesisId)
  if (!hypothesis) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 })
  }

  return NextResponse.json({ svg: hypothesis.visualization_svg ?? null })
}

// ── POST — generate SVG via LLM, persist, return ──────────────
export async function POST(_req: NextRequest, { params }: Params) {
  const { hypothesisId } = await params

  const hypothesis = await getHypothesis(hypothesisId)
  if (!hypothesis) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 })
  }

  const approachSnippet = (hypothesis.approach || hypothesis.description || "").slice(0, 200)
  const statusLabel = hypothesis.status ?? "unknown"

  const systemPrompt = `You are an SVG diagram generator. Output ONLY a single valid SVG element with no explanation, no markdown, no code fences. The SVG must:
- Have width="800" height="360" viewBox="0 0 800 360"
- Use a dark background (#080809) as a full-size rect covering the whole canvas
- Render a detailed, wide-format scientific diagram representing the research approach
- Use geometric shapes: nodes (circles/rects), directed arrows, flow paths, data charts, or network graphs
- Use accent colors: #3b82f6 (blue), #8b5cf6 (violet), #22c55e (green), #f59e0b (amber), #ef4444 (red)
- Include 4–8 meaningful text labels using font-family="monospace" font-size="11" fill="#94a3b8"
- Use thin lines (stroke-width="1" or "1.5") for connectors and borders
- Add subtle grid lines or axis lines if appropriate (stroke="#1a1a1e")
- Keep it elegant and minimal — like a scientific diagram or research flowchart
- Use the full 800×360 canvas — spread elements across the width
- No external references, no images, no scripts`

  const userPrompt = `Hypothesis: "${hypothesis.title}"
Approach: ${approachSnippet}
Status: ${statusLabel}

Generate an SVG diagram that visually represents this research hypothesis.`

  let svg: string
  try {
    const completion = await doClient.chat.completions.create({
      model: CODE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""

    // Extract SVG content (strip any accidental markdown fences)
    const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/i)
    svg = svgMatch ? svgMatch[0] : raw

    if (!svg.startsWith("<svg")) {
      return NextResponse.json({ error: "LLM did not return valid SVG" }, { status: 502 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Failed to generate visualization: ${message}` },
      { status: 502 }
    )
  }

  await updateHypothesis(hypothesisId, { visualization_svg: svg } as Parameters<typeof updateHypothesis>[1])

  return NextResponse.json({ svg })
}
