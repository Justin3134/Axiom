import type { HypothesisStatus } from "@/lib/types"

const STATUS_CONFIG: Record<
  HypothesisStatus,
  { label: string; color: string; bg: string }
> = {
  queued: { label: "Queued", color: "#71717a", bg: "rgba(113,113,122,0.12)" },
  running: { label: "Running", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  succeeded: { label: "Succeeded", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  failed: { label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  pruned: { label: "Pruned", color: "#52525b", bg: "rgba(82,82,91,0.1)" },
  paused: { label: "Paused", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
}

interface Props {
  status: HypothesisStatus
  size?: "sm" | "md"
}

export default function HypothesisStatusBadge({ status, size = "md" }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued
  const textSize = size === "sm" ? "text-xs" : "text-xs"

  return (
    <span
      className={`${textSize} font-mono px-2 py-0.5 rounded-sm`}
      style={{ color: config.color, background: config.bg }}
    >
      {config.label}
    </span>
  )
}
