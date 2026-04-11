"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import type { ResearchProgram } from "@/lib/types"

const POLL_INTERVAL = 3000

export function useProgram(programId: string) {
  const [program, setProgram] = useState<ResearchProgram | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchProgram = useCallback(async () => {
    if (!programId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(`/api/programs/${programId}`, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProgram(data)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    fetchProgram()
    intervalRef.current = setInterval(fetchProgram, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      abortRef.current?.abort()
    }
  }, [fetchProgram])

  return { program, loading, error, refetch: fetchProgram }
}

export function usePrograms() {
  const [programs, setPrograms] = useState<ResearchProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPrograms = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch("/api/programs", { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPrograms(data)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrograms()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchPrograms])

  return { programs, loading, error, refetch: fetchPrograms }
}
