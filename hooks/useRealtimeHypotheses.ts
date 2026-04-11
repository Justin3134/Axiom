"use client"
import { useState, useEffect, useRef } from "react"
import type { Hypothesis } from "@/lib/types"

const POLL_INTERVAL = 4000

// Replaces Supabase Realtime with HTTP polling against the REST API
export function useRealtimeHypotheses(programId: string) {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!programId) return

    const fetchHypotheses = async () => {
      // Cancel any in-flight request before starting a new one
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(`/api/programs/${programId}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setHypotheses((data.hypotheses as Hypothesis[]) || [])
        setError(null)
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    const startPolling = () => {
      fetchHypotheses()
      intervalRef.current = setInterval(fetchHypotheses, POLL_INTERVAL)
    }

    const stopPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    startPolling()

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      stopPolling()
      abortRef.current?.abort()
    }
  }, [programId])

  return { hypotheses, loading, error }
}
