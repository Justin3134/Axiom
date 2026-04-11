export default function ScientificLoader({
  message = "Initializing...",
}: {
  message?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "64px 0",
      }}
    >
      <div
        style={{
          width: 100,
          height: 1,
          background: "var(--border)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="scan-line"
          style={{
            position: "absolute",
            inset: 0,
            width: "40%",
            background: "linear-gradient(90deg, transparent, var(--stream-blue), transparent)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          fontFamily: "inherit",
          opacity: 0.6,
        }}
      >
        {message.toUpperCase()}
      </span>
    </div>
  )
}
