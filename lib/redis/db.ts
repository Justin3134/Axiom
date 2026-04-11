import { redis } from "./client"
import type { ResearchProgram, Hypothesis, AgentLog, LogType, Briefing } from "@/lib/types"

// ─── Key helpers ──────────────────────────────────────────────────────────────
const k = {
  program: (id: string) => `axiom:program:${id}`,
  programs: () => `axiom:programs`,
  hypothesis: (id: string) => `axiom:hypothesis:${id}`,
  programHypotheses: (programId: string) => `axiom:program:${programId}:hypotheses`,
  logs: (hypothesisId: string) => `axiom:logs:${hypothesisId}`,
  programLogs: (programId: string) => `axiom:programlogs:${programId}`,
  briefing: (programId: string) => `axiom:briefing:${programId}`,
}

function uuid(): string {
  return crypto.randomUUID()
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export async function createProgram(data: {
  title: string
  research_question: string
  domain: string
  status?: string
}): Promise<ResearchProgram> {
  const now = new Date().toISOString()
  const program: ResearchProgram = {
    id: uuid(),
    user_id: "demo",
    title: data.title,
    research_question: data.research_question,
    domain: data.domain as ResearchProgram["domain"],
    status: (data.status || "initializing") as ResearchProgram["status"],
    master_context: {
      summary: "",
      key_insights: [],
      eliminated_approaches: [],
      promising_directions: [],
      current_focus: "",
      confidence_level: 0,
      total_experiments_run: 0,
      last_updated: now,
    },
    total_hypotheses: 0,
    active_agents: 0,
    succeeded_count: 0,
    failed_count: 0,
    created_at: now,
    updated_at: now,
  }

  await redis.set(k.program(program.id), JSON.stringify(program))
  await redis.sadd(k.programs(), program.id)
  return program
}

export async function getProgram(id: string): Promise<ResearchProgram | null> {
  const raw = await redis.get(k.program(id))
  if (!raw) return null
  const program = JSON.parse(raw) as ResearchProgram
  // Guard against old records missing master_context
  if (!program.master_context) {
    program.master_context = {
      summary: "",
      key_insights: [],
      eliminated_approaches: [],
      promising_directions: [],
      current_focus: "",
      confidence_level: 0,
      total_experiments_run: 0,
      last_updated: null,
    }
  }
  return program
}

export async function getAllPrograms(): Promise<ResearchProgram[]> {
  const ids = await redis.smembers(k.programs())
  if (!ids.length) return []

  const programs = await Promise.all(ids.map((id) => getProgram(id)))
  return (programs.filter(Boolean) as ResearchProgram[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export async function updateProgram(
  id: string,
  updates: Partial<ResearchProgram>
): Promise<ResearchProgram | null> {
  const existing = await getProgram(id)
  if (!existing) return null
  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }
  await redis.set(k.program(id), JSON.stringify(updated))
  return updated
}

export async function deleteProgram(id: string): Promise<void> {
  // Delete all hypotheses
  const hypothesisIds = await redis.smembers(k.programHypotheses(id))
  for (const hid of hypothesisIds) {
    await redis.del(k.hypothesis(hid))
    await redis.del(k.logs(hid))
  }
  await redis.del(k.programHypotheses(id))
  await redis.del(k.programLogs(id))
  await redis.del(k.briefing(id))
  await redis.del(k.program(id))
  await redis.srem(k.programs(), id)
}

// ─── Hypotheses ───────────────────────────────────────────────────────────────

type CreateHypothesisInput = {
  program_id: string
  parent_id?: string | null
  title: string
  description: string
  rationale: string
  approach: string
  plausibility_score: number
  priority_rank: number
  depth: number
  generation: number
  branch_path: string[]
  status?: string
}

export async function createHypothesis(data: CreateHypothesisInput): Promise<Hypothesis> {
  const now = new Date().toISOString()
  const hypothesis: Hypothesis = {
    id: uuid(),
    program_id: data.program_id,
    parent_id: data.parent_id || null,
    title: data.title,
    description: data.description,
    rationale: data.rationale,
    approach: data.approach,
    status: (data.status || "queued") as Hypothesis["status"],
    plausibility_score: data.plausibility_score,
    priority_rank: data.priority_rank,
    depth: data.depth,
    generation: data.generation,
    branch_path: data.branch_path || [],
    findings: [],
    conclusion: null,
    visualization_svg: null,
    failure_reason: null,
    experiment_code: null,
    raw_output: null,
    blaxel_sandbox_name: null,
    sandbox_created_at: null,
    sandbox_last_active: null,
    spawned_children: false,
    child_count: 0,
    created_at: now,
    updated_at: now,
  }

  await redis.set(k.hypothesis(hypothesis.id), JSON.stringify(hypothesis))
  await redis.sadd(k.programHypotheses(hypothesis.program_id), hypothesis.id)
  return hypothesis
}

export async function getHypothesis(id: string): Promise<Hypothesis | null> {
  const raw = await redis.get(k.hypothesis(id))
  if (!raw) return null
  return JSON.parse(raw) as Hypothesis
}

export async function getProgramHypotheses(programId: string): Promise<Hypothesis[]> {
  const ids = await redis.smembers(k.programHypotheses(programId))
  if (!ids.length) return []

  const hypotheses = await Promise.all(ids.map((id) => getHypothesis(id)))
  return (hypotheses.filter(Boolean) as Hypothesis[]).sort(
    (a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999)
  )
}

export async function updateHypothesis(
  id: string,
  updates: Partial<Hypothesis>
): Promise<Hypothesis | null> {
  const existing = await getHypothesis(id)
  if (!existing) return null
  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }
  await redis.set(k.hypothesis(id), JSON.stringify(updated))
  return updated
}

// ─── Agent Logs ───────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string
  hypothesis_id: string
  program_id: string
  type: LogType
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function appendLog(
  hypothesisId: string,
  programId: string,
  type: LogType,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const entry: LogEntry = {
    id: uuid(),
    hypothesis_id: hypothesisId,
    program_id: programId,
    type,
    content: content.slice(0, 10000),
    metadata,
    created_at: new Date().toISOString(),
  }
  const serialized = JSON.stringify(entry)
  // RPUSH so lrange(0, -1) returns oldest-first; LTRIM caps list at 2000 newest entries
  await redis.rpush(k.logs(hypothesisId), serialized)
  await redis.ltrim(k.logs(hypothesisId), -2000, -1)
  await redis.rpush(k.programLogs(programId), serialized)
  await redis.ltrim(k.programLogs(programId), -2000, -1)
}

// Get logs from a list cursor position onwards
export async function getLogsFromCursor(
  programId: string,
  cursor: number,
  hypothesisId?: string,
  limit = 50
): Promise<{ logs: LogEntry[]; nextCursor: number }> {
  const key = hypothesisId ? k.logs(hypothesisId) : k.programLogs(programId)
  const total = await redis.llen(key)
  if (cursor >= total) return { logs: [], nextCursor: cursor }

  const end = Math.min(cursor + limit - 1, total - 1)
  const raw = await redis.lrange(key, cursor, end)
  const logs: LogEntry[] = raw.map((item) =>
    typeof item === "string" ? JSON.parse(item) : item
  )
  return { logs, nextCursor: end + 1 }
}

// ─── Briefings ────────────────────────────────────────────────────────────────

export async function saveBriefing(data: Omit<Briefing, "id" | "created_at">): Promise<Briefing> {
  const briefing: Briefing = {
    ...data,
    id: uuid(),
    created_at: new Date().toISOString(),
  }
  await redis.set(k.briefing(data.program_id), JSON.stringify(briefing))
  return briefing
}

export async function getLatestBriefing(programId: string): Promise<Briefing | null> {
  const raw = await redis.get(k.briefing(programId))
  if (!raw) return null
  return JSON.parse(raw) as Briefing
}
