"use client"
import ReactMarkdown from "react-markdown"
import type { Briefing } from "@/lib/types"

interface Props {
  briefing: Briefing | null
  programTitle?: string
}

const SIGNIFICANCE_CONFIG = {
  breakthrough: {
    label: "BREAKTHROUGH",
    color: "var(--stream-green)",
    bg: "rgba(74,222,128,0.05)",
    border: "rgba(74,222,128,0.18)",
  },
  promising: {
    label: "PROMISING",
    color: "var(--stream-blue)",
    bg: "rgba(59,130,246,0.05)",
    border: "rgba(59,130,246,0.18)",
  },
  neutral: {
    label: "NEUTRAL",
    color: "var(--text-secondary)",
    bg: "rgba(138,138,154,0.04)",
    border: "rgba(138,138,154,0.1)",
  },
  dead_end: {
    label: "DEAD END",
    color: "var(--stream-red)",
    bg: "rgba(248,113,113,0.05)",
    border: "rgba(248,113,113,0.18)",
  },
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  marginBottom: 12,
  fontFamily: "inherit",
}

export default function DailyBriefing({ briefing, programTitle }: Props) {
  if (!briefing) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
          gap: 8,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: 28, lineHeight: 1 }}>[ ]</div>
        <div style={{ fontSize: 13, fontFamily: "inherit" }}>No briefing generated yet</div>
        <div style={{ fontSize: 11, fontFamily: "inherit", color: "var(--text-muted)", opacity: 0.6 }}>
          Briefings are generated after agents complete experiments
        </div>
      </div>
    )
  }

  const createdDate = new Date(briefing.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        paddingBottom: 64,
        paddingLeft: 4,
        paddingRight: 4,
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "inherit", marginBottom: 4 }}>
          {createdDate}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          Research Briefing
        </div>
        {programTitle && (
          <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)", fontFamily: "inherit" }}>
            {programTitle}
          </div>
        )}
      </div>

      {/* Breakthrough alert */}
      {briefing.breakthrough_alert && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--stream-green)",
            background: "rgba(74,222,128,0.05)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--stream-green)", marginBottom: 4, letterSpacing: "0.08em" }}>
            ! BREAKTHROUGH DETECTED
          </div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
            {briefing.breakthrough_alert.title}
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)" }}>
            {briefing.breakthrough_alert.description}
          </div>
        </div>
      )}

      {/* Executive summary */}
      <div>
        <div style={sectionLabel}>Executive Summary</div>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
          {briefing.executive_summary}
        </p>
      </div>

      {/* Key findings */}
      {briefing.key_findings.length > 0 && (
        <div>
          <div style={sectionLabel}>Key Findings</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {briefing.key_findings.map((finding, i) => {
              const config = SIGNIFICANCE_CONFIG[finding.significance] ?? SIGNIFICANCE_CONFIG.neutral
              return (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: `1px solid ${config.border}`,
                    background: config.bg,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "inherit",
                        padding: "2px 7px",
                        borderRadius: 4,
                        color: config.color,
                        background: `${config.border}`,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {config.label}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>
                      {finding.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                    {finding.summary}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full narrative */}
      {briefing.narrative && (
        <div>
          <div style={sectionLabel}>Full Analysis</div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: "var(--text-secondary)",
            }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p style={{ margin: "0 0 12px", color: "var(--text-secondary)" }}>{children}</p>
                ),
                h1: ({ children }) => (
                  <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "20px 0 8px" }}>{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "16px 0 6px" }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "12px 0 4px" }}>{children}</h3>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{children}</strong>
                ),
                code: ({ children }) => (
                  <code
                    style={{
                      fontFamily: "inherit",
                      fontSize: 12,
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      color: "var(--stream-blue)",
                    }}
                  >
                    {children}
                  </code>
                ),
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: 20, margin: "8px 0" }}>{children}</ul>
                ),
                li: ({ children }) => (
                  <li style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{children}</li>
                ),
              }}
            >
              {briefing.narrative}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Dead ends */}
      {briefing.dead_ends && briefing.dead_ends.length > 0 && (
        <div>
          <div style={sectionLabel}>Eliminated Approaches</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {briefing.dead_ends.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                <span style={{ color: "var(--stream-red)", flexShrink: 0 }}>×</span>
                <span style={{ color: "var(--text-secondary)" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      {briefing.recommended_next_steps.length > 0 && (
        <div>
          <div style={sectionLabel}>Recommended Next Steps</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {briefing.recommended_next_steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, fontSize: 13 }}>
                <span
                  style={{
                    fontFamily: "inherit",
                    flexShrink: 0,
                    color: "var(--stream-blue)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}.
                </span>
                <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
