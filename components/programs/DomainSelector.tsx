"use client"
import type { Domain } from "@/lib/types"
import { DOMAIN_LABELS, DOMAIN_ICONS } from "@/lib/types"

interface Props {
  value: Domain | ""
  onChange: (domain: Domain) => void
}

const DOMAINS: Domain[] = [
  "drug_discovery",
  "genomics",
  "chemistry",
  "materials",
  "climate",
  "physics",
]

const DOMAIN_DESCRIPTIONS: Record<Domain, string> = {
  drug_discovery: "Molecular targets, ADMET, binding affinity",
  genomics: "Gene expression, CRISPR, protein folding",
  chemistry: "Reaction mechanisms, catalysis, thermodynamics",
  materials: "Crystal structures, electronic properties",
  climate: "Atmospheric modeling, carbon cycles",
  physics: "Quantum mechanics, condensed matter",
}

export default function DomainSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {DOMAINS.map((domain) => {
        const selected = value === domain
        return (
          <button
            key={domain}
            type="button"
            onClick={() => onChange(domain)}
            className="p-4 rounded-lg border text-left transition-all"
            style={{
              background: selected ? "rgba(59,130,246,0.06)" : "#0d0d12",
              borderColor: selected
                ? "rgba(59,130,246,0.4)"
                : "rgba(255,255,255,0.06)",
            }}
          >
            <div className="text-2xl mb-2">{DOMAIN_ICONS[domain]}</div>
            <div
              className="text-sm font-bold mb-1"
              style={{ color: selected ? "#3b82f6" : "#f0f0f0" }}
            >
              {DOMAIN_LABELS[domain]}
            </div>
            <div className="text-xs" style={{ color: "#4a4a5a" }}>
              {DOMAIN_DESCRIPTIONS[domain]}
            </div>
          </button>
        )
      })}
    </div>
  )
}
