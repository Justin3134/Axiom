"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { usePrograms } from "@/hooks/useProgram"
import LiveIndicator from "@/components/agents/LiveIndicator"

const NAV_LINKS = [
  { href: "/dashboard", label: "Programs", icon: "⬡" },
  { href: "/dashboard/new", label: "New Program", icon: "+" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { programs } = usePrograms()

  const totalRunning = programs.reduce((sum, p) => sum + (p.active_agents || 0), 0)

  return (
    <div
      className="w-56 shrink-0 flex flex-col h-screen border-r"
      style={{
        background: "#080810",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: "#3b82f6", color: "#ffffff" }}
          >
            Ax
          </div>
          <span
            className="font-display font-bold text-sm tracking-wide"
            style={{ color: "#f0f0f0" }}
          >
            AXIOM
          </span>
          {totalRunning > 0 && (
            <LiveIndicator count={totalRunning} size="sm" />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors"
              style={{
                color: isActive ? "#f0f0f0" : "#6a6a7a",
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
              }}
            >
              <span className="text-xs font-mono">{icon}</span>
              {label}
            </Link>
          )
        })}

        {/* Active programs */}
        {programs.length > 0 && (
          <div className="mt-4">
            <div
              className="px-3 py-1 text-xs font-mono uppercase tracking-wider"
              style={{ color: "#3a3a4a" }}
            >
              Active Programs
            </div>
            <div className="mt-1 space-y-0.5">
              {programs.slice(0, 8).map((program) => {
                const programHref = `/dashboard/${program.id}`
                const isActive = pathname.startsWith(programHref)

                return (
                  <Link
                    key={program.id}
                    href={programHref}
                    className="flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors"
                    style={{
                      color: isActive ? "#f0f0f0" : "#5a5a6a",
                      background: isActive
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                    }}
                  >
                    {program.active_agents > 0 && (
                      <LiveIndicator size="sm" />
                    )}
                    <span className="truncate font-mono">
                      {program.title.slice(0, 24)}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="text-xs font-mono" style={{ color: "#3a3a4a" }}>
          Powered by Blaxel · Wordware
        </div>
      </div>
    </div>
  )
}
