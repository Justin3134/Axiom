"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface Props {
  programId: string
}

export default function ProgramTabs({ programId }: Props) {
  const pathname = usePathname()
  const base = `/dashboard/${programId}`

  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/tree`, label: "Hypothesis Tree", exact: false },
    { href: `${base}/agents`, label: "Agent Terminal", exact: false },
    { href: `${base}/knowledge`, label: "Knowledge Base", exact: false },
  ]

  return (
    <div
      className="flex gap-1 px-4 border-b shrink-0"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      {tabs.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className="px-4 py-3 text-xs font-mono border-b-2 transition-colors"
            style={{
              color: isActive ? "#f0f0f0" : "#5a5a6a",
              borderBottomColor: isActive ? "#3b82f6" : "transparent",
            }}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
