"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePrograms } from "@/hooks/useProgram"
import ProgramCard from "@/components/programs/ProgramCard"

const RESOLVED = [
  { question: "How does DNA replicate itself?",                                                             label: "Solved 1953" },
  { question: "What causes stomach ulcers?",                                                               label: "Solved 1984" },
  { question: "What caused the mass extinction of non-avian dinosaurs 66 million years ago?",             label: "Solved 1980" },
]

const UNSOLVED = [
  { question: "What causes certain cancers to spontaneously regress without any treatment?" },
  { question: "Why do identical twins raised together develop different psychiatric illnesses at such high rates?" },
  { question: "Why do some organisms age exponentially while others show negligible senescence indefinitely?" },
]

function autoTitle(q: string): string {
  const words = q.trim().split(/\s+/).slice(0, 6).join(" ")
  return words.length < q.trim().length ? words + "…" : words
}

export default function DashboardPage() {
  const router = useRouter()
  const { programs, loading, refetch } = usePrograms()
  const [question, setQuestion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const canSubmit = question.trim().length > 0 && !submitting

  const launch = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: autoTitle(question),
          research_question: question.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create program")
      }
      const program = await res.json()
      // Trigger hypothesis generation in the background — don't await
      fetch(`/api/programs/${program.id}/initialize`, { method: "POST", keepalive: true })
        .catch(() => null)
      router.push(`/dashboard/${program.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }, [canSubmit, question, router])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") launch()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [launch])

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Nav */}
      <div
        style={{
          width: "100%",
          borderBottom: "1px solid var(--border)",
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", color: "var(--text-primary)" }}>AXIOM</span>
        {!loading && programs.length > 0 && (
          <button
            onClick={() => document.getElementById("programs-section")?.scrollIntoView({ behavior: "smooth" })}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", padding: 0, fontFamily: "inherit" }}
          >
            {programs.length} active program{programs.length !== 1 ? "s" : ""} ↓
          </button>
        )}
      </div>

      {/* Main */}
      <div style={{ width: "100%", maxWidth: 960, padding: "72px 24px 80px", display: "flex", flexDirection: "column", gap: 60, boxSizing: "border-box" }}>

        {/* Hero + input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0, textAlign: "center", lineHeight: 1.25 }}>
            The research never stops.
          </h1>

          {/* Input card */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask any research question or select one below..."
              rows={4}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                padding: "18px 18px 12px",
                fontSize: 14,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                lineHeight: 1.65,
                boxSizing: "border-box",
              }}
            />

            {/* Footer row */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                {error ? (
                  <span style={{ color: "var(--stream-red)" }}>{error}</span>
                ) : (
                  "⌘↵ to run"
                )}
              </span>
              <button
                onClick={launch}
                disabled={!canSubmit}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: canSubmit ? "pointer" : "default",
                  fontSize: 13,
                  fontWeight: 600,
                  color: canSubmit ? "var(--text-primary)" : "var(--text-muted)",
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  padding: 0,
                  transition: "color 0.12s",
                }}
              >
                {submitting ? "Launching…" : "Start Research →"}
              </button>
            </div>
          </div>
        </div>

        {/* RESOLVED */}
        <ExampleSection
          title="RESOLVED"
          items={RESOLVED}
          selected={question}
          onSelect={setQuestion}
          badge={(item) => (
            <span style={{ fontSize: 10, color: "var(--stream-green)", letterSpacing: "0.08em", flexShrink: 0, fontWeight: 500 }}>
              {item.label}
            </span>
          )}
        />

        {/* UNSOLVED */}
        <ExampleSection
          title="UNSOLVED"
          items={UNSOLVED}
          selected={question}
          onSelect={setQuestion}
          badge={() => (
            <span style={{ fontSize: 16, color: "var(--text-muted)", flexShrink: 0, opacity: 0.35 }}>?</span>
          )}
        />

        {/* Active programs */}
        {!loading && programs.length > 0 && (
          <div id="programs-section" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionRule title="ACTIVE" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {programs.map((p) => <ProgramCard key={p.id} program={p} onDeleted={refetch} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionRule({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.14em" }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  )
}

interface ExampleItem { question: string; label?: string }

function ExampleSection({
  title, items, selected, onSelect, badge,
}: {
  title: string
  items: ExampleItem[]
  selected: string
  onSelect: (q: string) => void
  badge: (item: ExampleItem) => React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionRule title={title} />
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((item, i) => {
          const active = selected === item.question
          return (
            <button
              key={i}
              onClick={() => onSelect(item.question)}
              style={{
                background: active ? "rgba(255,255,255,0.04)" : "transparent",
                border: `1px solid ${active ? "var(--border-bright)" : "var(--border)"}`,
                borderRadius: 8,
                padding: "11px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                transition: "all 0.1s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)"
                  e.currentTarget.style.borderColor = "var(--border-bright)"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.borderColor = "var(--border)"
                }
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {item.question}
              </span>
              {badge(item)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
