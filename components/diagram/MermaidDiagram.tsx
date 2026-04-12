"use client"

import { useEffect, useRef, useState, useId } from "react"
import mermaid from "mermaid"

// Initialise once with a light, publication-quality theme.
// `startOnLoad: false` is required — we call render() manually.
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    // Background + general
    background: "#ffffff",
    mainBkg: "#ffffff",

    // Primary nodes (blue)
    primaryColor: "#dbeafe",
    primaryTextColor: "#1e3a5f",
    primaryBorderColor: "#93c5fd",

    // Secondary nodes (green)
    secondaryColor: "#dcfce7",
    secondaryTextColor: "#14532d",
    secondaryBorderColor: "#86efac",

    // Tertiary nodes (yellow)
    tertiaryColor: "#fef9c3",
    tertiaryTextColor: "#713f12",
    tertiaryBorderColor: "#fde047",

    // Edges + labels
    lineColor: "#64748b",
    edgeLabelBackground: "#f8fafc",
    labelColor: "#334155",

    // Subgraph backgrounds
    clusterBkg: "#f8fafc",
    clusterBorder: "#cbd5e1",
    titleColor: "#0f172a",

    // Typography
    fontSize: "14px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    rankSpacing: 60,
    nodeSpacing: 40,
    padding: 16,
  },
  sequence: {
    actorFontFamily: "system-ui, -apple-system, sans-serif",
    noteFontFamily: "system-ui, -apple-system, sans-serif",
    messageFontFamily: "system-ui, -apple-system, sans-serif",
  },
})

interface MermaidDiagramProps {
  code: string
  className?: string
}

export default function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const uid = useId().replace(/:/g, "-")
  const idRef = useRef(`mermaid${uid}`)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!code) return
    setError(false)
    setSvg(null)

    // Assign a fresh ID on each render to avoid mermaid's internal ID cache
    const renderId = `${idRef.current}-${Date.now()}`

    mermaid
      .render(renderId, code)
      .then(({ svg: rendered }) => {
        // Make the SVG responsive
        const responsive = rendered
          .replace(/(<svg[^>]*)\s+width="[^"]*"/, "$1")
          .replace(/(<svg[^>]*)\s+height="[^"]*"/, "$1")
          .replace("<svg", '<svg width="100%" height="auto"')
        setSvg(responsive)
      })
      .catch(() => setError(true))
  }, [code])

  if (error) {
    return (
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 6,
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          fontSize: 11,
          color: "#ef4444",
          textAlign: "center",
        }}
      >
        Diagram render failed
      </div>
    )
  }

  if (!svg) {
    return (
      <div
        style={{
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "var(--text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        Rendering diagram…
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ lineHeight: 0, background: "#ffffff", borderRadius: 6, overflow: "hidden", padding: "12px 8px" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
