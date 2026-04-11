import { SandboxInstance } from "@blaxel/core"
import type { Domain } from "@/lib/types"

// Sandbox names: lowercase alphanumeric + hyphens, max 63 chars
export function getSandboxName(hypothesisId: string): string {
  return `axiom-${hypothesisId.replace(/-/g, "").slice(0, 20)}`
}

// Create a sandbox if it doesn't exist, or return the existing one.
// Blaxel sandboxes persist state across pauses — this is the core feature.
export async function getOrCreateSandbox(
  hypothesisId: string
): Promise<InstanceType<typeof SandboxInstance>> {
  const name = getSandboxName(hypothesisId)

  const sandbox = await SandboxInstance.createIfNotExists({
    name,
    image: "blaxel/py-app:latest", // Python 3.12 pre-installed
    memory: 2048,
    labels: {
      project: "axiom",
      hypothesis_id: hypothesisId,
      purpose: "research-agent",
    },
  })

  return sandbox
}

// Install Python scientific libraries.
// State persists in Blaxel — this only runs once per sandbox lifetime.
export async function installDependencies(
  sandbox: InstanceType<typeof SandboxInstance>,
  domain: Domain
): Promise<void> {
  // Ensure Python3 is available — blaxel/py-app:latest has it, but older
  // sandboxes may still be running the Alpine base image (no Python by default).
  const pythonCheck = await sandbox.process.exec({
    command: "which python3",
    waitForCompletion: true,
    timeout: 10,
  })
  const hasPython = ((pythonCheck as { stdout?: string }).stdout || "").trim().length > 0

  if (!hasPython) {
    // Alpine-based sandbox: install Python3 + pip via apk
    await sandbox.process.exec({
      command: "apk add --no-cache python3 py3-pip",
      waitForCompletion: true,
      timeout: 120,
    })
  }

  // Check if scientific packages are already installed (state persists across sessions)
  const pkgCheck = await sandbox.process.exec({
    command: "python3 -c \"import numpy, scipy, pandas; print('ready')\"",
    waitForCompletion: true,
    timeout: 15,
  })
  const stdout = ((pkgCheck as { stdout?: string }).stdout || "").trim()
  if (stdout.includes("ready")) return

  const basePackages = "numpy scipy pandas"
  const domainPackages: Record<Domain, string> = {
    drug_discovery: "requests",
    genomics: "requests scikit-learn",
    materials: "requests",
    chemistry: "requests",
    climate: "requests",
    physics: "requests",
  }
  const packages = `${basePackages} ${domainPackages[domain] || "requests"}`

  await sandbox.process.exec({
    command: `pip3 install ${packages} -q`,
    waitForCompletion: true,
    timeout: 180,
  })
}

// Write a Python experiment script to the sandbox filesystem
export async function writeExperimentScript(
  sandbox: InstanceType<typeof SandboxInstance>,
  code: string,
  hypothesisId: string
): Promise<string> {
  const scriptPath = `/tmp/experiment_${hypothesisId.slice(0, 8)}.py`
  await sandbox.fs.write(scriptPath, code)
  return scriptPath
}

// Execute the experiment script and return stdout/stderr/exitCode
export async function executeExperiment(
  sandbox: InstanceType<typeof SandboxInstance>,
  scriptPath: string,
  timeoutMs: number = 60000
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const result = await sandbox.process.exec({
    command: `python3 ${scriptPath}`,
    waitForCompletion: true,
    timeout: Math.floor(timeoutMs / 1000),
  })

  const r = result as {
    stdout?: string
    stderr?: string
    exitCode?: number | null
    exit_code?: number | null
  }

  return {
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    exitCode: r.exitCode ?? r.exit_code ?? null,
  }
}

// Save findings to the sandbox filesystem — they persist between runs
export async function saveFindingsToSandbox(
  sandbox: InstanceType<typeof SandboxInstance>,
  findings: unknown
): Promise<void> {
  await sandbox.fs.write(
    "/tmp/axiom_findings.json",
    JSON.stringify(findings, null, 2)
  )
}

// Load previous findings from sandbox (persisted from last session)
export async function loadPreviousFindings(
  sandbox: InstanceType<typeof SandboxInstance>
): Promise<unknown[] | null> {
  try {
    const content = await sandbox.fs.read("/tmp/axiom_findings.json")
    return JSON.parse(content as string)
  } catch {
    return null // First run — no previous findings
  }
}
