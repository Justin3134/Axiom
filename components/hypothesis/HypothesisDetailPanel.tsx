"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { Hypothesis, AgentLog, LogType, FindingType } from "@/lib/types"
import { useAgentStream } from "@/hooks/useAgentStream"

// ── Accent colors ──────────────────────────────────────────────
const ACCENT_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"]
const accentFor = (i: number) => ACCENT_COLORS[i % ACCENT_COLORS.length]

// ── Status config ──────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  queued: "#71717a", running: "#3b82f6", succeeded: "#22c55e",
  failed: "#ef4444", pruned: "#52525b", paused: "#eab308",
}
const STATUS_LABELS: Record<string, string> = {
  queued: "Queued", running: "Running", succeeded: "Succeeded",
  failed: "Failed", pruned: "Pruned", paused: "Paused",
}

// ── Finding type colors ────────────────────────────────────────
const FINDING_COLORS: Record<FindingType, string> = {
  positive: "#22c55e", negative: "#ef4444", neutral: "#71717a", unexpected: "#eab308",
}

// ── Log type colors + prefixes ─────────────────────────────────
const LOG_COLORS: Record<LogType, string> = {
  thought: "#52525b", plan: "#3b82f6", code: "#6366f1",
  executing: "#eab308", result: "#f4f4f5", finding: "#22c55e",
  error: "#ef4444", milestone: "#22c55e", pausing: "#eab308",
}
const LOG_PREFIXES: Record<LogType, string> = {
  thought: "~", plan: "#", code: ">", executing: "»",
  result: "+", finding: "✓", error: "×", milestone: "★", pausing: "—",
}

// ── Research stage definitions ─────────────────────────────────
const STAGES = [
  { label: "Plan",      types: ["thought", "plan"] as LogType[] },
  { label: "Execute",   types: ["code", "executing"] as LogType[] },
  { label: "Analyze",   types: ["result", "finding", "milestone"] as LogType[] },
  { label: "Complete",  types: [] as LogType[] },
]

function stageIndexFromLogs(logs: AgentLog[], status: string): number {
  if (status === "succeeded" || status === "failed" || status === "pruned") return 3
  if (logs.length === 0) return 0
  const last = logs[logs.length - 1]
  if (["result", "finding", "milestone"].includes(last.type)) return 2
  if (["code", "executing"].includes(last.type)) return 1
  return 0
}

// ── Extract web sources (Tavily) ──────────────────────────────
interface WebSource {
  title: string
  url: string
  snippet?: string
  score?: number
}

function extractWebSources(logs: AgentLog[]): WebSource[] {
  const seen = new Set<string>()
  const out: WebSource[] = []
  for (const log of logs) {
    const m = log.metadata
    if (!m) continue
    const sources = Array.isArray(m.web_sources) ? m.web_sources : []
    for (const s of sources) {
      if (!s || typeof s !== "object") continue
      const url = String((s as Record<string, unknown>).url ?? "").trim()
      if (!url || seen.has(url)) continue
      seen.add(url)
      out.push({
        title: String((s as Record<string, unknown>).title ?? url),
        url,
        snippet: (s as Record<string, unknown>).snippet != null ? String((s as Record<string, unknown>).snippet) : undefined,
        score: typeof (s as Record<string, unknown>).score === "number" ? (s as Record<string, unknown>).score as number : undefined,
      })
    }
  }
  return out
}

// ── Extract citations ──────────────────────────────────────────
function extractCitations(logs: AgentLog[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const log of logs) {
    const m = log.metadata
    if (!m) continue
    const candidates = [
      m.url, m.source, m.citation, m.reference, m.link, m.doi, m.paper,
      ...(Array.isArray(m.urls) ? m.urls : []),
      ...(Array.isArray(m.sources) ? m.sources : []),
      ...(Array.isArray(m.citations) ? m.citations : []),
    ].filter(Boolean) as string[]
    for (const c of candidates) {
      const key = String(c).trim()
      if (key && !seen.has(key)) { seen.add(key); out.push(key) }
    }
  }
  return out
}

// ── Collapsible section ────────────────────────────────────────
function Section({ label, right, defaultOpen = false, children }: {
  label: string
  right?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: "#0e0e10", border: "1px solid #1a1a1e", borderRadius: 9, overflow: "hidden", marginBottom: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 16px", background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit", gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#52525b", fontWeight: 600 }}>
            {label}
          </span>
          {right}
        </div>
        <span style={{ fontSize: 10, color: "#3f3f46", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", lineHeight: 1 }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #1a1a1e" }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Research Timeline ──────────────────────────────────────────
function ResearchTimeline({ logs, status, accent, isRunning }: {
  logs: AgentLog[]
  status: string
  accent: string
  isRunning: boolean
}) {
  const currentStage = stageIndexFromLogs(logs, status)

  return (
    <div
      style={{
        background: "#0a0a0c",
        border: "1px solid #1a1a1e",
        borderRadius: 9,
        overflow: "hidden",
        marginBottom: 10,
      }}
    >
      {/* Stage progress bar */}
      <div style={{ padding: "12px 16px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
          {STAGES.map((stage, i) => {
            const isActive = i === currentStage
            const isDone = i < currentStage
            const color = isDone || isActive ? accent : "#27272a"
            const labelColor = isDone ? accent + "99" : isActive ? accent : "#3f3f46"

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : 0 }}>
                {/* Node */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <div
                    style={{
                      width: isActive ? 10 : 7,
                      height: isActive ? 10 : 7,
                      borderRadius: "50%",
                      background: isDone ? accent : isActive ? accent : "#27272a",
                      border: isActive ? `2px solid ${accent}44` : "none",
                      boxShadow: isActive && isRunning ? `0 0 8px ${accent}88` : "none",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                    className={isActive && isRunning ? "pulse-glow" : undefined}
                  />
                  <span style={{ fontSize: 8, color: labelColor, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    {stage.label}
                  </span>
                </div>
                {/* Connector line */}
                {i < STAGES.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: isDone ? accent + "66" : "#1e1e22",
                      margin: "0 4px",
                      marginBottom: 14,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ── Make SVG fill its container ────────────────────────────────
function makeSvgResponsive(svg: string): string {
  return svg
    .replace(/(<svg[^>]*)\s+width="[^"]*"/, "$1")
    .replace(/(<svg[^>]*)\s+height="[^"]*"/, "$1")
    .replace("<svg", '<svg width="100%" height="100%"')
}

// ── SVG visualization block ────────────────────────────────────
function VisualizationBlock({ hypothesis, accent }: { hypothesis: Hypothesis; accent: string }) {
  const [generating, setGenerating] = useState(false)
  const [svg, setSvg] = useState<string | null>(hypothesis.visualization_svg ?? null)
  const [err, setErr] = useState(false)

  const generate = useCallback(async () => {
    setGenerating(true)
    setErr(false)
    try {
      const res = await fetch(`/api/hypotheses/${hypothesis.id}/visualization`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setSvg(data.svg)
      } else {
        setErr(true)
      }
    } catch {
      setErr(true)
    } finally {
      setGenerating(false)
    }
  }, [hypothesis.id])

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: 380,
    borderRadius: 10,
    border: `1px solid ${accent}33`,
    background: "#080809",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 0 32px ${accent}0d`,
    marginTop: 16,
  }

  if (svg) {
    return (
      <div
        style={containerStyle}
        dangerouslySetInnerHTML={{ __html: makeSvgResponsive(svg) }}
      />
    )
  }

  return (
    <button
      onClick={generate}
      disabled={generating}
      style={{
        ...containerStyle,
        border: `1px dashed ${err ? "#ef444444" : accent + "2a"}`,
        background: "transparent",
        color: err ? "#ef444466" : accent + "55",
        fontSize: 12,
        cursor: generating ? "default" : "pointer",
        fontFamily: "inherit",
        letterSpacing: "0.06em",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!generating && !err) {
          const el = e.currentTarget
          el.style.borderColor = accent + "55"
          el.style.color = accent + "cc"
          el.style.background = accent + "06"
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = err ? "#ef444444" : accent + "2a"
        el.style.color = err ? "#ef444466" : accent + "55"
        el.style.background = "transparent"
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1, opacity: generating ? 0.5 : 0.7 }}>
        {generating ? "◌" : err ? "×" : "◈"}
      </span>
      <span style={{ textAlign: "center", lineHeight: 1.6 }}>
        {generating
          ? "Generating visualization…"
          : err
          ? "Service offline — click to retry"
          : "Generate Visual"}
      </span>
      {!generating && !err && (
        <span style={{ fontSize: 10, opacity: 0.4, letterSpacing: "0.04em" }}>
          AI-generated diagram of this approach
        </span>
      )}
    </button>
  )
}

// ── Journal log line ───────────────────────────────────────────
function JournalLine({ log }: { log: AgentLog }) {
  const color = LOG_COLORS[log.type] ?? "#a1a1aa"
  const prefix = LOG_PREFIXES[log.type] ?? "›"
  const [codeOpen, setCodeOpen] = useState(false)
  const time = new Date(log.created_at).toLocaleTimeString("en-US", {
    hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  })

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "3px 0" }}>
      <span style={{ fontSize: 10, color: "#3f3f46", flexShrink: 0, fontVariantNumeric: "tabular-nums", lineHeight: 1.6 }}>
        {time}
      </span>
      <span style={{ fontSize: 11, color, flexShrink: 0, width: 12, textAlign: "center", lineHeight: 1.6 }}>
        {prefix}
      </span>
      {log.type === "code" ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setCodeOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6366f1", fontFamily: "inherit", padding: 0, lineHeight: 1.6 }}
          >
            {codeOpen ? "[collapse code ↑]" : "[experiment code — click to expand]"}
          </button>
          {codeOpen && (
            <pre style={{ marginTop: 8, padding: "10px 12px", borderRadius: 6, fontSize: 10, lineHeight: 1.6, background: "#0e0e10", color: "#6366f1", border: "1px solid #1a1a1e", whiteSpace: "pre-wrap", wordBreak: "break-all", overflowX: "auto" }}>
              {log.content}
            </pre>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 11, color, lineHeight: 1.6, flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {log.content}
        </span>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
interface HypothesisDetailPanelProps {
  hypothesis: Hypothesis
  hypothesisIndex: number
  programId: string
}

export default function HypothesisDetailPanel({
  hypothesis: h,
  hypothesisIndex,
  programId,
}: HypothesisDetailPanelProps) {
  const accent = accentFor(hypothesisIndex)
  const statusColor = STATUS_COLORS[h.status] ?? "#71717a"
  const statusLabel = STATUS_LABELS[h.status] ?? h.status
  const isRunning = h.status === "running"
  const isSucceeded = h.status === "succeeded"
  const isFailed = h.status === "failed"

  const { logs, connected } = useAgentStream(programId, h.id)
  const journalBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    journalBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const webSources = extractWebSources(logs)
  const citations = extractCitations(logs)
  const displayConclusion = h.conclusion || h.raw_output || ""
  const conclusionAccent = isSucceeded ? "#22c55e" : isFailed ? "#ef4444" : accent

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 24px 60px" }}>

        {/* ── Header card ─────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${accent}33`,
            overflow: "hidden",
            marginBottom: 10,
            background: "#0e0e10",
            boxShadow: `0 0 32px ${accent}0a, 0 4px 20px rgba(0,0,0,0.4)`,
          }}
        >
          <div style={{ height: 3, background: accent }} />
          <div style={{ padding: "16px 18px" }}>
            {/* Title + status */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.3, margin: 0 }}>
                {h.title}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {isRunning && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "#3b82f6" }}>
                    <span className="pulse-glow" style={{ width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
                    Live
                  </span>
                )}
                <span style={{ fontSize: 9, padding: "3px 9px", borderRadius: 5, background: statusColor + "18", color: statusColor, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" }}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {h.approach && (
              <p style={{ fontSize: 11, color: "#71717a", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                {h.approach}
              </p>
            )}

            {/* Plausibility */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                {Math.round(h.plausibility_score * 100)}%
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                  Plausibility
                </div>
                <div style={{ height: 4, background: "#1a1a1e", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${h.plausibility_score * 100}%`, background: accent, borderRadius: 4, transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>

            {/* Visualization board — full width, below plausibility */}
            <VisualizationBlock hypothesis={h} accent={accent} />
          </div>
        </div>

        {/* ── Research Timeline ────────────────────────────────── */}
        <ResearchTimeline logs={logs} status={h.status} accent={accent} isRunning={isRunning} />

        {/* ── Web Sources ──────────────────────────────────────── */}
        {webSources.length > 0 && (
          <Section
            label={`Web Sources · ${webSources.length}`}
            defaultOpen
            right={
              <span style={{ fontSize: 9, color: "#3b82f666", letterSpacing: "0.06em" }}>
                via Tavily
              </span>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 10 }}>
              {webSources.map((src, i) => {
                let domain = ""
                try { domain = new URL(src.url).hostname.replace(/^www\./, "") } catch { domain = src.url }
                const relevance = src.score != null ? Math.round(src.score * 100) : null
                return (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      borderRadius: 7,
                      background: "#0a0a0c",
                      border: "1px solid #1a1a1e",
                      textDecoration: "none",
                      transition: "border-color 0.12s, background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = "#3b82f633"
                      el.style.background = "#0e0e12"
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.borderColor = "#1a1a1e"
                      el.style.background = "#0a0a0c"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: src.snippet ? 5 : 0 }}>
                      <span style={{ fontSize: 11, color: "#c4c4c8", lineHeight: 1.4, fontWeight: 500, flex: 1, minWidth: 0 }}>
                        {src.title}
                      </span>
                      {relevance != null && (
                        <span style={{ fontSize: 9, color: "#3b82f6", flexShrink: 0, fontVariantNumeric: "tabular-nums", background: "#3b82f610", padding: "2px 6px", borderRadius: 4 }}>
                          {relevance}%
                        </span>
                      )}
                    </div>
                    {src.snippet && (
                      <p style={{
                        fontSize: 10,
                        color: "#52525b",
                        lineHeight: 1.55,
                        margin: "0 0 5px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}>
                        {src.snippet}
                      </p>
                    )}
                    <span style={{ fontSize: 9, color: "#3b82f666" }}>{domain}</span>
                  </a>
                )
              })}
            </div>
          </Section>
        )}

        {/* ── Findings ─────────────────────────────────────────── */}
        <div style={{ background: "#0e0e10", border: "1px solid #1a1a1e", borderRadius: 9, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#52525b", marginBottom: 12, fontWeight: 600 }}>
            Findings · {h.findings?.length ?? 0}
          </div>
          {h.findings && h.findings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {h.findings.map((f, i) => {
                const fc = FINDING_COLORS[f.type] ?? "#71717a"
                const pct = Math.round(f.confidence * 100)
                return (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 7, background: fc + "08", border: `1px solid ${fc}22` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: fc + "25", color: fc, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" }}>
                        {f.type}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 40, height: 3, background: "#1a1a1e", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: fc, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 9, color: "#52525b", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.55, margin: 0 }}>
                      {f.description}
                    </p>
                    {f.implication && (
                      <p style={{ fontSize: 10, color: "#52525b", lineHeight: 1.5, margin: "5px 0 0", fontStyle: "italic" }}>
                        → {f.implication}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#3f3f46", margin: 0 }}>
              {isRunning ? "Findings emerging…" : "No findings recorded."}
            </p>
          )}
        </div>

        {/* ── Conclusion ────────────────────────────────────────── */}
        {(displayConclusion || isSucceeded || isFailed) && (
          <div
            style={{
              background: "#0e0e10",
              borderRadius: 9,
              padding: "14px 16px",
              marginBottom: 10,
              borderTop: `1px solid ${conclusionAccent}22`,
              borderRight: `1px solid ${conclusionAccent}22`,
              borderBottom: `1px solid ${conclusionAccent}22`,
              borderLeft: `3px solid ${conclusionAccent}`,
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#52525b", marginBottom: 10, fontWeight: 600 }}>
              Conclusion
            </div>
            {displayConclusion ? (
              <p style={{ fontSize: 13, color: "#c4c4c8", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                {displayConclusion}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "#3f3f46", margin: 0 }}>
                {isRunning ? "Conclusion forming…" : "No conclusion yet."}
              </p>
            )}
          </div>
        )}

        {/* ── Methodology & Rationale ──────────────────────────── */}
        <Section label="Methodology & Rationale">
          <div style={{ paddingTop: 12 }}>
            {h.description && <p style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.65, margin: "0 0 12px" }}>{h.description}</p>}
            {h.rationale && (
              <>
                <div style={{ fontSize: 9, color: "#3f3f46", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Rationale</div>
                <p style={{ fontSize: 11, color: "#71717a", lineHeight: 1.6, margin: 0 }}>{h.rationale}</p>
              </>
            )}
            {!h.description && !h.rationale && (
              <p style={{ fontSize: 12, color: "#3f3f46", margin: "10px 0 0" }}>No methodology details available.</p>
            )}
          </div>
        </Section>

        {/* ── Agent Journal ─────────────────────────────────────── */}
        <Section
          label="Agent Journal"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: connected ? "#3b82f6" : "#3f3f46" }} className={connected ? "pulse-glow" : undefined} />
              <span style={{ fontSize: 9, color: "#3f3f46" }}>{logs.length} entries</span>
            </div>
          }
        >
          <div style={{ maxHeight: 320, overflowY: "auto", paddingTop: 10 }}>
            {logs.length === 0 ? (
              <div style={{ fontSize: 11, color: "#3f3f46", textAlign: "center", padding: "20px 0", letterSpacing: "0.06em" }}>
                — no activity recorded —
              </div>
            ) : (
              logs.map(log => <JournalLine key={log.id} log={log} />)
            )}
            <div ref={journalBottomRef} />
          </div>
        </Section>

        {/* ── Sources & Citations ───────────────────────────────── */}
        {citations.length > 0 && (
          <Section label={`Sources & Citations · ${citations.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
              {citations.map((c, i) => {
                const isUrl = c.startsWith("http")
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 9, color: "#3f3f46", marginTop: 3, flexShrink: 0 }}>[{i + 1}]</span>
                    {isUrl ? (
                      <a href={c} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", lineHeight: 1.5, wordBreak: "break-all" }}
                        onMouseEnter={e => { ;(e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline" }}
                        onMouseLeave={e => { ;(e.currentTarget as HTMLAnchorElement).style.textDecoration = "none" }}
                      >{c}</a>
                    ) : (
                      <span style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.5 }}>{c}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
