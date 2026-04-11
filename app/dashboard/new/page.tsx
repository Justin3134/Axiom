import Link from "next/link"
import NewProgramForm from "@/components/programs/NewProgramForm"

export default function NewProgramPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--bg-base)",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            textDecoration: "none",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← AXIOM
        </Link>
        <span style={{ color: "var(--border-bright)", fontSize: 12 }}>/</span>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>
          New Research Program
        </span>
      </div>

      {/* Centered card */}
      <div
        style={{
          maxWidth: 560,
          margin: "48px auto",
          padding: "0 24px",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            AXIOM · New Research Program
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
            Axiom generates a hypothesis tree, spawns parallel agents, and runs experiments autonomously.
          </p>
        </div>

        <NewProgramForm />
      </div>
    </div>
  )
}
