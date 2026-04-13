"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import type { AgentLog } from "@/lib/types"

export function useAgentStream(programId: string, hypothesisId?: string) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  // Track the highest log index already loaded so SSE only appends new entries
  const historicalCountRef = useRef(0)

  const addLogs = useCallback((incoming: AgentLog[]) => {
    setLogs((prev) => {
      const existingIds = new Set(prev.map((l) => l.id))
      const fresh = incoming.filter((l) => !existingIds.has(l.id))
      if (fresh.length === 0) return prev
      return [...prev, ...fresh].slice(-500)
    })
  }, [])

  // Pre-fetch all historical logs immediately (no SSE wait)
  useEffect(() => {
    if (!programId || !hypothesisId) return
    mountedRef.current = true

    fetch(`/api/hypotheses/${hypothesisId}/logs?programId=${programId}`)
      .then((r) => r.json())
      .then((data: { logs?: AgentLog[] }) => {
        if (!mountedRef.current) return
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          historicalCountRef.current = data.logs.length
          addLogs(data.logs)
        }
      })
      .catch(() => {/* non-fatal */})

    return () => { mountedRef.current = false }
  }, [programId, hypothesisId, addLogs])

  const connect = useCallback(() => {
    if (!programId || !mountedRef.current) return

    const params = new URLSearchParams({ programId })
    if (hypothesisId) params.set("hypothesisId", hypothesisId)

    const es = new EventSource(`/api/agents/stream?${params}`)
    eventSourceRef.current = es

    es.onopen = () => {
      if (mountedRef.current) setConnected(true)
    }

    es.onmessage = (event) => {
      if (!mountedRef.current) return
      if (!event.data || event.data.trim() === "") return
      try {
        const log: AgentLog = JSON.parse(event.data)
        addLogs([log])
      } catch {
        // Non-JSON heartbeat lines — ignore
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }
    }
  }, [programId, hypothesisId, addLogs])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      eventSourceRef.current?.close()
      setConnected(false)
    }
  }, [connect])

  const clearLogs = useCallback(() => setLogs([]), [])

  return { logs, connected, clearLogs }
}
