import {
  getOrCreateSandbox,
  installDependencies,
  writeExperimentScript,
  executeExperiment,
  saveFindingsToSandbox,
  loadPreviousFindings,
  getSandboxName,
} from "@/lib/blaxel/sandbox"
import { writeExperimentCode } from "@/lib/ai/experiment-writer"
import { analyzeResults } from "@/lib/ai/result-analyzer"
import { generateChildHypotheses } from "@/lib/ai/hypothesis-generator"
import { searchScientificContext, formatSearchContext } from "@/lib/search/tavily"
import { log } from "@/lib/logger"
import {
  updateHypothesis,
  createHypothesis,
  getProgram,
  updateProgram,
} from "@/lib/redis/db"
import type { Hypothesis, ResearchProgram } from "@/lib/types"

export async function runAgent(
  hypothesis: Hypothesis,
  program: ResearchProgram
): Promise<void> {
  const hid = hypothesis.id

  // ── STEP 1: Mark running ──────────────────────────────────────
  await updateHypothesis(hid, { status: "running" })
  await log(hid, program.id, "milestone", `🚀 Agent starting: "${hypothesis.title}"`)

  try {
    // ── STEP 2: Get or create Blaxel sandbox ─────────────────────
    await log(hid, program.id, "thought", "Acquiring persistent sandbox environment...")

    const sandbox = await getOrCreateSandbox(hid)
    const sandboxName = getSandboxName(hid)

    await updateHypothesis(hid, {
      blaxel_sandbox_name: sandboxName,
      sandbox_created_at: new Date().toISOString(),
      sandbox_last_active: new Date().toISOString(),
    })

    await log(hid, program.id, "milestone", `✓ Sandbox ready: ${sandboxName}`)

    // ── STEP 3: Install scientific dependencies ───────────────────
    await log(hid, program.id, "thought", "Setting up Python environment...")
    await installDependencies(sandbox, program.domain)

    // Verify Python is actually available before proceeding
    const verifyResult = await sandbox.process.exec({
      command: "python3 --version",
      waitForCompletion: true,
      timeout: 10,
    })
    const pyVersion = ((verifyResult as { stdout?: string; stderr?: string }).stdout || (verifyResult as { stderr?: string }).stderr || "").trim()
    if (!pyVersion.toLowerCase().startsWith("python")) {
      throw new Error(`Python3 not available in sandbox after setup: ${pyVersion || "no output"}`)
    }
    await log(hid, program.id, "thought", `✓ Environment ready: ${pyVersion}`)

    // ── STEP 4: Load previous findings (state persists!) ─────────
    const previousFindings = await loadPreviousFindings(sandbox)
    if (previousFindings && previousFindings.length > 0) {
      await log(
        hid,
        program.id,
        "thought",
        `📂 Resuming: found ${previousFindings.length} previous findings from last session`
      )
    }

    // ── STEP 5: Plan the experiment ───────────────────────────────
    await log(
      hid,
      program.id,
      "plan",
      `Designing experiment for hypothesis:\n"${hypothesis.description}"\n\nApproach: ${hypothesis.approach}`
    )

    // ── STEP 5.5: Search for scientific literature (Tavily) ───────
    await log(hid, program.id, "thought", "Searching scientific literature for context...")
    const searchResults = await searchScientificContext({
      hypothesis: hypothesis.description,
      domain: program.domain,
    })
    const searchContext = formatSearchContext(searchResults)
    if (searchResults.length > 0) {
      await log(
        hid,
        program.id,
        "thought",
        `Found ${searchResults.length} relevant papers: ${searchResults.map((r) => r.title).join(", ")}`,
        {
          web_sources: searchResults.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content.slice(0, 280),
            score: r.score,
          })),
        }
      )
    }

    // ── STEP 6: Write experiment code (GPT-4o) ────────────────────
    await log(hid, program.id, "thought", "Writing experiment code...")

    const code = await writeExperimentCode({
      hypothesis: hypothesis.description,
      approach: hypothesis.approach,
      domain: program.domain,
      masterContext: program.master_context?.summary ?? "",
      previousFindings: Array.isArray(previousFindings)
        ? (previousFindings as string[])
        : [],
      searchContext,
    })

    await updateHypothesis(hid, { experiment_code: code })
    await log(hid, program.id, "code", code)

    // ── STEP 7: Write script to sandbox filesystem ────────────────
    const scriptPath = await writeExperimentScript(sandbox, code, hid)
    await log(
      hid,
      program.id,
      "executing",
      `Running experiment in sandbox ${sandboxName}...`
    )

    // ── STEP 8: Execute in Blaxel sandbox ────────────────────────
    const execResult = await executeExperiment(sandbox, scriptPath, 90000)

    const output = execResult.stdout || execResult.stderr || "No output produced"
    await updateHypothesis(hid, { raw_output: output })

    await log(
      hid,
      program.id,
      "result",
      `Exit code: ${execResult.exitCode}\n\nOutput:\n${output.slice(0, 2000)}`
    )

    // ── STEP 9: Analyze results (Claude) ─────────────────────────
    await log(hid, program.id, "thought", "Analyzing experimental results...")

    const analysis = await analyzeResults({
      hypothesis: hypothesis.description,
      approach: hypothesis.approach,
      domain: program.domain,
      executionOutput: output,
      exitCode: execResult.exitCode,
      masterContext: program.master_context?.summary ?? "",
    })

    for (const finding of analysis.findings) {
      await log(
        hid,
        program.id,
        "finding",
        `[${finding.type.toUpperCase()}] ${finding.description} (confidence: ${Math.round(finding.confidence * 100)}%)\n→ Implication: ${finding.implication}`
      )
    }

    // ── STEP 10: Save findings to sandbox (they persist!) ────────
    await saveFindingsToSandbox(sandbox, analysis.findings)

    // ── STEP 11: Update hypothesis with results ───────────────────
    const newStatus =
      analysis.outcome === "inconclusive" ? "failed" : analysis.outcome

    await updateHypothesis(hid, {
      status: newStatus,
      findings: analysis.findings,
      conclusion: analysis.conclusion,
      failure_reason: newStatus === "failed" ? analysis.conclusion : null,
      sandbox_last_active: new Date().toISOString(),
    })

    await log(
      hid,
      program.id,
      "milestone",
      `${newStatus === "succeeded" ? "✅" : "❌"} Experiment complete: ${analysis.conclusion}`
    )

    // ── STEP 12: Spawn children if succeeded and shallow ─────────
    if (
      analysis.outcome === "succeeded" &&
      analysis.should_spawn_children &&
      hypothesis.depth < 4
    ) {
      await log(
        hid,
        program.id,
        "thought",
        "Generating child hypotheses for promising result..."
      )

      // Re-fetch program to get latest master_context
      const freshProgram = await getProgram(program.id)

      const children = await generateChildHypotheses({
        parentHypothesis: hypothesis,
        researchQuestion: program.research_question,
        domain: program.domain,
        masterContext: (freshProgram || program).master_context?.summary ?? "",
        findings: analysis.findings,
      })

      for (const child of children) {
        await createHypothesis({
          ...child,
          program_id: program.id,
          parent_id: hid,
          depth: hypothesis.depth + 1,
          generation: hypothesis.generation + 1,
          branch_path: [...hypothesis.branch_path, hid],
          plausibility_score: child.plausibility_score ?? 0.5,
          priority_rank: child.priority_rank ?? 0,
        })
      }

      await updateHypothesis(hid, {
        spawned_children: true,
        child_count: children.length,
      })

      await log(
        hid,
        program.id,
        "milestone",
        `🌿 Spawned ${children.length} child hypotheses`
      )
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)

    await updateHypothesis(hid, {
      status: "failed",
      failure_reason: errMsg,
    })

    await log(hid, program.id, "error", `Agent failed: ${errMsg}`)
  }
}
