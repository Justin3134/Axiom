const STEPS = [
  {
    number: "01",
    title: "Ask a Research Question",
    description:
      "Enter any scientific question. Axiom generates a branching hypothesis tree of 8–20 mechanistically distinct approaches.",
    icon: "❓",
  },
  {
    number: "02",
    title: "Agents Spawn in Blaxel Sandboxes",
    description:
      "Each hypothesis gets its own persistent Blaxel sandbox. Agents write and execute Python experiments, then report findings.",
    icon: "⚗️",
  },
  {
    number: "03",
    title: "Wordware Synthesizes the Brain",
    description:
      "After every cycle, Wordware ingests all agent findings and updates the master scientific context. The system learns what works.",
    icon: "🧠",
  },
  {
    number: "04",
    title: "You Wake Up to a Briefing",
    description:
      "Every morning: a narrative research briefing. What succeeded, what failed, what to investigate next. Weeks become months of science.",
    icon: "📋",
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="text-xs font-mono uppercase tracking-wider mb-4"
            style={{ color: "#4a4a5a" }}
          >
            How It Works
          </div>
          <h2
            className="text-3xl md:text-4xl font-display font-black"
            style={{ color: "#f0f0f0" }}
          >
            The research loop, automated.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="p-6 rounded-xl border"
              style={{
                background: "#0d0d12",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-2xl font-mono font-black"
                  style={{ color: "rgba(0,255,200,0.3)" }}
                >
                  {step.number}
                </span>
                <span className="text-2xl">{step.icon}</span>
              </div>
              <h3
                className="text-lg font-bold font-display mb-2"
                style={{ color: "#f0f0f0" }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#6a6a7a" }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* The key differentiator */}
        <div
          className="mt-12 p-8 rounded-xl border text-center"
          style={{
            background: "rgba(0,255,200,0.02)",
            borderColor: "rgba(0,255,200,0.15)",
          }}
        >
          <div
            className="text-sm font-mono uppercase tracking-wider mb-3"
            style={{ color: "#4a4a5a" }}
          >
            The Moat
          </div>
          <p
            className="text-xl md:text-2xl font-display font-bold"
            style={{ color: "#f0f0f0" }}
          >
            Every AI research tool resets.{" "}
            <span style={{ color: "#3b82f6" }}>Axiom accumulates.</span>
          </p>
          <p
            className="text-sm mt-4 max-w-lg mx-auto"
            style={{ color: "#6a6a7a" }}
          >
            The Blaxel sandbox has been running for 30 minutes. It could run for
            30 years. The context compounds. That&apos;s the product.
          </p>
        </div>
      </div>
    </section>
  )
}
