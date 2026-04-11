import { appendLog } from "@/lib/redis/db"
import type { LogType } from "@/lib/types"

export async function log(
  hypothesisId: string,
  programId: string,
  type: LogType,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await appendLog(hypothesisId, programId, type, content, metadata)
  } catch (err) {
    // Log failures should never crash the agent
    console.error("[logger] Failed to write log:", err)
  }
}
