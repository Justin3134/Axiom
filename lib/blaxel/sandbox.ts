import { SandboxInstance, DriveInstance } from "@blaxel/core"
import type { Domain, Finding } from "@/lib/types"

export const DRIVE_MOUNT_PATH = "/mnt/axiom"
const FINDINGS_INDEX_PATH = `${DRIVE_MOUNT_PATH}/findings/_index.json`

// Sandbox names: lowercase alphanumeric + hyphens, max 63 chars
export function getSandboxName(hypothesisId: string): string {
  return `axiom-${hypothesisId.replace(/-/g, "").slice(0, 20)}`
}

// Drive name scoped per research program
export function getDriveName(programId: string): string {
  return `axiom-${programId.replace(/-/g, "").slice(0, 20)}`
}

// Create a sandbox if it doesn't exist, or return the existing one.
// Also creates the program-level shared drive and mounts it so all agents
// in the same program share /mnt/axiom for cross-agent memory.
export async function getOrCreateSandbox(
  hypothesisId: string,
  programId: string
): Promise<InstanceType<typeof SandboxInstance>> {
  const name = getSandboxName(hypothesisId)

  const sandbox = await SandboxInstance.createIfNotExists({
    name,
    image: "blaxel/py-app:latest", // Python 3.12 pre-installed
    memory: 2048,
    region: "us-was-1",
    labels: {
      project: "axiom",
      hypothesis_id: hypothesisId,
      purpose: "research-agent",
    },
  })

  // Ensure the program-level shared drive exists and is mounted
  await DriveInstance.createIfNotExists({
    name: getDriveName(programId),
    region: "us-was-1",
  })

  await sandbox.drives.mount({
    driveName: getDriveName(programId),
    mountPath: DRIVE_MOUNT_PATH,
    drivePath: "/",
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

// Save findings to both the shared drive (cross-agent) and local /tmp (own-session resume).
// Also updates the shared index manifest so siblings can discover this agent's findings.
export async function saveFindingsToSandbox(
  sandbox: InstanceType<typeof SandboxInstance>,
  findings: unknown,
  hypothesisId: string
): Promise<void> {
  const findingsJson = JSON.stringify(findings, null, 2)

  // Write to shared drive — visible to all sibling agents immediately
  await sandbox.fs.write(
    `${DRIVE_MOUNT_PATH}/findings/${hypothesisId}.json`,
    findingsJson
  )

  // Update the shared index so siblings know this file exists
  await updateFindingsIndex(sandbox, hypothesisId)

  // Keep writing to /tmp as a fast local fallback for own-session resume
  await sandbox.fs.write("/tmp/axiom_findings.json", findingsJson)
}

// Load previous findings from the sandbox's own /tmp (persisted from last session)
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

// Load findings written by all other agents in the same program via the shared drive.
// Returns a flat array of Finding objects from all sibling hypothesis runs.
export async function loadSiblingFindings(
  sandbox: InstanceType<typeof SandboxInstance>,
  hypothesisId: string
): Promise<Finding[]> {
  let index: string[] = []

  try {
    const raw = await sandbox.fs.read(FINDINGS_INDEX_PATH)
    index = JSON.parse(raw as string)
  } catch {
    return [] // Drive is empty — no siblings have finished yet
  }

  const siblingIds = index.filter((id) => id !== hypothesisId)
  if (siblingIds.length === 0) return []

  const allFindings: Finding[] = []

  await Promise.allSettled(
    siblingIds.map(async (sid) => {
      try {
        const raw = await sandbox.fs.read(`${DRIVE_MOUNT_PATH}/findings/${sid}.json`)
        const parsed = JSON.parse(raw as string)
        if (Array.isArray(parsed)) {
          allFindings.push(...(parsed as Finding[]))
        }
      } catch {
        // Sibling file may not exist yet or be malformed — skip silently
      }
    })
  )

  return allFindings
}

// Append this hypothesis ID to the shared findings index manifest.
// Uses a read-modify-write pattern; concurrent writes are tolerated since
// the drive supports RWX and worst case a write is retried on next save.
async function updateFindingsIndex(
  sandbox: InstanceType<typeof SandboxInstance>,
  hypothesisId: string
): Promise<void> {
  let index: string[] = []

  try {
    const raw = await sandbox.fs.read(FINDINGS_INDEX_PATH)
    index = JSON.parse(raw as string)
  } catch {
    index = []
  }

  if (!index.includes(hypothesisId)) {
    index.push(hypothesisId)
    await sandbox.fs.write(FINDINGS_INDEX_PATH, JSON.stringify(index))
  }
}
