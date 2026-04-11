"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import type { Briefing, ResearchProgram, Hypothesis } from "@/lib/types"

interface Props {
  program: ResearchProgram
  briefing: Briefing | null
  hypotheses: Hypothesis[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function refId(index: number) {
  return `H-${String(index + 1).padStart(3, "0")}`
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 2,
        }}
      >
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
        <div
          style={{
            flex: 1,
            height: 1,
            background: "var(--border)",
          }}
        />
      </div>
    </div>
  )
}

function ProseBlock({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{ fontSize: 13, lineHeight: 1.85, color: "var(--text-secondary)" }}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 14px", color: "var(--text-secondary)" }}>{children}</p>
          ),
          h1: ({ children }) => (
            <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "20px 0 8px" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "16px 0 6px" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "12px 0 4px" }}>
              {children}
            </h3>
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
            <li style={{ color: "var(--text-secondary)", marginBottom: 5, lineHeight: 1.7 }}>
              {children}
            </li>
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
  defaultExpanded,
}: {
  hypothesis: Hypothesis
  index: number
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
      {/* Row header — always visible */}
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
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
          Gen {hypothesis.generation}
        </span>
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

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Approach */}
          {hypothesis.approach && (
            <div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                Approach
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {hypothesis.approach}
              </p>
            </div>
          )}

          {/* Findings */}
          {hypothesis.findings && hypothesis.findings.length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Findings
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {hypothesis.findings.map((f, fi) => (
                  <div
                    key={fi}
                    style={{
                      display: "flex",
                      gap: 8,
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ color: FINDING_COLOR[f.type] ?? "var(--text-muted)", flexShrink: 0, fontSize: 10, marginTop: 2 }}>
                      ◆
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{f.description}</span>
                      {f.implication && (
                        <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
                          → {f.implication}
                        </span>
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

          {/* Conclusion / failure reason */}
          {(hypothesis.conclusion || hypothesis.failure_reason) && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                background: hypothesis.status === "failed"
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(34,197,94,0.05)",
                border: `1px solid ${hypothesis.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"}`,
              }}
            >
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
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

// ── TOC ────────────────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: "abstract", label: "Abstract" },
  { id: "introduction", label: "Introduction" },
  { id: "methodology", label: "Methodology" },
  { id: "results", label: "Results" },
  { id: "key-insights", label: "Key Insights" },
  { id: "discussion", label: "Discussion" },
  { id: "promising", label: "Directions" },
  { id: "eliminated", label: "Eliminated" },
  { id: "conclusion", label: "Conclusion" },
  { id: "next-steps", label: "Next Steps" },
  { id: "references", label: "References" },
]

// ── Main component ─────────────────────────────────────────────────────────

export default function ResearchPaperView({ program, briefing, hypotheses }: Props) {
  const [activeSection, setActiveSection] = useState("abstract")
  const [showAllExperiments, setShowAllExperiments] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Scroll spy via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    TOC_ITEMS.forEach(({ id }) => {
      const el = sectionRefs.current[id]
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id)
        },
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
    (id: string) => (el: HTMLDivElement | null) => {
      sectionRefs.current[id] = el
    },
    []
  )

  const mc = program.master_context
  const sortedHypotheses = [...hypotheses].sort((a, b) => b.plausibility_score - a.plausibility_score)
  const succeededHypotheses = sortedHypotheses.filter((h) => h.status === "succeeded")
  const failedHypotheses = sortedHypotheses.filter((h) => h.status === "failed")
  const otherHypotheses = sortedHypotheses.filter(
    (h) => h.status !== "succeeded" && h.status !== "failed"
  )

  const displayedExperiments = showAllExperiments ? sortedHypotheses : sortedHypotheses.slice(0, 20)

  // Build ref-id map keyed by hypothesis.id
  const refMap = new Map(sortedHypotheses.map((h, i) => [h.id, i]))

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
        <div style={{ fontSize: 11, opacity: 0.6, maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}>
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
    <div
      style={{
        display: "flex",
        gap: 0,
        width: "100%",
        minHeight: "100%",
      }}
    >
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
        {TOC_ITEMS.map(({ id, label }) => (
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
          <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
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
          {/* Top line */}
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

          {/* Title */}
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              margin: "0 0 10px",
            }}
          >
            {program.title}
          </h1>

          {/* Research question */}
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 18px", fontStyle: "italic" }}>
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
            <MetaBadge label="Succeeded" value={String(succeededHypotheses.length)} color="var(--stream-green)" />
            <MetaBadge label="Failed" value={String(failedHypotheses.length)} color="var(--stream-red)" />
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

        {/* Full border divider */}
        <div style={{ height: 1, background: "var(--border)", marginBottom: 40 }} />

        {/* ── Abstract ──────────────────────────────────────────────────── */}
        <div ref={setSectionRef("abstract")} style={{ marginBottom: 40 }}>
          <SectionDivider id="abstract" title="Abstract" />
          <div
            style={{
              padding: "16px 20px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            <ProseBlock text={briefing.abstract || briefing.executive_summary} />
          </div>
        </div>

        {/* ── Introduction ──────────────────────────────────────────────── */}
        <div ref={setSectionRef("introduction")} style={{ marginBottom: 40 }}>
          <SectionDivider id="introduction" number="1." title="Introduction" />
          <ProseBlock text={briefing.introduction} />
        </div>

        {/* ── Methodology ───────────────────────────────────────────────── */}
        <div ref={setSectionRef("methodology")} style={{ marginBottom: 40 }}>
          <SectionDivider id="methodology" number="2." title="Methodology" />
          <ProseBlock text={briefing.methodology} />
          {/* Generation tree summary */}
          {Object.keys(generationCounts).length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
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

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Breakthrough Findings", count: briefing.key_findings.filter((f) => f.significance === "breakthrough").length, color: "var(--stream-green)" },
              { label: "Promising Results", count: briefing.key_findings.filter((f) => f.significance === "promising").length, color: "var(--stream-blue)" },
              { label: "Neutral", count: briefing.key_findings.filter((f) => f.significance === "neutral").length, color: "var(--text-muted)" },
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

          {/* Key findings from briefing */}
          {briefing.key_findings.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                Key Findings
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {briefing.key_findings.map((finding, i) => {
                  const sigStyle =
                    finding.significance === "breakthrough"
                      ? { color: "var(--stream-green)", border: "rgba(34,197,94,0.2)", bg: "rgba(34,197,94,0.05)", label: "BREAKTHROUGH" }
                      : finding.significance === "promising"
                      ? { color: "var(--stream-blue)", border: "rgba(59,130,246,0.2)", bg: "rgba(59,130,246,0.05)", label: "PROMISING" }
                      : finding.significance === "dead_end"
                      ? { color: "var(--stream-red)", border: "rgba(239,68,68,0.2)", bg: "rgba(239,68,68,0.05)", label: "DEAD END" }
                      : { color: "var(--text-muted)", border: "rgba(113,113,122,0.15)", bg: "rgba(113,113,122,0.04)", label: "NEUTRAL" }

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
                        <span style={{ fontWeight: 500, fontSize: 12, color: "var(--text-primary)" }}>
                          {finding.title}
                        </span>
                        {ref && (
                          <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>
                            [{ref}]
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.65 }}>
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
            <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
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
          <ProseBlock text={briefing.discussion || briefing.narrative} />
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
              {/* From master context */}
              {mc?.eliminated_approaches?.map((approach, i) => (
                <div key={`mc-${i}`} style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: "var(--stream-red)", flexShrink: 0 }}>×</span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{approach}</span>
                </div>
              ))}
              {/* From briefing dead ends (de-duplicate with MC ones visually) */}
              {briefing.dead_ends
                .filter((d) => !(mc?.eliminated_approaches || []).some((e) => e.includes(d.slice(0, 20))))
                .map((d, i) => (
                  <div key={`de-${i}`} style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "var(--stream-red)", flexShrink: 0, opacity: 0.6 }}>×</span>
                    <span style={{ color: "var(--text-secondary)", lineHeight: 1.65, opacity: 0.8 }}>{d}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Conclusion ────────────────────────────────────────────────── */}
        <div ref={setSectionRef("conclusion")} style={{ marginBottom: 40 }}>
          <SectionDivider id="conclusion" number="8." title="Conclusion" />
          <ProseBlock text={briefing.conclusion} />
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
              <div style={{ fontSize: 9, color: "var(--stream-blue)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Current Focus
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                {mc.current_focus}
              </p>
            </div>
          )}
        </div>

        {/* ── Next Steps ────────────────────────────────────────────────── */}
        {briefing.recommended_next_steps && briefing.recommended_next_steps.length > 0 && (
          <div ref={setSectionRef("next-steps")} style={{ marginBottom: 40 }}>
            <SectionDivider id="next-steps" number="9." title="Recommended Next Steps" />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {sortedHypotheses.map((h, i) => {
              const style = STATUS_STYLE[h.status] ?? STATUS_STYLE.queued
              return (
                <div
                  key={h.id}
                  style={{ display: "flex", gap: 10, fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(42,42,46,0.5)" }}
                >
                  <span style={{ color: "var(--text-muted)", flexShrink: 0, width: 40, fontVariantNumeric: "tabular-nums" }}>
                    [{refId(i)}]
                  </span>
                  <span style={{ flex: 1, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {h.title}
                  </span>
                  <span style={{ color: style.color, fontSize: 9, flexShrink: 0, alignSelf: "center" }}>
                    {style.label}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 9, flexShrink: 0, alignSelf: "center", width: 28, textAlign: "right" }}>
                    {Math.round(h.plausibility_score * 100)}%
                  </span>
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
      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: color || "var(--text-secondary)", textTransform: "capitalize" }}>
        {value}
      </span>
    </div>
  )
}
