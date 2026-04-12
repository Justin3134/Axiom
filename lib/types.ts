// lib/types.ts — single source of truth for all Axiom types

export type Domain =
  | "drug_discovery"
  | "genomics"
  | "materials"
  | "chemistry"
  | "climate"
  | "physics"

export type ProgramStatus =
  | "initializing"
  | "active"
  | "paused"
  | "completed"
  | "error"

export type HypothesisStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "pruned"
  | "paused"

export type LogType =
  | "thought"
  | "plan"
  | "code"
  | "executing"
  | "result"
  | "finding"
  | "error"
  | "milestone"
  | "pausing"

export type FindingType = "positive" | "negative" | "neutral" | "unexpected"

export type SignificanceLevel =
  | "breakthrough"
  | "promising"
  | "neutral"
  | "dead_end"

// ── Master Context (updated continuously by Wordware) ─────────
export interface MasterContext {
  summary: string
  key_insights: string[]
  eliminated_approaches: string[]
  promising_directions: string[]
  current_focus: string
  confidence_level: number // 0 to 1
  total_experiments_run: number
  last_updated: string | null
}

// ── Research Program ──────────────────────────────────────────
export interface ResearchProgram {
  id: string
  user_id: string
  title: string
  research_question: string
  domain: Domain
  status: ProgramStatus
  master_context: MasterContext
  total_hypotheses: number
  active_agents: number
  succeeded_count: number
  failed_count: number
  created_at: string
  updated_at: string
  // Relations (joined)
  hypotheses?: Hypothesis[]
  briefings?: Briefing[]
}

// ── Hypothesis ────────────────────────────────────────────────
export interface Finding {
  type: FindingType
  description: string
  confidence: number // 0 to 1
  implication: string
  timestamp: string
}

export interface Hypothesis {
  id: string
  program_id: string
  parent_id: string | null
  title: string
  description: string
  rationale: string
  approach: string
  plausibility_score: number
  priority_rank: number | null
  status: HypothesisStatus
  blaxel_sandbox_name: string | null
  sandbox_created_at: string | null
  sandbox_last_active: string | null
  depth: number
  generation: number
  branch_path: string[]
  spawned_children: boolean
  child_count: number
  findings: Finding[]
  experiment_code: string | null
  raw_output: string | null
  failure_reason: string | null
  conclusion: string | null
  visualization_svg: string | null
  visualization_mermaid: string | null
  created_at: string
  updated_at: string
  // Relations
  children?: Hypothesis[]
  logs?: AgentLog[]
}

// ── Agent Log ─────────────────────────────────────────────────
export interface AgentLog {
  id: number
  hypothesis_id: string
  program_id: string
  type: LogType
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

// ── Briefing ──────────────────────────────────────────────────
export interface BriefingFinding {
  hypothesis_id: string
  title: string
  summary: string
  significance: SignificanceLevel
}

export interface Briefing {
  id: string
  program_id: string
  // Legacy narrative fields (kept for backwards compat)
  narrative: string
  executive_summary: string
  // Full research paper sections
  abstract: string
  introduction: string
  methodology: string
  discussion: string
  conclusion: string
  limitations: string
  keywords: string[]
  key_findings: BriefingFinding[]
  dead_ends: string[]
  breakthrough_alert: { title: string; description: string } | null
  recommended_next_steps: string[]
  confidence_delta: number
  hypotheses_snapshot: Record<string, number>
  created_at: string
}

// ── D3 Tree Node ──────────────────────────────────────────────
export interface TreeNodeData {
  id: string
  data: Hypothesis | null
  children?: TreeNodeData[]
}

// ── API Payloads ──────────────────────────────────────────────
export interface CreateProgramPayload {
  title: string
  research_question: string
  domain?: Domain
  initial_hypothesis_count?: number
}

export interface CreateHypothesisPayload {
  program_id: string
  parent_id?: string
  title: string
  description: string
  rationale: string
  approach: string
  plausibility_score: number
  priority_rank?: number
  depth: number
  generation: number
  branch_path: string[]
}

export interface AgentRunResult {
  outcome: "succeeded" | "failed" | "inconclusive"
  findings: Finding[]
  conclusion: string
  should_spawn_children: boolean
  new_plausibility_for_related: Array<{ id: string; new_score: number }>
}

// ── Domain metadata ───────────────────────────────────────────
export const DOMAIN_LABELS: Record<Domain, string> = {
  drug_discovery: "Drug Discovery",
  genomics: "Genomics",
  materials: "Materials Science",
  chemistry: "Chemistry",
  climate: "Climate Science",
  physics: "Physics",
}

export const DOMAIN_ICONS: Record<Domain, string> = {
  drug_discovery: "💊",
  genomics: "🧬",
  materials: "⚗️",
  chemistry: "🔬",
  climate: "🌍",
  physics: "⚛️",
}
