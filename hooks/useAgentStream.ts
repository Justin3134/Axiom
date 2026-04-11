"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import type { AgentLog } from "@/lib/types"

export function useAgentStream(programId: string, hypothesisId?: string) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

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
        setLogs((prev) => {
          const exists = prev.some((l) => l.id === log.id)
          if (exists) return prev
          return [...prev.slice(-200), log] // Keep last 200 log entries
        })
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
  }, [programId, hypothesisId])

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
