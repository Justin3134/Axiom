import { NextRequest } from "next/server"
import { getLogsFromCursor } from "@/lib/redis/db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const programId = searchParams.get("programId")
  const hypothesisId = searchParams.get("hypothesisId") ?? undefined

  if (!programId) {
    return new Response("Missing programId", { status: 400 })
  }

  const encoder = new TextEncoder()
  let cursor = 0
  let intervalId: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": heartbeat\n\n"))

      intervalId = setInterval(async () => {
        try {
          const { logs, nextCursor } = await getLogsFromCursor(
            programId,
            cursor,
            hypothesisId
          )

          if (logs.length > 0) {
            cursor = nextCursor
            for (const entry of logs) {
              const payload = `data: ${JSON.stringify(entry)}\n\n`
              controller.enqueue(encoder.encode(payload))
            }
          }
        } catch {
          // Poll failures are non-fatal
        }
      }, 1500)

      req.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId)
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      if (intervalId) clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
