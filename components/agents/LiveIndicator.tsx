"use client"

interface Props {
  count?: number
  size?: "sm" | "md"
}

export default function LiveIndicator({ count, size = "md" }: Props) {
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"

  return (
    <div className="flex items-center gap-1.5">
      <div className={`relative ${dotSize} rounded-full`} style={{ background: "#3b82f6" }}>
        <div
          className={`absolute inset-0 rounded-full animate-ping`}
          style={{ background: "#3b82f6", opacity: 0.4 }}
        />
      </div>
      {count !== undefined && (
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: "#3b82f6" }}
        >
          {count}
        </span>
      )}
    </div>
  )
}
