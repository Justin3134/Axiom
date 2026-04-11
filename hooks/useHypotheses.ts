"use client"
import { useState, useEffect, useCallback } from "react"
import type { Hypothesis } from "@/lib/types"

export function useHypotheses(programId: string) {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHypotheses = useCallback(async () => {
    if (!programId) return
    try {
      const res = await fetch(`/api/programs/${programId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setHypotheses((data.hypotheses as Hypothesis[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    fetchHypotheses()
  }, [fetchHypotheses])

  const stats = {
    total: hypotheses.length,
    queued: hypotheses.filter((h) => h.status === "queued").length,
    running: hypotheses.filter((h) => h.status === "running").length,
    succeeded: hypotheses.filter((h) => h.status === "succeeded").length,
    failed: hypotheses.filter((h) => h.status === "failed").length,
    pruned: hypotheses.filter((h) => h.status === "pruned").length,
  }

  return { hypotheses, loading, error, stats, refetch: fetchHypotheses }
}
