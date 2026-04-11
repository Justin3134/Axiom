"use client"
import { useEffect } from "react"
import AgentTerminal from "@/components/agents/AgentTerminal"
import type { Hypothesis } from "@/lib/types"

interface Props {
  hypothesis: Hypothesis
  programId: string
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  queued: "#71717a",
  running: "#3b82f6",
  succeeded: "#22c55e",
  failed: "#ef4444",
  pruned: "#52525b",
  paused: "#eab308",
}

export default function HypothesisPanel({ hypothesis, programId, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const statusColor = STATUS_COLORS[hypothesis.status] || "#6b7280"

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="hypothesis-panel-enter absolute top-0 right-0 h-full z-30 flex flex-col overflow-hidden"
        style={{
          width: "min(480px, 100%)",
          background: "#0d0d12",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: statusColor }}
            />
            <span
              className="text-xs font-mono uppercase"
              style={{ color: statusColor }}
            >
              {hypothesis.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono transition-colors"
            style={{ color: "#4a4a5a" }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.color = "#f0f0f0")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = "#4a4a5a")
            }
          >
            [ESC] close
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hypothesis title and description */}
          <div
            className="p-5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <h2
              className="text-base font-bold mb-2 leading-snug"
              style={{ color: "#f0f0f0" }}
            >
              {hypothesis.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#8a8a9a" }}>
              {hypothesis.description}
            </p>

            {/* Metadata row */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div>
                <div
                  className="text-xs font-mono"
                  style={{ color: "#4a4a5a" }}
                >
                  PLAUSIBILITY
                </div>
                <div
                  className="text-sm font-mono font-bold"
                  style={{ color: "#3b82f6" }}
                >
                  {Math.round(hypothesis.plausibility_score * 100)}%
                </div>
              </div>
              <div>
                <div
                  className="text-xs font-mono"
                  style={{ color: "#4a4a5a" }}
                >
                  DEPTH
                </div>
                <div
                  className="text-sm font-mono font-bold"
                  style={{ color: "#f0f0f0" }}
                >
                  {hypothesis.depth}
                </div>
              </div>
              {hypothesis.blaxel_sandbox_name && (
                <div>
                  <div
                    className="text-xs font-mono"
                    style={{ color: "#4a4a5a" }}
                  >
                    SANDBOX
                  </div>
                  <div
                    className="text-sm font-mono"
                  style={{ color: "#3b82f6" }}
                >
                  {hypothesis.blaxel_sandbox_name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rationale */}
          <div
            className="p-5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div
              className="text-xs font-mono uppercase mb-2"
              style={{ color: "#4a4a5a" }}
            >
              Rationale
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#8a8a9a" }}>
              {hypothesis.rationale}
            </p>
          </div>

          {/* Findings */}
          {hypothesis.findings && hypothesis.findings.length > 0 && (
            <div
              className="p-5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="text-xs font-mono uppercase mb-3"
                style={{ color: "#4a4a5a" }}
              >
                Findings ({hypothesis.findings.length})
              </div>
              <div className="space-y-2">
                {hypothesis.findings.map((finding, i) => (
                  <div
                    key={i}
                    className="p-3 rounded"
                    style={{ background: "#12121a" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-mono"
                        style={{
                          color:
                            finding.type === "positive"
                              ? "#22c55e"
                              : finding.type === "negative"
                                ? "#ef4444"
                                : finding.type === "unexpected"
                                  ? "#eab308"
                                  : "#71717a",
                        }}
                      >
                        [{finding.type.toUpperCase()}]
                      </span>
                      <span
                        className="text-xs font-mono"
                        style={{ color: "#4a4a5a" }}
                      >
                        {Math.round(finding.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "#c0c0d0" }}
                    >
                      {finding.description}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "#6a6a7a" }}
                    >
                      → {finding.implication}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conclusion */}
          {hypothesis.conclusion && (
            <div
              className="p-5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="text-xs font-mono uppercase mb-2"
                style={{ color: "#4a4a5a" }}
              >
                Conclusion
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#f0f0f0" }}>
                {hypothesis.conclusion}
              </p>
            </div>
          )}

          {/* Experiment code (collapsible) */}
          {hypothesis.experiment_code && (
            <div
              className="p-5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <details>
                <summary
                  className="text-xs font-mono uppercase cursor-pointer"
                  style={{ color: "#3b82f6" }}
                >
                  Experiment Code ▾
                </summary>
                <pre
                  className="mt-3 p-3 rounded text-xs font-mono overflow-x-auto leading-relaxed"
                  style={{
                    background: "#060608",
                    color: "#3b82f6",
                    border: "1px solid rgba(59,130,246,0.15)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  {hypothesis.experiment_code}
                </pre>
              </details>
            </div>
          )}

          {/* Live logs when running */}
          {hypothesis.status === "running" && (
            <div className="p-5" style={{ minHeight: "200px" }}>
              <div
                className="text-xs font-mono uppercase mb-3"
                style={{ color: "#4a4a5a" }}
              >
                Live Agent Log
              </div>
              <div style={{ height: "200px" }}>
                <AgentTerminal
                  programId={programId}
                  hypothesisId={hypothesis.id}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
