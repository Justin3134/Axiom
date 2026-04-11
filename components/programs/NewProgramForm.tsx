"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Domain } from "@/lib/types"
import { DOMAIN_LABELS } from "@/lib/types"

const DOMAINS: Domain[] = ["drug_discovery", "genomics", "chemistry", "materials", "climate", "physics"]

const DOMAIN_SUBTITLES: Record<Domain, string> = {
  drug_discovery: "Molecular targets · ADMET · Binding",
  genomics:       "Gene expression · CRISPR · Folding",
  chemistry:      "Reactions · Catalysis · Thermodynamics",
  materials:      "Crystal structures · Electronic props",
  climate:        "Atmospheric · Carbon cycles",
  physics:        "Quantum · Condensed matter",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  padding: "11px 14px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
  resize: "none",
}

export default function NewProgramForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [title, setTitle] = useState("")
  const [question, setQuestion] = useState("")

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setQuestion(decodeURIComponent(q))
  }, [searchParams])
  const [domain, setDomain] = useState<Domain | "">("")
  const [hypothesisCount, setHypothesisCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !question || !domain) {
      setError("All fields are required")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          research_question: question,
          domain,
          initial_hypothesis_count: hypothesisCount,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create program")
      }
      const program = await res.json()
      router.push(`/dashboard/${program.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Title */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Program Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. KRAS G12C Inhibitor Discovery"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--stream-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            required
          />
        </div>

        {/* Research question */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Research Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What specific scientific question should Axiom investigate? Be precise and mechanistic."
            rows={3}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--stream-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            required
          />
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5 }}>
            e.g. "What molecule best inhibits KRAS G12C through covalent binding to the switch II pocket?"
          </div>
        </div>

        {/* Domain */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Scientific Domain
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {DOMAINS.map((d) => {
              const selected = domain === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomain(d)}
                  style={{
                    padding: "9px 12px",
                    background: selected ? "rgba(59,130,246,0.12)" : "var(--bg-base)",
                    border: `1px solid ${selected ? "var(--stream-blue)" : "var(--border)"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: selected ? "var(--stream-blue)" : "var(--text-primary)", marginBottom: 2 }}>
                    {DOMAIN_LABELS[d]}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {DOMAIN_SUBTITLES[d]}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Hypothesis count */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Initial Hypotheses · <span style={{ color: "var(--stream-blue)" }}>{hypothesisCount}</span>
          </label>
          <input
            type="range"
            min={6}
            max={20}
            value={hypothesisCount}
            onChange={(e) => setHypothesisCount(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--stream-blue)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
            <span>6 — focused</span>
            <span>20 — broad sweep</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 2 }} />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !domain || !title || !question}
          style={{
            padding: "12px",
            background: loading || !domain ? "var(--bg-elevated)" : "var(--stream-blue)",
            color: loading || !domain ? "var(--text-muted)" : "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !domain ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Generating hypothesis tree…" : "Launch Research →"}
        </button>

        {loading && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
            Claude is generating {hypothesisCount} hypotheses — ~15 seconds
          </p>
        )}
      </div>
    </form>
  )
}
