"use client"
import { usePathname } from "next/navigation"

export default function TopBar() {
  const pathname = usePathname()

  const getTitle = () => {
    if (pathname === "/dashboard") return "Research Programs"
    if (pathname === "/dashboard/new") return "New Research Program"
    if (pathname.includes("/tree")) return "Hypothesis Tree"
    if (pathname.includes("/agents")) return "Agent Terminal"
    if (pathname.includes("/knowledge")) return "Knowledge Base"
    if (pathname.includes("/dashboard/")) return "Program Overview"
    return "Axiom"
  }

  return (
    <div
      className="h-12 px-6 flex items-center justify-between border-b shrink-0"
      style={{
        background: "#060608",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="text-sm font-mono"
        style={{ color: "#6a6a7a" }}
      >
        {getTitle()}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs font-mono" style={{ color: "#3a3a4a" }}>
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
    </div>
  )
}
