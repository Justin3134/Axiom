"use client"

import { use, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useProgram } from "@/hooks/useProgram"
import { useRealtimeHypotheses } from "@/hooks/useRealtimeHypotheses"
import ResearchPaperView from "@/components/synthesis/ResearchPaperView"
import HypothesisDetailPanel from "@/components/hypothesis/HypothesisDetailPanel"
import type { Briefing, Hypothesis } from "@/lib/types"
import { DOMAIN_LABELS } from "@/lib/types"

const HypothesisFlowGraph = dynamic(
  () => import("@/components/hypothesis/HypothesisFlowGraph"),
  { ssr: false }
)

// ── Tab types ─────────────────────────────────────────────────
type Tab =
  | { kind: "graph" }
  | { kind: "hypothesis"; hypothesisId: string }
  | { kind: "synthesis" }

function tabKey(t: Tab): string {
  if (t.kind === "hypothesis") return `hyp:${t.hypothesisId}`
  return t.kind
}

function tabsEqual(a: Tab, b: Tab): boolean {
  return tabKey(a) === tabKey(b)
}

const ACCENT_COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7",
  "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#14b8a6",
]

function getRootAncestorId(h: import("@/lib/types").Hypothesis, all: import("@/lib/types").Hypothesis[]): string {
  if (!h.parent_id) return h.id
  const parent = all.find((x) => x.id === h.parent_id)
  return parent ? getRootAncestorId(parent, all) : h.id
}

const PROGRAM_STATUS_CFG: Record<string, { color: string; label: string }> = {
  initializing: { color: "#52525b", label: "Initializing" },
  active:       { color: "#3b82f6", label: "Active" },
  paused:       { color: "#eab308", label: "Paused" },
  completed:    { color: "#22c55e", label: "Completed" },
  error:        { color: "#ef4444", label: "Error" },
}

export default function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const { programId } = use(params)
  const router = useRouter()
  const { program, loading: programLoading, refetch } = useProgram(programId)
  const { hypotheses, loading: hypoLoading } = useRealtimeHypotheses(programId)

  // ── Browser-tab state ──────────────────────────────────────
  const [tabs, setTabs] = useState<Tab[]>([{ kind: "graph" }])
  const [activeTab, setActiveTab] = useState<Tab>({ kind: "graph" })

  const [generating, setGenerating] = useState(false)
  const [graphDir, setGraphDir] = useState<"LR" | "TB">("LR")

  const tabBarRef = useRef<HTMLDivElement>(null)

  // ── Tab management ─────────────────────────────────────────
  const openTab = useCallback((tab: Tab) => {
    setTabs((prev) => {
      if (prev.some((t) => tabsEqual(t, tab))) return prev
      return [...prev, tab]
    })
    setActiveTab(tab)
    // Scroll tab bar to end after open
    setTimeout(() => {
      tabBarRef.current?.scrollTo({ left: tabBarRef.current.scrollWidth, behavior: "smooth" })
    }, 50)
  }, [])

  const closeTab = useCallback((tab: Tab, e: React.MouseEvent) => {
    e.stopPropagation()
    setTabs((prev) => {
      const next = prev.filter((t) => !tabsEqual(t, tab))
      if (next.length === 0) return [{ kind: "graph" }]
      return next
    })
    setActiveTab((cur) => {
      if (!tabsEqual(cur, tab)) return cur
      const idx = tabs.findIndex((t) => tabsEqual(t, tab))
      const next = tabs.filter((t) => !tabsEqual(t, tab))
      if (next.length === 0) return { kind: "graph" }
      return next[Math.max(0, idx - 1)]
    })
  }, [tabs])

  const openHypothesisTab = useCallback((id: string) => {
    openTab({ kind: "hypothesis", hypothesisId: id })
  }, [openTab])

  const openSynthesisTab = useCallback(() => {
    openTab({ kind: "synthesis" })
  }, [openTab])

  // ── Actions ────────────────────────────────────────────────
  const handleGenerateBriefing = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/programs/${programId}/briefing`, { method: "POST" })
      if (res.ok) await refetch()
    } finally {
      setGenerating(false)
    }
  }, [programId, refetch])

  // ── Loading / not found states ─────────────────────────────
  if (programLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: "var(--text-muted)",
          }}
        >
          AXIOM
        </span>
        <div
          style={{
            width: 140,
            height: 1,
            background: "var(--border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="scan-line"
            style={{
              position: "absolute",
              inset: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent, var(--stream-blue), transparent)",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            opacity: 0.5,
          }}
        >
          LOADING
        </span>
      </div>
    )
  }

  if (!program) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: 13 }}>Program not found</div>
        <Link href="/dashboard" style={{ fontSize: 12, color: "var(--stream-blue)", textDecoration: "none" }}>
          ← Back to programs
        </Link>
      </div>
    )
  }

  const briefings = (program.briefings as Briefing[]) || []
  const latestBriefing = briefings[0] ?? null
  const runningCount = hypotheses.filter((h) => h.status === "running").length
  const statusCfg = PROGRAM_STATUS_CFG[program.status] ?? PROGRAM_STATUS_CFG.active

  // ── Helpers ────────────────────────────────────────────────
  function getTabLabel(tab: Tab): string {
    if (tab.kind === "graph") return "Execution Graph"
    if (tab.kind === "synthesis") return "Synthesis"
    const h = hypotheses.find((x) => x.id === tab.hypothesisId)
    return h ? (h.title.length > 22 ? h.title.slice(0, 22) + "…" : h.title) : "Approach"
  }

  const sortedRoots = [...hypotheses]
    .filter((h) => !h.parent_id)
    .sort((a, b) => (b.plausibility_score ?? 0) - (a.plausibility_score ?? 0))

  function rootColorIndex(hypothesisId: string): number {
    const h = hypotheses.find((x) => x.id === hypothesisId)
    if (!h) return 0
    const rootId = getRootAncestorId(h, hypotheses)
    const idx = sortedRoots.findIndex((r) => r.id === rootId)
    return idx === -1 ? 0 : idx
  }

  function getTabAccent(tab: Tab): string | null {
    if (tab.kind !== "hypothesis") return null
    return ACCENT_COLORS[rootColorIndex(tab.hypothesisId) % ACCENT_COLORS.length]
  }

  function getHypothesisForTab(tab: Tab): { hyp: Hypothesis; idx: number } | null {
    if (tab.kind !== "hypothesis") return null
    const h = hypotheses.find((x) => x.id === tab.hypothesisId)
    if (!h) return null
    return { hyp: h, idx: rootColorIndex(tab.hypothesisId) }
  }

  const activeTabAccent = getTabAccent(activeTab)

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Sticky header ───────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* Top row */}
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "0 20px",
          }}
        >
          {/* Left: back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: 11,
                letterSpacing: "0.08em",
                padding: "4px 8px",
                borderRadius: 5,
                flexShrink: 0,
                fontFamily: "inherit",
                transition: "color 0.12s, background 0.12s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.color = "var(--text-primary)"
                el.style.background = "var(--bg-elevated)"
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.color = "var(--text-muted)"
                el.style.background = "none"
              }}
            >
              ← AXIOM
            </button>

            <span style={{ color: "var(--border-bright)", fontSize: 14 }}>/</span>

            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 300,
              }}
            >
              {program.title}
            </span>

            <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
              · {DOMAIN_LABELS[program.domain]}
            </span>
          </div>

          {/* Right: stats + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {hypoLoading ? "—" : `${hypotheses.length} approaches`}
            </span>

            {runningCount > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#3b82f6" }}>
                <span
                  className="pulse-glow"
                  style={{ width: 5, height: 5, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }}
                />
                {runningCount} running
              </span>
            )}

            <span
              style={{
                fontSize: 9,
                padding: "3px 9px",
                borderRadius: 5,
                background: statusCfg.color + "18",
                color: statusCfg.color,
                letterSpacing: "0.08em",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* ── Browser-style tab bar ────────────────────────── */}
        <div
          ref={tabBarRef}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            padding: "0 16px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tabsEqual(tab, activeTab)
            const label = getTabLabel(tab)
            const accent = getTabAccent(tab)
            const isGraph = tab.kind === "graph"
            const isSynthesis = tab.kind === "synthesis"

            return (
              <div
                key={tabKey(tab)}
                onClick={() => setActiveTab(tab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px 6px 14px",
                  borderRadius: "6px 6px 0 0",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  borderBottom: isActive
                    ? `2px solid ${accent ?? (isSynthesis ? "#ef4444" : "var(--stream-blue)")}`
                    : "2px solid transparent",
                  transition: "all 0.12s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  userSelect: "none",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "var(--text-secondary)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "var(--text-muted)"
                }}
              >
                {/* Accent dot for hypothesis tabs */}
                {accent && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accent,
                      flexShrink: 0,
                      opacity: isActive ? 1 : 0.5,
                    }}
                  />
                )}
                {isSynthesis && (
                  <span style={{ fontSize: 9, opacity: isActive ? 1 : 0.5 }}>⬡</span>
                )}

                <span>{label}</span>

                {/* Close button — not on graph tab */}
                {!isGraph && (
                  <button
                    onClick={(e) => closeTab(tab, e)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "none",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      padding: 0,
                      lineHeight: 1,
                      flexShrink: 0,
                      transition: "background 0.1s, color 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = "rgba(239,68,68,0.15)"
                      el.style.color = "#ef4444"
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.background = "transparent"
                      el.style.color = "var(--text-muted)"
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* Execution Graph — conditionally mounted to free React Flow memory when inactive */}
        {activeTab.kind === "graph" && (
          <div
            style={{
              flex: 1,
              height: "100%",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <HypothesisFlowGraph
              program={program}
              hypotheses={hypotheses}
              briefing={latestBriefing}
              onGenerateBriefing={handleGenerateBriefing}
              generating={generating}
              onHypothesisClick={openHypothesisTab}
              dir={graphDir}
              onDirChange={setGraphDir}
            />
          </div>
        )}

        {/* Synthesis tab */}
        {activeTab.kind === "synthesis" && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              width: "100%",
            }}
          >
            {!latestBriefing && program.status !== "initializing" && (
              <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleGenerateBriefing}
                  disabled={generating || program.status === "active"}
                  style={{
                    padding: "10px 24px",
                    background:
                      generating || program.status === "active"
                        ? "var(--bg-elevated)"
                        : "rgba(59,130,246,0.1)",
                    border: `1px solid ${
                      generating || program.status === "active"
                        ? "var(--border)"
                        : "rgba(59,130,246,0.3)"
                    }`,
                    borderRadius: 7,
                    color:
                      generating || program.status === "active"
                        ? "var(--text-muted)"
                        : "var(--stream-blue)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor:
                      generating || program.status === "active" ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {generating
                    ? "Generating…"
                    : program.status === "active"
                    ? "Wait for agents to finish"
                    : "Generate Research Paper →"}
                </button>
              </div>
            )}
            <ResearchPaperView
              program={program}
              briefing={latestBriefing}
              hypotheses={hypotheses}
              onHypothesisClick={openHypothesisTab}
            />
          </div>
        )}

        {/* Per-hypothesis detail tabs */}
        {activeTab.kind === "hypothesis" && (() => {
          const result = getHypothesisForTab(activeTab)
          if (!result) {
            return (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                Approach not found.
              </div>
            )
          }
          return (
            <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
              <HypothesisDetailPanel
                hypothesis={result.hyp}
                hypothesisIndex={result.idx}
                programId={programId}
              />
            </div>
          )
        })()}
      </div>

      {/* ── Synthesis quick-open strip (shown on graph tab only when hypotheses exist) ── */}
      {activeTab.kind === "graph" && hypotheses.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            onClick={openSynthesisTab}
            style={{
              padding: "7px 18px",
              background: "rgba(15,15,18,0.92)",
              border: "1px solid #27272a",
              borderRadius: 20,
              color: "#71717a",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              backdropFilter: "blur(8px)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = "#ef444466"
              el.style.color = "#ef4444"
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.borderColor = "#27272a"
              el.style.color = "#71717a"
            }}
          >
            ⬡ Open Cross-Synthesis
          </button>
        </div>
      )}
    </div>
  )
}
