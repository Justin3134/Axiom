"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import { useRealtimeHypotheses } from "@/hooks/useRealtimeHypotheses"
import HypothesisPanel from "./HypothesisPanel"
import type { Hypothesis, TreeNodeData } from "@/lib/types"

const STATUS_COLORS: Record<string, string> = {
  queued: "#71717a",
  running: "#3b82f6",
  succeeded: "#22c55e",
  failed: "#ef4444",
  pruned: "#27272a",
  paused: "#eab308",
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  pruned: "Pruned",
  paused: "Paused",
}

interface Props {
  programId: string
}

type D3HierarchyNode = d3.HierarchyPointNode<TreeNodeData>

export default function HypothesisTree({ programId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { hypotheses, loading } = useRealtimeHypotheses(programId)
  const [selectedHypothesis, setSelectedHypothesis] =
    useState<Hypothesis | null>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 })

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width: Math.max(width, 600), height: Math.max(height, 400) })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const buildTree = useCallback((): TreeNodeData => {
    const rootHypotheses = hypotheses.filter((h) => !h.parent_id)
    const childMap: Record<string, Hypothesis[]> = {}

    hypotheses
      .filter((h) => h.parent_id)
      .forEach((h) => {
        if (!childMap[h.parent_id!]) childMap[h.parent_id!] = []
        childMap[h.parent_id!].push(h)
      })

    function buildNode(h: Hypothesis): TreeNodeData {
      return {
        id: h.id,
        data: h,
        children: (childMap[h.id] || []).map(buildNode),
      }
    }

    return {
      id: "root",
      data: null,
      children: rootHypotheses.map(buildNode),
    }
  }, [hypotheses])

  useEffect(() => {
    if (!hypotheses.length || !svgRef.current) return

    const { width, height } = dimensions
    const margin = { top: 60, right: 60, bottom: 60, left: 60 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const treeData = buildTree()

    const treeLayout = d3
      .tree<TreeNodeData>()
      .size([innerW, innerH])
      .separation((a, b) => (a.parent === b.parent ? 1.8 : 2.5))

    const hierarchyRoot = d3.hierarchy(treeData)
    const treeNodes = treeLayout(hierarchyRoot)

    // Container group with zoom + pan
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom)

    // Draw curved edges
    const linkGen = d3
      .linkVertical<
        d3.HierarchyPointLink<TreeNodeData>,
        d3.HierarchyPointNode<TreeNodeData>
      >()
      .x((d) => d.x)
      .y((d) => d.y)

    g.selectAll(".link")
      .data(treeNodes.links().filter((l) => l.source.data.id !== "root"))
      .join("path")
      .attr("class", "link")
      .attr("d", linkGen)
      .attr("fill", "none")
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 1.5)

    // Draw nodes (skip the virtual root)
    const nodes = treeNodes
      .descendants()
      .filter((d: D3HierarchyNode) => d.data.id !== "root")

    const nodeGroups = g
      .selectAll<SVGGElement, D3HierarchyNode>(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        const h = d.data.data
        if (h) setSelectedHypothesis(h)
      })

    // Outer glow ring for running nodes
    nodeGroups
      .filter((d) => d.data.data?.status === "running")
      .append("circle")
      .attr("r", (d) => {
        const score = d.data.data?.plausibility_score ?? 0.5
        return 10 + score * 14 + 8
      })
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 1)
      .attr("opacity", 0)
      .each(function () {
        d3.select(this)
          .append("animate")
          .attr("attributeName", "r")
          .attr("from", "12")
          .attr("to", "30")
          .attr("dur", "1.8s")
          .attr("repeatCount", "indefinite")
        d3.select(this)
          .append("animate")
          .attr("attributeName", "opacity")
          .attr("from", "0.6")
          .attr("to", "0")
          .attr("dur", "1.8s")
          .attr("repeatCount", "indefinite")
      })

    // Main node circle — size proportional to plausibility score
    nodeGroups
      .append("circle")
      .attr("r", (d) => {
        const score = d.data.data?.plausibility_score ?? 0.5
        return 8 + score * 14
      })
      .attr("fill", (d) => {
        const status = d.data.data?.status || "queued"
        return STATUS_COLORS[status] || "#6b7280"
      })
      .attr("fill-opacity", (d) =>
        d.data.data?.status === "pruned" ? 0.15 : 0.75
      )
      .attr("stroke", (d) => {
        const status = d.data.data?.status
        if (status === "running") return "#3b82f6"
        if (status === "succeeded") return "#22c55e"
        return "transparent"
      })
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)

    // Node label text
    nodeGroups
      .append("text")
      .attr("dy", (d) => {
        const score = d.data.data?.plausibility_score ?? 0.5
        return 8 + score * 14 + 14
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#6a6a7a")
      .attr("font-size", "8.5px")
      .attr("font-family", "JetBrains Mono, monospace")
      .text((d) => {
        const title = d.data.data?.title || ""
        return title.length > 22 ? title.slice(0, 22) + "…" : title
      })

    // Hover tooltip effect
    nodeGroups
      .on("mouseenter", function (_, d) {
        const score = d.data.data?.plausibility_score ?? 0.5
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("fill-opacity", 1)
          .attr("r", 10 + score * 14)
      })
      .on("mouseleave", function (_, d) {
        const score = d.data.data?.plausibility_score ?? 0.5
        const opacity = d.data.data?.status === "pruned" ? 0.15 : 0.75
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("fill-opacity", opacity)
          .attr("r", 8 + score * 14)
      })
  }, [hypotheses, dimensions, buildTree])

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full font-mono text-sm"
        style={{ color: "#4a4a5a" }}
      >
        Loading hypothesis tree...
      </div>
    )
  }

  if (!hypotheses.length) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: "#4a4a5a" }}
      >
        <div className="text-4xl">🌱</div>
        <div className="font-mono text-sm">No hypotheses yet</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-3">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: STATUS_COLORS[status] }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: "#6a6a7a" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div
        className="absolute top-4 right-4 z-10 text-right"
        style={{ color: "#4a4a5a" }}
      >
        <div className="text-xs font-mono" style={{ color: "#3b82f6" }}>
          {hypotheses.filter((h) => h.status === "running").length} running
        </div>
        <div className="text-xs font-mono">
          {hypotheses.filter((h) => h.status === "queued").length} queued ·{" "}
          {hypotheses.length} total
        </div>
      </div>

      {/* Instruction */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs font-mono"
        style={{ color: "#3a3a4a" }}
      >
        Scroll to zoom · Drag to pan · Click node to inspect
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ background: "transparent" }}
      />

      {/* Slide-out detail panel */}
      {selectedHypothesis && (
        <HypothesisPanel
          hypothesis={selectedHypothesis}
          programId={programId}
          onClose={() => setSelectedHypothesis(null)}
        />
      )}
    </div>
  )
}
