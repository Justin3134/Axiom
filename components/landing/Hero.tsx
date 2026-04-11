"use client"
import Link from "next/link"
import { useState, useEffect } from "react"

const DEMO_LOGS = [
  { type: "milestone", text: "🚀 Agent starting: KRAS G12C covalent binding via switch-II pocket" },
  { type: "thought", text: "💭 Acquiring persistent sandbox environment..." },
  { type: "milestone", text: "✓ Sandbox ready: axiom-a3b1c9d2e4f5" },
  { type: "thought", text: "💭 Checking scientific libraries..." },
  { type: "thought", text: "✓ Environment ready (numpy, scipy, pandas)" },
  { type: "plan", text: "📋 Designing experiment: Simulate covalent docking to C12 cysteine residue using molecular dynamics..." },
  { type: "code", text: "⌨️ [experiment code generated — click to expand]" },
  { type: "executing", text: "⚙️ Running experiment in sandbox axiom-a3b1c9d2e4f5..." },
  { type: "result", text: "📊 FINDING: Binding affinity = -9.2 kcal/mol | CONFIDENCE: 0.87 | IMPLICATION: Strong covalent bond formation predicted" },
  { type: "finding", text: "🔬 [POSITIVE] Covalent bond to Cys12 confirmed via free energy calculation (confidence: 87%)\n→ Implication: This compound class warrants synthesis and wet-lab validation" },
  { type: "milestone", text: "✅ Experiment complete: High-affinity covalent binder identified — spawning 3 child hypotheses" },
  { type: "milestone", text: "🌿 Spawned 3 child hypotheses" },
]

const LOG_COLORS: Record<string, string> = {
  thought: "#71717a",
  plan: "#3b82f6",
  code: "#3b82f6",
  executing: "#eab308",
  result: "#f4f4f5",
  finding: "#22c55e",
  error: "#ef4444",
  milestone: "#3b82f6",
}

export default function Hero() {
  const [visibleLogs, setVisibleLogs] = useState<typeof DEMO_LOGS>([])
  const [logIndex, setLogIndex] = useState(0)

  useEffect(() => {
    if (logIndex >= DEMO_LOGS.length) {
      const reset = setTimeout(() => {
        setVisibleLogs([])
        setLogIndex(0)
      }, 4000)
      return () => clearTimeout(reset)
    }

    const delay = logIndex === 0 ? 800 : 600 + Math.random() * 400
    const timer = setTimeout(() => {
      setVisibleLogs((prev) => [...prev, DEMO_LOGS[logIndex]])
      setLogIndex((i) => i + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [logIndex])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 grid-bg overflow-hidden">
      {/* Radial gradient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 40%, rgba(59,130,246,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 border text-xs font-mono"
            style={{
              background: "rgba(59,130,246,0.05)",
              borderColor: "rgba(59,130,246,0.2)",
              color: "#3b82f6",
            }}
          >
            <div className="relative w-1.5 h-1.5 rounded-full" style={{ background: "#3b82f6" }}>
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "#3b82f6", opacity: 0.4 }} />
            </div>
            Autonomous Research · Live Sandboxes · Compounding Context
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-display font-black mb-6 leading-tight tracking-tight"
            style={{ color: "#f0f0f0" }}
          >
            Science doesn&apos;t sleep.
            <br />
            <span style={{ color: "#f4f4f5" }}>Now neither does</span>
            <br />
            your research.
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "#6a6a7a" }}
          >
            One research question. Dozens of parallel AI agents. Each in its own
            persistent Blaxel sandbox. The longer it runs, the smarter it gets.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="px-8 py-4 rounded-lg font-bold font-display text-sm transition-all glow-cyan"
              style={{ background: "#3b82f6", color: "#ffffff" }}
            >
              Launch a Research Program
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-lg font-mono text-sm border transition-colors"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                color: "#8a8a9a",
              }}
            >
              View Demo →
            </Link>
          </div>
        </div>

        {/* Live demo terminal */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: "#060608",
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          {/* Terminal title bar */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#eab308" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="relative w-2 h-2 rounded-full" style={{ background: "#3b82f6" }}>
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "#3b82f6", opacity: 0.4 }} />
              </div>
              <span className="text-xs font-mono" style={{ color: "#3b82f6" }}>
                LIVE · axiom-a3b1c9d2e4f5 · Drug Discovery Program
              </span>
            </div>
          </div>

          {/* Log output */}
          <div className="p-4 h-64 overflow-hidden font-mono text-xs space-y-1.5">
            {visibleLogs.map((log, i) => (
              <div
                key={i}
                className="flex gap-2 items-start fade-in animate-fade-in"
              >
                <span style={{ color: "#3a3a4a" }}>
                  {new Date().toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span
                  className="whitespace-pre-wrap"
                  style={{ color: LOG_COLORS[log.type] || "#8a8a9a" }}
                >
                  {log.text}
                </span>
              </div>
            ))}
            {logIndex < DEMO_LOGS.length && (
              <div className="flex gap-1">
                <span style={{ color: "#3b82f6" }}>█</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
