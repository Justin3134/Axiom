import { NextRequest, NextResponse } from "next/server"
import { createProgram, getAllPrograms, getLatestBriefing } from "@/lib/redis/db"
import type { CreateProgramPayload, Domain } from "@/lib/types"

function inferDomain(question: string): Domain {
  const q = question.toLowerCase()
  if (/drug|molecule|ligand|binding|admet|pharmacok|toxicity|therapeutic|medication|inhibitor|receptor/.test(q)) return "drug_discovery"
  if (/gene|dna|rna|genome|crispr|protein.fold|sequenc|mutation|variant|expression|chromosome/.test(q)) return "genomics"
  if (/material|crystal|alloy|semiconductor|mechanical|synthesis|lattice|polymer|composite|conductor/.test(q)) return "materials"
  if (/reaction|catalyst|organic|inorganic|solvent|acid|base|thermodynam|kinetic|bond/.test(q)) return "chemistry"
  if (/climate|carbon|atmosphere|emission|greenhouse|ocean|weather|fossil|ice|warming|aerosol/.test(q)) return "climate"
  if (/quantum|particle|force|wave|gravitati|relativity|nuclear|thermodynamics|entropy|photon/.test(q)) return "physics"
  return "chemistry"
}

export async function GET() {
  try {
    const programs = await getAllPrograms()

    // Attach latest briefing to each program
    const withBriefings = await Promise.all(
      programs.map(async (p) => {
        const briefing = await getLatestBriefing(p.id)
        return {
          ...p,
          briefings: briefing ? [briefing] : [],
        }
      })
    )

    return NextResponse.json(withBriefings)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body: CreateProgramPayload = await req.json()
  const {
    title,
    research_question,
    domain: domainInput,
    initial_hypothesis_count = 10,
  } = body

  if (!title || !research_question) {
    return NextResponse.json(
      { error: "title and research_question are required" },
      { status: 400 }
    )
  }

  const domain = domainInput ?? inferDomain(research_question)

  // Create program immediately and return — AI hypothesis generation
  // happens asynchronously via the /initialize endpoint
  const program = await createProgram({ title, research_question, domain, status: "initializing" })

  return NextResponse.json(program, { status: 201 })
}
