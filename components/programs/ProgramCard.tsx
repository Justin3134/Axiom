"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ResearchProgram } from "@/lib/types"
import { DOMAIN_LABELS } from "@/lib/types"

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  initializing: { color: "#52525b", label: "Initializing" },
  active:       { color: "#3b82f6", label: "Active" },
  paused:       { color: "#eab308", label: "Paused" },
  completed:    { color: "#22c55e", label: "Completed" },
  error:        { color: "#ef4444", label: "Error" },
}

export default function ProgramCard({ program, onDeleted }: { program: ResearchProgram; onDeleted?: (id: string) => void }) {
  const router = useRouter()
  const cfg = STATUS_CFG[program.status] ?? STATUS_CFG.active
  const isLive = program.active_agents > 0
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await fetch(`/api/programs/${program.id}`, { method: "DELETE" })
      onDeleted?.(program.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
      <div
        onClick={() => router.push(`/dashboard/${program.id}`)}
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${isLive ? cfg.color + "55" : "var(--border)"}`,
          borderRadius: 8,
          overflow: "hidden",
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: isLive ? `0 0 20px ${cfg.color}18` : "none",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = cfg.color + "88"
          el.style.background = "var(--bg-card-hover)"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = isLive ? cfg.color + "55" : "var(--border)"
          el.style.background = "var(--bg-card)"
        }}
      >
        {/* Status stripe */}
        <div
          style={{
            height: 2,
            background: cfg.color,
            opacity: isLive ? 1 : 0.4,
          }}
        />

        <div style={{ padding: "14px 16px" }}>
          {/* Top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {DOMAIN_LABELS[program.domain]}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isLive && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9,
                    color: "#3b82f6",
                    letterSpacing: "0.06em",
                  }}
                >
                  <span
                    className="pulse-glow"
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#3b82f6",
                      display: "inline-block",
                    }}
                  />
                  LIVE
                </span>
              )}
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: cfg.color + "18",
                  color: cfg.color,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            {program.title}
          </div>

          {/* Research question */}
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              lineHeight: 1.5,
              marginBottom: 14,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {program.research_question}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              alignItems: "center",
            }}
          >
            <StatChip value={program.total_hypotheses ?? 0} label="Total" color="var(--text-muted)" />
            <StatChip value={program.active_agents ?? 0} label="Running" color="#3b82f6" />
            <StatChip value={program.succeeded_count ?? 0} label="Done" color="#22c55e" />
            <StatChip value={program.failed_count ?? 0} label="Failed" color="#ef4444" />
            <div style={{ marginLeft: "auto" }}>
              {confirmDelete ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      fontSize: 9,
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: "1px solid #ef444466",
                      background: "#ef444418",
                      color: "#ef4444",
                      cursor: deleting ? "not-allowed" : "pointer",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    {deleting ? "Deleting…" : "Confirm"}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    style={{
                      fontSize: 9,
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  title="Delete research"
                  style={{
                    fontSize: 9,
                    padding: "3px 7px",
                    borderRadius: 4,
                    border: "1px solid transparent",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.color = "#ef4444"
                    el.style.borderColor = "#ef444444"
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.color = "var(--text-muted)"
                    el.style.borderColor = "transparent"
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}

function StatChip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}
