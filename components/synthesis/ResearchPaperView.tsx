"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import type { Briefing, ResearchProgram, Hypothesis } from "@/lib/types"

const MermaidDiagram = dynamic(() => import("@/components/diagram/MermaidDiagram"), { ssr: false })

interface Props {
  program: ResearchProgram
  briefing: Briefing | null
  hypotheses: Hypothesis[]
  onHypothesisClick?: (id: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function refId(index: number) {
  return `H-${String(index + 1).padStart(3, "0")}`
}

function truncate(str: string | undefined | null, max: number): string {
  if (!str) return ""
  return str.length > max ? str.slice(0, max) + "…" : str
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  succeeded: {
    color: "var(--stream-green)",
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.2)",
    label: "SUCCEEDED",
  },
  failed: {
    color: "var(--stream-red)",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.2)",
    label: "FAILED",
  },
  running: {
    color: "var(--stream-blue)",
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.2)",
    label: "RUNNING",
  },
  queued: {
    color: "var(--text-muted)",
    bg: "rgba(113,113,122,0.06)",
    border: "rgba(113,113,122,0.15)",
    label: "QUEUED",
  },
  pruned: {
    color: "var(--stream-yellow)",
    bg: "rgba(234,179,8,0.06)",
    border: "rgba(234,179,8,0.18)",
    label: "PRUNED",
  },
  paused: {
    color: "var(--stream-yellow)",
    bg: "rgba(234,179,8,0.06)",
    border: "rgba(234,179,8,0.18)",
    label: "PAUSED",
  },
}

const FINDING_COLOR: Record<string, string> = {
  positive: "var(--stream-green)",
  negative: "var(--stream-red)",
  neutral: "var(--text-muted)",
  unexpected: "var(--stream-yellow)",
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionDivider({ number, title, id }: { number?: string; title: string; id: string }) {
  return (
    <div id={id} style={{ marginBottom: 24, scrollMarginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        {number && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            {number}
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
    </div>
  )
}

// CitationProseBlock — renders markdown prose and converts [H-NNN] patterns
// into clickable superscript citation badges that scroll to the References row.
function CitationProseBlock({
  text,
  onCitationClick,
}: {
  text: string
  onCitationClick?: (ref: string) => void
}) {
  if (!text) return null

  // Pre-process the text into paragraphs, inject [H-NNN] as interactive badges.
  const paragraphs = text.split(/\n\n+/)

  return (
    <div style={{ fontSize: 13, lineHeight: 1.85, color: "var(--text-secondary)" }}>
      {paragraphs.map((para, pi) => {
        if (!para.trim()) return null
        const tokens = para.split(/(\[H-\d{3}\])/g)
        return (
          <p key={pi} style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
            {tokens.map((token, ti) => {
              if (/^\[H-\d{3}\]$/.test(token)) {
                const ref = token.slice(1, -1)
                return (
                  <sup
                    key={ti}
                    onClick={() => onCitationClick?.(ref)}
                    title={`Jump to ${ref}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      lineHeight: 1,
                      color: "var(--stream-blue)",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.25)",
                      borderRadius: 3,
                      padding: "1px 4px",
                      margin: "0 1px",
                      cursor: onCitationClick ? "pointer" : "default",
                      verticalAlign: "super",
                      fontVariantNumeric: "tabular-nums",
                      transition: "background 0.1s",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (onCitationClick) (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.2)"
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.1)"
                    }}
                  >
                    {ref}
                  </sup>
                )
              }
              return <span key={ti}>{token}</span>
            })}
          </p>
        )
      })}
    </div>
  )
}

// Legacy plain ProseBlock for places where we don't need citation rendering
function ProseBlock({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{ fontSize: 13, lineHeight: 1.85, color: "var(--text-secondary)" }}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 14px", color: "var(--text-secondary)" }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{children}</strong>
          ),
          code: ({ children }) => (
            <code
              style={{
                fontSize: 11,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 3,
                padding: "1px 5px",
                color: "var(--stream-blue)",
              }}
            >
              {children}
            </code>
          ),
          ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: "8px 0 12px" }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: "8px 0 12px" }}>{children}</ol>,
          li: ({ children }) => (
            <li style={{ color: "var(--text-secondary)", marginBottom: 5, lineHeight: 1.7 }}>{children}</li>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function ExperimentCard({
  hypothesis,
  index,
  figureNumber,
  defaultExpanded,
}: {
  hypothesis: Hypothesis
  index: number
  figureNumber: number | null
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const style = STATUS_STYLE[hypothesis.status] ?? STATUS_STYLE.queued
  const score = Math.round(hypothesis.plausibility_score * 100)

  return (
    <div
      style={{
        border: `1px solid ${expanded ? style.border : "var(--border)"}`,
        borderRadius: 6,
        background: expanded ? style.bg : "transparent",
        transition: "background 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
            width: 38,
          }}
        >
          {refId(index)}
        </span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 3,
            border: `1px solid ${style.border}`,
            color: style.color,
            letterSpacing: "0.07em",
            flexShrink: 0,
          }}
        >
          {style.label}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: "var(--text-primary)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {hypothesis.title}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>Gen {hypothesis.generation}</span>
        <span
          style={{
            fontSize: 10,
            color: score >= 70 ? "var(--stream-green)" : score >= 50 ? "var(--stream-blue)" : "var(--text-muted)",
            flexShrink: 0,
            width: 32,
            textAlign: "right",
          }}
        >
          {score}%
        </span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0, marginLeft: 4 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {hypothesis.approach && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Approach
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {hypothesis.approach}
              </p>
            </div>
          )}

          {hypothesis.findings && hypothesis.findings.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Findings
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {hypothesis.findings.map((f, fi) => (
                  <div key={fi} style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.6 }}>
                    <span
                      style={{
                        color: FINDING_COLOR[f.type] ?? "var(--text-muted)",
                        flexShrink: 0,
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      ◆
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{f.description}</span>
                      {f.implication && (
                        <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>→ {f.implication}</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                        alignSelf: "flex-start",
                        marginTop: 2,
                      }}
                    >
                      {Math.round(f.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline figure — kept in cards but figure gallery is the primary display */}
          {(hypothesis.visualization_mermaid || hypothesis.visualization_svg) && figureNumber !== null && (
            <div>
              <div
                style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}
              >
                {hypothesis.visualization_mermaid ? (
                  <MermaidDiagram code={hypothesis.visualization_mermaid} />
                ) : (
                  <div
                    style={{ background: "#080809", lineHeight: 0 }}
                    dangerouslySetInnerHTML={{ __html: makeSvgResponsive(hypothesis.visualization_svg!) }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  marginTop: 6,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Figure {figureNumber}. {hypothesis.title}
              </div>
            </div>
          )}

          {(hypothesis.conclusion || hypothesis.failure_reason) && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background:
                  hypothesis.status === "failed" ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.05)",
                border: `1px solid ${
                  hypothesis.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"
                }`,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {hypothesis.status === "failed" ? "Failure Reason" : "Conclusion"}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {hypothesis.conclusion || hypothesis.failure_reason}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Figure Gallery ─────────────────────────────────────────────────────────

function FigureGallery({
  hypotheses,
  figureMap,
  refMap,
}: {
  hypotheses: Hypothesis[]
  figureMap: Map<string, number>
  refMap: Map<string, number>
}) {
  const figureHypotheses = hypotheses.filter(
    (h) => (h.visualization_mermaid || h.visualization_svg) && figureMap.has(h.id)
  )
  if (figureHypotheses.length === 0) return null

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: figureHypotheses.length === 1 ? "1fr" : "repeat(2, 1fr)",
        gap: 20,
      }}
    >
      {figureHypotheses.map((h) => {
        const figNum = figureMap.get(h.id)!
        const idx = refMap.get(h.id) ?? 0
        const statusStyle = STATUS_STYLE[h.status] ?? STATUS_STYLE.queued

        return (
          <div
            key={h.id}
            style={{
              display: "flex",
              flexDirection: "column",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--bg-card)",
            }}
          >
            {/* Diagram */}
            <div style={{ background: "var(--bg-card)", minHeight: 180 }}>
              {h.visualization_mermaid ? (
                <MermaidDiagram code={h.visualization_mermaid} />
              ) : (
                <div
                  style={{ background: "#080809", lineHeight: 0 }}
                  dangerouslySetInnerHTML={{ __html: makeSvgResponsive(h.visualization_svg!) }}
                />
              )}
            </div>

            {/* Caption */}
            <div
              style={{
                padding: "10px 14px 12px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-elevated)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Figure {figNum}.
                </span>
                <span style={{ fontSize: 11, color: "var(--text-primary)", lineHeight: 1.5, fontWeight: 500 }}>
                  {h.title}
                </span>
              </div>
              {h.approach && (
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    lineHeight: 1.55,
                    margin: "0 0 6px",
                    fontStyle: "italic",
                  }}
                >
                  {truncate(h.approach, 120)}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 3,
                    padding: "1px 5px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  [{refId(idx)}]
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: statusStyle.color,
                    border: `1px solid ${statusStyle.border}`,
                    borderRadius: 3,
                    padding: "1px 5px",
                    letterSpacing: "0.06em",
                  }}
                >
                  {statusStyle.label}
                </span>
                <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>
                  {Math.round(h.plausibility_score * 100)}% plausibility
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Make SVG fill its container ────────────────────────────────────────────

function makeSvgResponsive(svg: string): string {
  return svg
    .replace(/(<svg[^>]*)\s+width="[^"]*"/, "$1")
    .replace(/(<svg[^>]*)\s+height="[^"]*"/, "$1")
    .replace("<svg", '<svg width="100%" height="auto"')
}

// ── TOC ────────────────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: "abstract", label: "Abstract" },
  { id: "introduction", label: "Introduction" },
  { id: "methodology", label: "Methodology" },
  { id: "results", label: "Results" },
  { id: "figures", label: "Figures" },
  { id: "key-insights", label: "Key Insights" },
  { id: "discussion", label: "Discussion" },
  { id: "promising", label: "Directions" },
  { id: "eliminated", label: "Eliminated" },
  { id: "limitations", label: "Limitations" },
  { id: "conclusion", label: "Conclusion" },
  { id: "next-steps", label: "Next Steps" },
  { id: "references", label: "References" },
]

// ── Main component ─────────────────────────────────────────────────────────

export default function ResearchPaperView({ program, briefing, hypotheses, onHypothesisClick }: Props) {
  const [activeSection, setActiveSection] = useState("abstract")
  const [showAllExperiments, setShowAllExperiments] = useState(false)
  const [highlightedRef, setHighlightedRef] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const referenceRowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Scroll spy
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    TOC_ITEMS.forEach(({ id }) => {
      const el = sectionRefs.current[id]
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [briefing])

  const scrollTo = useCallback((id: string) => {
    const el = sectionRefs.current[id]
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  const setSectionRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => { sectionRefs.current[id] = el },
    []
  )

  // Called when a [H-NNN] citation badge is clicked
  const handleCitationClick = useCallback((ref: string) => {
    setHighlightedRef(ref)
    const el = referenceRowRefs.current[ref]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // Clear highlight after 2s
      setTimeout(() => setHighlightedRef(null), 2000)
    } else {
      // Scroll to references section fallback
      const sec = sectionRefs.current["references"]
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" })
      setTimeout(() => setHighlightedRef(null), 2000)
    }
  }, [])

  const mc = program.master_context
  const sortedHypotheses = [...hypotheses].sort((a, b) => b.plausibility_score - a.plausibility_score)
  const succeededHypotheses = sortedHypotheses.filter((h) => h.status === "succeeded")
  const failedHypotheses = sortedHypotheses.filter((h) => h.status === "failed")

  const displayedExperiments = showAllExperiments ? sortedHypotheses : sortedHypotheses.slice(0, 20)

  // ref-id map keyed by hypothesis.id
  const refMap = new Map(sortedHypotheses.map((h, i) => [h.id, i]))

  // Figure number map
  const figureMap = new Map<string, number>()
  let figureCounter = 1
  for (const h of sortedHypotheses) {
    if (h.visualization_mermaid || h.visualization_svg) {
      figureMap.set(h.id, figureCounter++)
    }
  }

  const hasFigures = figureMap.size > 0

  const generationCounts = hypotheses.reduce<Record<number, number>>((acc, h) => {
    acc[h.generation] = (acc[h.generation] || 0) + 1
    return acc
  }, {})

  const formattedDate = briefing
    ? new Date(briefing.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  // ── No briefing state ───────────────────────────────────────────────────
  if (!briefing) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          gap: 10,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: 32, lineHeight: 1, letterSpacing: "-0.02em" }}>[ ]</div>
        <div style={{ fontSize: 13 }}>No synthesis generated yet</div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.6,
            maxWidth: 340,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Click "Open Cross-Synthesis" after agents have completed experiments to generate the full research paper.
        </div>
        {hypotheses.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--stream-blue)" }}>
            {hypotheses.length} experiments available for synthesis
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", gap: 0, width: "100%", minHeight: "100%" }}>
      {/* ── Table of Contents (sticky sidebar) ─────────────────────────── */}
      <div
        style={{
          width: 160,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          padding: "28px 0 28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Contents
        </div>
        {TOC_ITEMS.filter(({ id }) => {
          if (id === "figures" && !hasFigures) return false
          if (id === "limitations" && !briefing.limitations) return false
          if (id === "key-insights") return !!(mc?.key_insights && mc.key_insights.length > 0)
          if (id === "promising") return !!(mc?.promising_directions && mc.promising_directions.length > 0)
          if (id === "eliminated")
            return !!((mc?.eliminated_approaches && mc.eliminated_approaches.length > 0) ||
              (briefing.dead_ends && briefing.dead_ends.length > 0))
          return true
        }).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "3px 0",
              textAlign: "left",
              fontSize: 11,
              color: activeSection === id ? "var(--text-primary)" : "var(--text-muted)",
              borderLeft: `2px solid ${activeSection === id ? "var(--stream-blue)" : "transparent"}`,
              paddingLeft: 8,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {label}
          </button>
        ))}

        {/* Stats */}
        <div
          style={{
            marginTop: 24,
            padding: "10px 10px 10px 8px",
            borderLeft: "2px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Stats
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--stream-green)" }}>{succeededHypotheses.length}</span> succeeded
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--stream-red)" }}>{failedHypotheses.length}</span> failed
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--stream-blue)" }}>{hypotheses.length}</span> total
          </div>
          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--stream-blue)" }}>
              {Math.round((mc?.confidence_level || 0) * 100)}%
            </span>{" "}
            confidence
          </div>
        </div>
      </div>

      {/* ── Main paper content ──────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "28px 32px 80px 24px",
          maxWidth: 820,
        }}
      >
        {/* ── Paper header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Axiom Synthesis Report · {formattedDate}
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              margin: "0 0 8px",
            }}
          >
            {program.title}
          </h1>

          {/* Author / institution line */}
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 8,
              fontStyle: "italic",
            }}
          >
            Axiom Autonomous Research System &nbsp;·&nbsp;{" "}
            <span style={{ textTransform: "capitalize" }}>{program.domain.replace(/_/g, " ")}</span>
          </div>

          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              margin: "0 0 18px",
              fontStyle: "italic",
            }}
          >
            {program.research_question}
          </p>

          {/* Metadata strip */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              paddingTop: 14,
              borderTop: "1px solid var(--border)",
            }}
          >
            <MetaBadge label="Domain" value={program.domain.replace(/_/g, " ")} />
            <MetaBadge label="Experiments" value={String(hypotheses.length)} />
            <MetaBadge
              label="Succeeded"
              value={String(succeededHypotheses.length)}
              color="var(--stream-green)"
            />
            <MetaBadge
              label="Failed"
              value={String(failedHypotheses.length)}
              color="var(--stream-red)"
            />
            <MetaBadge
              label="Confidence"
              value={`${Math.round((mc?.confidence_level || 0) * 100)}%`}
              color="var(--stream-blue)"
            />
            {Object.keys(generationCounts).length > 1 && (
              <MetaBadge
                label="Generations"
                value={String(Math.max(...Object.keys(generationCounts).map(Number)) + 1)}
              />
            )}
          </div>
        </div>

        <div style={{ height: 1, background: "var(--border)", marginBottom: 40 }} />

        {/* ── Abstract ──────────────────────────────────────────────────── */}
        <div ref={setSectionRef("abstract")} style={{ marginBottom: 32 }}>
          <SectionDivider id="abstract" title="Abstract" />
          <div
            style={{
              padding: "16px 20px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            <CitationProseBlock
              text={briefing.abstract || briefing.executive_summary}
              onCitationClick={handleCitationClick}
            />
          </div>
        </div>

        {/* ── Keywords ──────────────────────────────────────────────────── */}
        {briefing.keywords && briefing.keywords.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Keywords
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {briefing.keywords.map((kw, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "3px 9px",
                    lineHeight: 1.5,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Introduction ──────────────────────────────────────────────── */}
        <div ref={setSectionRef("introduction")} style={{ marginBottom: 40 }}>
          <SectionDivider id="introduction" number="1." title="Introduction" />
          <CitationProseBlock text={briefing.introduction} onCitationClick={handleCitationClick} />
        </div>

        {/* ── Methodology ───────────────────────────────────────────────── */}
        <div ref={setSectionRef("methodology")} style={{ marginBottom: 40 }}>
          <SectionDivider id="methodology" number="2." title="Methodology" />
          <CitationProseBlock text={briefing.methodology} onCitationClick={handleCitationClick} />
          {Object.keys(generationCounts).length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Hypothesis Tree
              </div>
              {Object.entries(generationCounts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([gen, count]) => (
                  <div key={gen} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", width: 72 }}>
                      Generation {gen}
                    </span>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: "var(--stream-blue)",
                        opacity: 0.5 + Number(gen) * 0.1,
                        width: Math.min(count * 12, 240),
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{count} hypotheses</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        <div ref={setSectionRef("results")} style={{ marginBottom: 40 }}>
          <SectionDivider id="results" number="3." title="Results" />

          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              {
                label: "Breakthrough Findings",
                count: briefing.key_findings.filter((f) => f.significance === "breakthrough").length,
                color: "var(--stream-green)",
              },
              {
                label: "Promising Results",
                count: briefing.key_findings.filter((f) => f.significance === "promising").length,
                color: "var(--stream-blue)",
              },
              {
                label: "Neutral",
                count: briefing.key_findings.filter((f) => f.significance === "neutral").length,
                color: "var(--text-muted)",
              },
              { label: "Dead Ends", count: failedHypotheses.length, color: "var(--stream-red)" },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                style={{
                  padding: "8px 14px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>

          {briefing.key_findings.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Key Findings
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {briefing.key_findings.map((finding, i) => {
                  const sigStyle =
                    finding.significance === "breakthrough"
                      ? {
                          color: "var(--stream-green)",
                          border: "rgba(34,197,94,0.2)",
                          bg: "rgba(34,197,94,0.05)",
                          label: "BREAKTHROUGH",
                        }
                      : finding.significance === "promising"
                      ? {
                          color: "var(--stream-blue)",
                          border: "rgba(59,130,246,0.2)",
                          bg: "rgba(59,130,246,0.05)",
                          label: "PROMISING",
                        }
                      : finding.significance === "dead_end"
                      ? {
                          color: "var(--stream-red)",
                          border: "rgba(239,68,68,0.2)",
                          bg: "rgba(239,68,68,0.05)",
                          label: "DEAD END",
                        }
                      : {
                          color: "var(--text-muted)",
                          border: "rgba(113,113,122,0.15)",
                          bg: "rgba(113,113,122,0.04)",
                          label: "NEUTRAL",
                        }

                  const hypoIdx = sortedHypotheses.findIndex((h) => h.id === finding.hypothesis_id)
                  const ref = hypoIdx >= 0 ? refId(hypoIdx) : null

                  return (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        border: `1px solid ${sigStyle.border}`,
                        background: sigStyle.bg,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span
                          style={{
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 3,
                            border: `1px solid ${sigStyle.border}`,
                            color: sigStyle.color,
                            letterSpacing: "0.07em",
                          }}
                        >
                          {sigStyle.label}
                        </span>
                        <span
                          style={{ fontWeight: 500, fontSize: 12, color: "var(--text-primary)" }}
                        >
                          {finding.title}
                        </span>
                        {ref && (
                          <span
                            style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}
                          >
                            [{ref}]
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          margin: 0,
                          lineHeight: 1.65,
                        }}
                      >
                        {finding.summary}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All experiments */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              All Experiments ({hypotheses.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {displayedExperiments.map((h) => {
                const idx = refMap.get(h.id) ?? 0
                return (
                  <ExperimentCard
                    key={h.id}
                    hypothesis={h}
                    index={idx}
                    figureNumber={figureMap.get(h.id) ?? null}
                    defaultExpanded={false}
                  />
                )
              })}
            </div>
            {sortedHypotheses.length > 20 && (
              <button
                onClick={() => setShowAllExperiments((v) => !v)}
                style={{
                  marginTop: 10,
                  padding: "6px 14px",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: "var(--stream-blue)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {showAllExperiments
                  ? "Show fewer experiments"
                  : `Show all ${sortedHypotheses.length} experiments`}
              </button>
            )}
          </div>
        </div>

        {/* ── Figure Gallery ─────────────────────────────────────────────── */}
        {hasFigures && (
          <div ref={setSectionRef("figures")} style={{ marginBottom: 40 }}>
            <SectionDivider id="figures" title="Figures" />
            <FigureGallery
              hypotheses={sortedHypotheses}
              figureMap={figureMap}
              refMap={refMap}
            />
          </div>
        )}

        {/* ── Key Insights ──────────────────────────────────────────────── */}
        {mc?.key_insights && mc.key_insights.length > 0 && (
          <div ref={setSectionRef("key-insights")} style={{ marginBottom: 40 }}>
            <SectionDivider id="key-insights" number="4." title="Key Insights" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mc.key_insights.map((insight, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "10px 14px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--stream-blue)",
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                    {insight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Discussion ────────────────────────────────────────────────── */}
        <div ref={setSectionRef("discussion")} style={{ marginBottom: 40 }}>
          <SectionDivider id="discussion" number="5." title="Discussion" />
          <CitationProseBlock
            text={briefing.discussion || briefing.narrative}
            onCitationClick={handleCitationClick}
          />
        </div>

        {/* ── Promising Directions ──────────────────────────────────────── */}
        {mc?.promising_directions && mc.promising_directions.length > 0 && (
          <div ref={setSectionRef("promising")} style={{ marginBottom: 40 }}>
            <SectionDivider id="promising" number="6." title="Promising Directions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mc.promising_directions.map((dir, i) => (
                <div key={i} style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: "var(--stream-green)", flexShrink: 0, marginTop: 2 }}>→</span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{dir}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Eliminated Approaches ─────────────────────────────────────── */}
        {((mc?.eliminated_approaches && mc.eliminated_approaches.length > 0) ||
          (briefing.dead_ends && briefing.dead_ends.length > 0)) && (
          <div ref={setSectionRef("eliminated")} style={{ marginBottom: 40 }}>
            <SectionDivider id="eliminated" number="7." title="Eliminated Approaches" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mc?.eliminated_approaches?.map((approach, i) => (
                <div key={`mc-${i}`} style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: "var(--stream-red)", flexShrink: 0 }}>×</span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{approach}</span>
                </div>
              ))}
              {briefing.dead_ends
                .filter(
                  (d) =>
                    !(mc?.eliminated_approaches || []).some((e) => e.includes(d.slice(0, 20)))
                )
                .map((d, i) => (
                  <div key={`de-${i}`} style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "var(--stream-red)", flexShrink: 0, opacity: 0.6 }}>×</span>
                    <span
                      style={{ color: "var(--text-secondary)", lineHeight: 1.65, opacity: 0.8 }}
                    >
                      {d}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Limitations ───────────────────────────────────────────────── */}
        {briefing.limitations && (
          <div ref={setSectionRef("limitations")} style={{ marginBottom: 40 }}>
            <SectionDivider id="limitations" number="8." title="Limitations" />
            <div
              style={{
                padding: "14px 18px",
                background: "rgba(234,179,8,0.04)",
                border: "1px solid rgba(234,179,8,0.15)",
                borderRadius: 6,
              }}
            >
              <CitationProseBlock
                text={briefing.limitations}
                onCitationClick={handleCitationClick}
              />
            </div>
          </div>
        )}

        {/* ── Conclusion ────────────────────────────────────────────────── */}
        <div ref={setSectionRef("conclusion")} style={{ marginBottom: 40 }}>
          <SectionDivider id="conclusion" number="9." title="Conclusion" />
          <CitationProseBlock text={briefing.conclusion} onCitationClick={handleCitationClick} />
          {mc?.current_focus && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "rgba(59,130,246,0.05)",
                border: "1px solid rgba(59,130,246,0.18)",
                borderRadius: 5,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "var(--stream-blue)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Current Focus
              </div>
              <p
                style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}
              >
                {mc.current_focus}
              </p>
            </div>
          )}
        </div>

        {/* ── Next Steps ────────────────────────────────────────────────── */}
        {briefing.recommended_next_steps && briefing.recommended_next_steps.length > 0 && (
          <div ref={setSectionRef("next-steps")} style={{ marginBottom: 40 }}>
            <SectionDivider id="next-steps" number="10." title="Recommended Next Steps" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {briefing.recommended_next_steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14, fontSize: 12 }}>
                  <span
                    style={{
                      color: "var(--stream-blue)",
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                      marginTop: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── References ────────────────────────────────────────────────── */}
        <div ref={setSectionRef("references")} style={{ marginBottom: 40 }}>
          <SectionDivider id="references" number="Ref." title="References" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedHypotheses.map((h, i) => {
              const statusStyle = STATUS_STYLE[h.status] ?? STATUS_STYLE.queued
              const clickable = !!onHypothesisClick
              const rid = refId(i)
              const isHighlighted = highlightedRef === rid
              const score = Math.round(h.plausibility_score * 100)

              return (
                <div
                  key={h.id}
                  ref={(el) => { referenceRowRefs.current[rid] = el }}
                  onClick={clickable ? () => onHypothesisClick(h.id) : undefined}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "10px 12px",
                    borderRadius: 5,
                    border: `1px solid ${isHighlighted ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                    background: isHighlighted
                      ? "rgba(59,130,246,0.06)"
                      : "transparent",
                    cursor: clickable ? "pointer" : "default",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={
                    clickable
                      ? (e) => {
                          ;(e.currentTarget as HTMLDivElement).style.background =
                            "var(--bg-elevated)"
                        }
                      : undefined
                  }
                  onMouseLeave={
                    clickable
                      ? (e) => {
                          ;(e.currentTarget as HTMLDivElement).style.background = isHighlighted
                            ? "rgba(59,130,246,0.06)"
                            : "transparent"
                        }
                      : undefined
                  }
                >
                  {/* Ref ID column */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 46,
                      paddingTop: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "monospace",
                      }}
                    >
                      [{rid}]
                    </span>
                  </div>

                  {/* Bibliographic content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title line */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: clickable ? "var(--stream-blue)" : "var(--text-primary)",
                          fontWeight: 500,
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        &ldquo;{h.title}&rdquo;
                      </span>
                      {clickable && (
                        <span
                          style={{
                            color: "var(--stream-blue)",
                            fontSize: 9,
                            flexShrink: 0,
                            opacity: 0.6,
                            marginTop: 3,
                          }}
                        >
                          ↗
                        </span>
                      )}
                    </div>

                    {/* Bibliographic meta line */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: h.approach || h.conclusion || h.failure_reason ? 6 : 0,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                          borderRadius: 3,
                          padding: "1px 5px",
                          letterSpacing: "0.07em",
                        }}
                      >
                        {statusStyle.label}
                      </span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                        Plausibility: {score}%
                      </span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                        · Gen {h.generation}
                      </span>
                    </div>

                    {/* Approach excerpt */}
                    {h.approach && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          lineHeight: 1.55,
                          margin: "0 0 4px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--text-secondary)",
                          }}
                        >
                          Approach:{" "}
                        </span>
                        {truncate(h.approach, 160)}
                      </p>
                    )}

                    {/* Conclusion / failure reason excerpt */}
                    {(h.conclusion || h.failure_reason) && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          lineHeight: 1.55,
                          margin: 0,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {h.status === "failed" ? "Failure: " : "Conclusion: "}
                        </span>
                        {truncate(h.conclusion || h.failure_reason, 200)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Meta badge ─────────────────────────────────────────────────────────────

function MetaBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 4,
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{ fontSize: 11, color: color || "var(--text-secondary)", textTransform: "capitalize" }}
      >
        {value}
      </span>
    </div>
  )
}
