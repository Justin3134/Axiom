import { NextRequest, NextResponse } from "next/server"
import { runOrchestratorCycle } from "@/lib/orchestrator"

export const maxDuration = 300 // 5 minutes for Vercel Pro

export async function POST(req: NextRequest) {
  // Verify cron secret — prevents unauthorized triggers
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runOrchestratorCycle()
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[orchestrator] Cycle failed:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
