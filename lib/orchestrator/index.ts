import { runAgent } from "./agent-runner"
import { synthesizeFindings } from "@/lib/ai/brain"
import { redis } from "@/lib/redis/client"
import {
  getAllPrograms,
  getProgramHypotheses,
  updateHypothesis,
  updateProgram,
} from "@/lib/redis/db"
import type { Hypothesis, ResearchProgram } from "@/lib/types"

const MAX_CONCURRENT_AGENTS = 5
const MIN_PLAUSIBILITY_TO_RUN = 0.15

export async function runOrchestratorCycle(): Promise<{
  programsProcessed: number
  agentsLaunched: number
}> {
  const programs = await getAllPrograms()
  const activePrograms = programs.filter((p) => p.status === "active")

  if (!activePrograms.length) return { programsProcessed: 0, agentsLaunched: 0 }

  let totalAgentsLaunched = 0

  const results = await Promise.allSettled(
    activePrograms.map(async (p) => {
      const launched = await runProgramCycle(p)
      totalAgentsLaunched += launched
    })
  )

  const errors = results.filter((r) => r.status === "rejected")
  if (errors.length > 0) {
    console.error("[orchestrator] Some program cycles failed:", errors)
  }

  return {
    programsProcessed: activePrograms.length,
    agentsLaunched: totalAgentsLaunched,
  }
}

async function runProgramCycle(program: ResearchProgram): Promise<number> {
  // Distributed lock — prevent concurrent orchestrator runs per program
  const lockKey = `axiom:lock:${program.id}`
  const acquired = await redis.set(lockKey, "1", "EX", 600, "NX")
  if (!acquired) return 0

  let agentsLaunched = 0
  let allHypotheses: Awaited<ReturnType<typeof getProgramHypotheses>> = []

  try {
    const hypotheses = await getProgramHypotheses(program.id)
    if (!hypotheses.length) return 0

    // ── PRUNE low-plausibility hypotheses ────────────────────────
    const toPrune = hypotheses.filter(
      (h) =>
        h.status === "queued" && h.plausibility_score < MIN_PLAUSIBILITY_TO_RUN
    )

    await Promise.all(
      toPrune.map((h) => updateHypothesis(h.id, { status: "pruned" }))
    )

    // ── RUN queued agents in parallel ────────────────────────────
    const toRun = hypotheses
      .filter(
        (h) =>
          h.status === "queued" &&
          h.plausibility_score >= MIN_PLAUSIBILITY_TO_RUN
      )
      .slice(0, MAX_CONCURRENT_AGENTS)

    if (toRun.length > 0) {
      agentsLaunched = toRun.length
      await updateProgram(program.id, { active_agents: toRun.length })
      await Promise.allSettled(
        toRun.map((h) => runAgent(h as Hypothesis, program))
      )
    }

    // ── SYNTHESIZE findings ───────────────────────────────────────
    allHypotheses = await getProgramHypotheses(program.id)
    const completedHypotheses = allHypotheses.filter(
      (h) => h.status === "succeeded" || h.status === "failed"
    )

    if (completedHypotheses.length > 0) {
      const newFindings = completedHypotheses
        .filter((h) => h.findings && h.findings.length > 0)
        .map(
          (h) =>
            `Hypothesis "${h.title}": ${h.conclusion || ""}\nFindings: ${(h.findings as Array<{ type: string; description: string }>).map((f) => `[${f.type}] ${f.description}`).join("; ")}`
        )

      const hypothesesSummary = allHypotheses
        .map((h) => `[${h.status}] ${h.title}`)
        .join("\n")

      try {
        const updatedContext = await synthesizeFindings({
          researchQuestion: program.research_question,
          domain: program.domain,
          currentContext: program.master_context,
          newFindings,
          hypothesesSummary,
          totalExperimentsRun: completedHypotheses.length,
        })

        await updateProgram(program.id, {
          master_context: updatedContext,
          active_agents: 0,
          succeeded_count: allHypotheses.filter((h) => h.status === "succeeded").length,
          failed_count: allHypotheses.filter((h) => h.status === "failed").length,
          total_hypotheses: allHypotheses.length,
        })

        await redis.set(
          `axiom:context:${program.id}`,
          JSON.stringify(updatedContext),
          "EX",
          3600
        )
      } catch (synthErr) {
        console.error("[orchestrator] Synthesis failed:", synthErr)
        await updateProgram(program.id, {
          active_agents: 0,
          succeeded_count: allHypotheses.filter((h) => h.status === "succeeded").length,
          failed_count: allHypotheses.filter((h) => h.status === "failed").length,
          total_hypotheses: allHypotheses.length,
        })
      }
    } else {
      // No completed hypotheses this cycle — still clear active_agents if nothing ran
      if (toRun.length === 0) {
        await updateProgram(program.id, { active_agents: 0 })
      }
    }

    return agentsLaunched
  } finally {
    await redis.del(lockKey)

    // ── DECIDE: self-trigger or mark complete ─────────────────────
    // Re-check hypothesis state after lock release to schedule the next cycle
    try {
      const latest = allHypotheses.length > 0
        ? allHypotheses
        : await getProgramHypotheses(program.id)

      const queued = latest.filter((h) => h.status === "queued")
      const terminal = new Set(["succeeded", "failed", "pruned"])
      const allDone = latest.length > 0 && latest.every((h) => terminal.has(h.status))

      if (queued.length > 0) {
        // More work to do — schedule next cycle on the event loop without awaiting.
        // Direct function call is reliable; HTTP self-calls can be dropped by the runtime.
        runOrchestratorCycle().catch((e) =>
          console.error("[orchestrator] Next cycle failed:", e)
        )
      } else if (allDone) {
        // All hypotheses are terminal — mark program complete
        await updateProgram(program.id, { status: "completed", active_agents: 0 })
        console.log(`[orchestrator] Program ${program.id} completed`)
      }
    } catch (e) {
      console.error("[orchestrator] Post-cycle check failed:", e)
    }
  }
}
