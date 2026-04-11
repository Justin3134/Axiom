"use client"
import { useEffect, useRef } from "react"
import { useAgentStream } from "@/hooks/useAgentStream"
import type { AgentLog, LogType } from "@/lib/types"

const LOG_COLORS: Record<LogType, string> = {
  thought:   "var(--text-secondary)",
  plan:      "var(--stream-blue)",
  code:      "var(--stream-blue)",
  executing: "var(--stream-yellow)",
  result:    "var(--text-primary)",
  finding:   "var(--stream-green)",
  error:     "var(--stream-red)",
  milestone: "var(--stream-green)",
  pausing:   "var(--stream-yellow)",
}

const LOG_PREFIXES: Record<LogType, string> = {
  thought:   "~",
  plan:      "#",
  code:      ">",
  executing: "»",
  result:    "+",
  finding:   "✓",
  error:     "×",
  milestone: "★",
  pausing:   "—",
}

interface Props {
  programId: string
  hypothesisId?: string
  className?: string
}

export default function AgentTerminal({
  programId,
  hypothesisId,
}: Props) {
  const { logs, connected } = useAgentStream(programId, hypothesisId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 8,
        border: "1px solid var(--border)",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* Terminal header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* LIVE indicator dot */}
          <div style={{ position: "relative", width: 8, height: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: connected ? "var(--stream-blue)" : "var(--stream-red)",
              }}
            />
            {connected && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "var(--stream-blue)",
                  opacity: 0.4,
                  animation: "pulse-glow 1.4s ease-in-out infinite",
                }}
              />
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "inherit",
              color: connected ? "var(--stream-blue)" : "var(--stream-red)",
              letterSpacing: "0.08em",
            }}
          >
            {connected ? "LIVE" : "RECONNECTING..."}
          </span>
          {hypothesisId && (
            <span
              style={{
                fontSize: 11,
                fontFamily: "inherit",
                color: "var(--text-muted)",
              }}
            >
              · {hypothesisId.slice(0, 8)}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, fontFamily: "inherit", color: "var(--text-muted)" }}>
          {logs.length} entries
        </span>
      </div>

      {/* Log entries */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {logs.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 48,
              letterSpacing: "0.06em",
            }}
          >
            — waiting for agent activity —
          </div>
        )}

        {logs.map((log) => (
          <LogLine key={log.id} log={log} />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function LogLine({ log }: { log: AgentLog }) {
  const color = LOG_COLORS[log.type] ?? "var(--text-secondary)"
  const prefix = LOG_PREFIXES[log.type] ?? "›"
  const time = new Date(log.created_at).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  const isCode = log.type === "code"

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span
        style={{
          fontSize: 11,
          fontFamily: "inherit",
          color: "var(--text-muted)",
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {time}
      </span>
      <span
        style={{
          fontSize: 12,
          flexShrink: 0,
          color,
          lineHeight: 1.6,
          width: 12,
          textAlign: "center",
        }}
      >
        {prefix}
      </span>

      {isCode ? (
        <details style={{ flex: 1, minWidth: 0 }}>
          <summary
            style={{
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              userSelect: "none",
              color: "var(--stream-blue)",
            }}
          >
            [experiment code — click to expand]
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "inherit",
              overflowX: "auto",
              lineHeight: 1.6,
              background: "var(--bg-card)",
              color: "var(--stream-blue)",
              border: "1px solid var(--border)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {log.content}
          </pre>
        </details>
      ) : (
        <span
          style={{
            fontSize: 12,
            fontFamily: "inherit",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            flex: 1,
            lineHeight: 1.6,
            color,
          }}
        >
          {log.content}
        </span>
      )}
    </div>
  )
}
