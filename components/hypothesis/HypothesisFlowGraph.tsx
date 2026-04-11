"use client"

import { useEffect, useCallback, useMemo, useRef, useState } from "react"
import dagre from "@dagrejs/dagre"
import ReactFlow, {
  Background,
  Handle,
  Panel,
  Position,
  NodeTypes,
  EdgeTypes,
  EdgeProps,
  getBezierPath,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow"
import "reactflow/dist/style.css"
import type { ResearchProgram, Hypothesis, Briefing } from "@/lib/types"
import { DOMAIN_LABELS } from "@/lib/types"

// ─── Accent colors per root hypothesis index ──────────────────
const ACCENT_COLORS = [
  "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7",
  "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#14b8a6",
]
function accentFor(i: number) { return ACCENT_COLORS[i % ACCENT_COLORS.length] }

// ─── Branch color: inherit from root ancestor ─────────────────
function getRootAncestor(h: Hypothesis, all: Hypothesis[]): Hypothesis {
  if (!h.parent_id) return h
  const parent = all.find((x) => x.id === h.parent_id)
  return parent ? getRootAncestor(parent, all) : h
}
function accentForHyp(h: Hypothesis, all: Hypothesis[], roots: Hypothesis[]): string {
  const root = getRootAncestor(h, all)
  const idx = roots.findIndex((r) => r.id === root.id)
  return accentFor(idx === -1 ? 0 : idx)
}

// ─── Status config ────────────────────────────────────────────
const STATUS_CFG: Record<string, {
  badgeColor: string; badgeBg: string; label: string; border: string
}> = {
  queued:    { border: "#3f3f46", badgeColor: "#71717a", badgeBg: "rgba(113,113,122,0.14)", label: "Queued" },
  running:   { border: "#3b82f6", badgeColor: "#3b82f6", badgeBg: "rgba(59,130,246,0.14)",  label: "Running" },
  succeeded: { border: "#22c55e", badgeColor: "#22c55e", badgeBg: "rgba(34,197,94,0.14)",   label: "Done" },
  failed:    { border: "#ef4444", badgeColor: "#ef4444", badgeBg: "rgba(239,68,68,0.14)",   label: "Failed" },
  pruned:    { border: "#27272a", badgeColor: "#52525b", badgeBg: "rgba(82,82,91,0.10)",    label: "Pruned" },
  paused:    { border: "#eab308", badgeColor: "#eab308", badgeBg: "rgba(234,179,8,0.12)",   label: "Paused" },
}

// ─── Node dimensions registered with dagre ────────────────────
// LR layout: width is the horizontal extent, height is vertical
const DIMS: Record<string, { w: number; h: number }> = {
  program:            { w: 260, h: 110 },
  hypothesis:         { w: 200, h: 148 },
  skeletonProgram:    { w: 260, h: 110 },
  skeletonHypothesis: { w: 200, h: 148 },
}

type Direction = "LR" | "TB"

const HANDLE_STYLE = { background: "#3f3f46", border: "1px solid #52525b", width: 6, height: 6 }

// ─── Dagre layout ─────────────────────────────────────────────
function layoutElements(nodes: Node[], edges: Edge[], dir: Direction): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: dir, ranksep: 72, nodesep: 14 })
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach((n) => {
    const d = DIMS[n.type ?? "hypothesis"] ?? DIMS.hypothesis
    g.setNode(n.id, { width: d.w, height: d.h })
  })
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n
    const d = DIMS[n.type ?? "hypothesis"] ?? DIMS.hypothesis
    return { ...n, position: { x: pos.x - d.w / 2, y: pos.y - d.h / 2 } }
  })
}

// ─── Running bar ──────────────────────────────────────────────
function RunningBar({ color }: { color: string }) {
  return (
    <div style={{ position: "relative", height: 2, overflow: "hidden", background: color + "22" }}>
      <div
        className="scan-line"
        style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(90deg, transparent, ${color}cc, transparent)`,
          width: "40%",
        }}
      />
    </div>
  )
}

// ─── Program node ─────────────────────────────────────────────
interface ProgramNodeData { program: ResearchProgram; runningCount: number; dir: Direction }

function ProgramNode({ data }: { data: ProgramNodeData }) {
  const { program, runningCount, dir } = data
  const isRunning = program.status === "active" && runningCount > 0
  const isDone    = program.status === "completed"
  const borderColor = isDone ? "#22c55e" : isRunning ? "#3b82f6" : "#2a2a2e"

  return (
    <div style={{
      background: "#121214",
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      width: 260,
      overflow: "hidden",
      boxShadow: isDone
        ? "0 0 28px rgba(34,197,94,0.16), 0 4px 16px rgba(0,0,0,0.5)"
        : isRunning
        ? "0 0 28px rgba(59,130,246,0.16), 0 4px 16px rgba(0,0,0,0.5)"
        : "0 4px 16px rgba(0,0,0,0.4)",
    }}>
      {isRunning && <RunningBar color="#3b82f6" />}
      {!isRunning && <div style={{ height: 2, background: isDone ? "#22c55e" : "#2a2a2e" }} />}

      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 8, color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            AXIOM
          </span>
          <span style={{
            fontSize: 8, padding: "2px 6px", borderRadius: 3, letterSpacing: "0.06em", fontWeight: 700,
            textTransform: "uppercase",
            background: isDone ? "rgba(34,197,94,0.14)" : isRunning ? "rgba(59,130,246,0.14)" : "rgba(82,82,91,0.14)",
            color: isDone ? "#22c55e" : isRunning ? "#3b82f6" : "#71717a",
          }}>
            {isDone ? "Completed" : isRunning ? "Active" : program.status}
          </span>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", marginBottom: 4, lineHeight: 1.3 }}>
          {program.title}
        </div>

        <div style={{ fontSize: 10, color: "#71717a", lineHeight: 1.4, marginBottom: 8,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {program.research_question}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6, borderTop: "1px solid #1a1a1e" }}>
          <span style={{ fontSize: 9, color: "#52525b" }}>{DOMAIN_LABELS[program.domain]}</span>
          {runningCount > 0 && (
            <span style={{ fontSize: 9, color: "#3b82f6" }}>{runningCount} running</span>
          )}
        </div>
      </div>

      <Handle type="source" position={dir === "TB" ? Position.Bottom : Position.Right} style={HANDLE_STYLE} />
    </div>
  )
}

// ─── Hypothesis node ──────────────────────────────────────────
interface HypothesisNodeData { hypothesis: Hypothesis; accent: string; dir: Direction; onOpen?: () => void }

function HypothesisNode({ data }: { data: HypothesisNodeData }) {
  const { hypothesis: h, accent, dir, onOpen } = data
  const cfg       = STATUS_CFG[h.status] ?? STATUS_CFG.queued
  const isRunning = h.status === "running"
  const isDone    = h.status === "succeeded"
  const isFailed  = h.status === "failed"
  const isQueued  = h.status === "queued"

  const borderColor = isRunning ? accent + "cc" : isDone ? accent + "aa" : isFailed ? accent + "88" : accent + "44"
  const stripeColor = isQueued ? accent + "55" : accent

  const displayText = h.conclusion || h.failure_reason || ""

  return (
    <div
      onClick={onOpen}
      style={{
        background: "#121214",
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        width: 200,
        overflow: "hidden",
        boxShadow: isRunning
          ? `0 0 20px ${accent}33, 0 4px 12px rgba(0,0,0,0.5)`
          : isDone
          ? `0 0 14px ${accent}22, 0 4px 10px rgba(0,0,0,0.4)`
          : "0 4px 12px rgba(0,0,0,0.3)",
        cursor: onOpen ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { if (onOpen) (e.currentTarget as HTMLDivElement).style.borderColor = accent + "dd" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = borderColor }}
    >
      <div style={{ height: 2, background: stripeColor }} />
      {isRunning && <RunningBar color={accent} />}

      <div style={{ padding: "8px 10px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5", lineHeight: 1.3, flex: 1,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
            {h.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
            <span style={{
              fontSize: 8, padding: "2px 5px", borderRadius: 3,
              background: cfg.badgeBg, color: cfg.badgeColor,
              letterSpacing: "0.05em", fontWeight: 700, textTransform: "uppercase" as const,
            }}>
              {cfg.label}
            </span>
            {h.depth > 0 && (
              <span style={{
                fontSize: 7, padding: "1px 4px", borderRadius: 2,
                background: accent + "18", color: accent + "bb",
                letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" as const,
              }}>
                GEN {h.depth}
              </span>
            )}
          </div>
        </div>

        {/* Plausibility bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 8, color: "#52525b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Plausibility
            </span>
            <span style={{ fontSize: 8, color: accent }}>
              {Math.round(h.plausibility_score * 100)}%
            </span>
          </div>
          <div style={{ height: 2, background: "#1a1a1e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${h.plausibility_score * 100}%`,
              background: accent, borderRadius: 2, transition: "width 0.3s ease",
            }} />
          </div>
        </div>

        {/* Output */}
        <div style={{ paddingTop: 5, borderTop: "1px solid #1a1a1e" }}>
          {displayText ? (
            <div style={{
              fontSize: 9, lineHeight: 1.45,
              color: isFailed ? "#ef444488" : isDone ? "#a1a1aa" : "#71717a",
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const, overflow: "hidden",
            }}>
              {displayText}
              {isRunning && (
                <span className="cursor-blink" style={{
                  display: "inline-block", width: 5, height: 8,
                  background: accent, marginLeft: 2, verticalAlign: "text-bottom",
                }} />
              )}
            </div>
          ) : (
            <div style={{ fontSize: 9, color: "#3f3f46" }}>
              {isRunning ? "Running…" : isQueued ? "Waiting…" : "—"}
            </div>
          )}
        </div>

        {onOpen && (
          <div style={{
            marginTop: 5, fontSize: 8,
            color: accent + "77", letterSpacing: "0.06em",
            textTransform: "uppercase", textAlign: "right",
          }}>
            Open →
          </div>
        )}
      </div>

      <Handle type="target" position={dir === "TB" ? Position.Top    : Position.Left}  style={HANDLE_STYLE} />
      <Handle type="source" position={dir === "TB" ? Position.Bottom : Position.Right} style={HANDLE_STYLE} />
    </div>
  )
}

// ─── Animated edge ────────────────────────────────────────────
function AnimatedEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const isActive = (data as { active?: boolean })?.active ?? false
  const color    = (data as { color?: string })?.color ?? "#27272a"

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={isActive ? color + "66" : "#27272a"}
        strokeWidth={isActive ? 1.5 : 1}
        fill="none"
        style={{ pointerEvents: "none" }}
      />
      {isActive && (
        <circle r={2.5} fill={color}>
          <animateMotion dur="1.6s" repeatCount="indefinite" calcMode="linear">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      )}
    </>
  )
}

// ─── Skeleton shimmer bar ─────────────────────────────────────
function ShimmerBar({ width, height = 7, delay = 0 }: { width: string | number; height?: number; delay?: number }) {
  return (
    <div style={{
      width, height, background: "#1e1e22", borderRadius: 3,
      animation: "shimmer 2.2s ease-in-out infinite",
      animationDelay: `${delay}s`,
    }} />
  )
}

// ─── Skeleton nodes ───────────────────────────────────────────
function SkeletonProgramNode() {
  return (
    <div style={{ background: "#121214", border: "1px solid #1e1e22", borderRadius: 10, width: 260, overflow: "hidden" }}>
      <div style={{ height: 2, background: "#1e1e22", animation: "shimmer 2.2s ease-in-out infinite" }} />
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <ShimmerBar width={70} height={6} delay={0} />
          <ShimmerBar width={44} height={6} delay={0.1} />
        </div>
        <ShimmerBar width="85%" height={10} delay={0.15} />
        <div style={{ marginTop: 4 }}><ShimmerBar width="70%" height={10} delay={0.2} /></div>
        <div style={{ marginTop: 4 }}><ShimmerBar width="55%" height={8} delay={0.25} /></div>
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #1a1a1e" }}>
          <ShimmerBar width={80} height={6} delay={0.3} />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  )
}

function SkeletonHypothesisNode({ data }: { data: { accent: string; delay: number; dir?: Direction } }) {
  const { accent, delay, dir = "LR" } = data
  return (
    <div style={{ background: "#121214", border: `1px solid ${accent}22`, borderRadius: 8, width: 200, overflow: "hidden" }}>
      <div style={{ height: 2, background: accent + "33", animation: "shimmer 2.2s ease-in-out infinite", animationDelay: `${delay}s` }} />
      <div style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between", marginBottom: 7 }}>
          <ShimmerBar width="65%" height={8} delay={delay} />
          <ShimmerBar width={36} height={6} delay={delay + 0.1} />
        </div>
        <ShimmerBar width="90%" height={6} delay={delay + 0.15} />
        <div style={{ marginTop: 3 }}><ShimmerBar width="70%" height={6} delay={delay + 0.2} /></div>
        <div style={{ marginTop: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <ShimmerBar width={44} height={5} delay={delay + 0.25} />
            <ShimmerBar width={20} height={5} delay={delay + 0.25} />
          </div>
          <div style={{ height: 2, background: "#1a1a1e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "45%", background: accent + "33", borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ marginTop: 7, paddingTop: 5, borderTop: "1px solid #1a1a1e" }}>
          <ShimmerBar width="80%" height={5} delay={delay + 0.3} />
          <div style={{ marginTop: 3 }}><ShimmerBar width="55%" height={5} delay={delay + 0.35} /></div>
        </div>
      </div>
      <Handle type="target" position={dir === "TB" ? Position.Top    : Position.Left}  style={HANDLE_STYLE} />
      <Handle type="source" position={dir === "TB" ? Position.Bottom : Position.Right} style={HANDLE_STYLE} />
    </div>
  )
}

// ─── Skeleton edge ────────────────────────────────────────────
function SkeletonEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const accent = (data as { accent?: string })?.accent ?? "#27272a"
  return (
    <>
      <path id={id} className="react-flow__edge-path" d={edgePath}
        stroke={accent + "33"} strokeWidth={1} fill="none" style={{ pointerEvents: "none" }} />
      <circle r={2.5} fill={accent + "66"}>
        <animateMotion dur="2.8s" repeatCount="indefinite" calcMode="linear">
          <mpath href={`#${id}`} />
        </animateMotion>
      </circle>
    </>
  )
}

// ─── Type registries ──────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  program:            ProgramNode as any,
  hypothesis:         HypothesisNode as any,
  skeletonProgram:    SkeletonProgramNode as any,
  skeletonHypothesis: SkeletonHypothesisNode as any,
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: EdgeTypes = { animated: AnimatedEdge as any, skeleton: SkeletonEdge as any }

// ─── Build live graph ─────────────────────────────────────────
function buildGraph(
  program: ResearchProgram,
  hypotheses: Hypothesis[],
  runningCount: number,
  dir: Direction,
  onHypothesisClick?: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {

  const sortedRoots = [...hypotheses]
    .filter((h) => !h.parent_id)
    .sort((a, b) => (b.plausibility_score ?? 0) - (a.plausibility_score ?? 0))

  const nodes: Node[] = [
    {
      id: "program",
      type: "program",
      position: { x: 0, y: 0 },
      data: { program, runningCount, dir } as ProgramNodeData,
      draggable: false,
    },
    ...hypotheses.map((h) => ({
      id: `hyp_${h.id}`,
      type: "hypothesis",
      position: { x: 0, y: 0 },
      data: {
        hypothesis: h,
        accent: accentForHyp(h, hypotheses, sortedRoots),
        dir,
        onOpen: onHypothesisClick ? () => onHypothesisClick(h.id) : undefined,
      } as HypothesisNodeData,
      draggable: false,
    })),
  ]

  const edges: Edge[] = hypotheses.flatMap((h) => {
    const accent = accentForHyp(h, hypotheses, sortedRoots)
    const isActive = h.status === "running" || h.status === "succeeded"
    const sourceId = h.parent_id ? `hyp_${h.parent_id}` : "program"
    return [{
      id: `edge_${h.id}`,
      source: sourceId,
      target: `hyp_${h.id}`,
      type: "animated",
      data: { active: isActive, color: accent },
    }]
  })

  const layouted = layoutElements(nodes, edges, dir)
  return { nodes: layouted, edges }
}

// ─── Build skeleton graph ─────────────────────────────────────
function buildSkeletonGraph(dir: Direction): { nodes: Node[]; edges: Edge[] } {
  const COUNT = 5
  const nodes: Node[] = [
    { id: "skel_prog", type: "skeletonProgram", position: { x: 0, y: 0 }, data: {}, draggable: false },
    ...[...Array(COUNT)].map((_, i) => ({
      id: `skel_h${i}`,
      type: "skeletonHypothesis",
      position: { x: 0, y: 0 },
      data: { accent: accentFor(i), delay: i * 0.1, dir },
      draggable: false,
    })),
  ]
  const edges: Edge[] = [...Array(COUNT)].map((_, i) => ({
    id: `skel_e${i}`,
    source: "skel_prog",
    target: `skel_h${i}`,
    type: "skeleton",
    data: { accent: accentFor(i) },
  }))
  const layouted = layoutElements(nodes, edges, dir)
  return { nodes: layouted, edges }
}

// ─── Props ────────────────────────────────────────────────────
export interface HypothesisFlowGraphProps {
  program: ResearchProgram
  hypotheses: Hypothesis[]
  briefing: Briefing | null
  onGenerateBriefing: () => void
  generating: boolean
  onHypothesisClick?: (id: string) => void
  dir?: Direction
  onDirChange?: (d: Direction) => void
}

// ─── Direction toggle button ──────────────────────────────────
function DirectionToggle({ dir, onChange }: { dir: Direction; onChange: (d: Direction) => void }) {
  const options: { value: Direction; label: string; title: string }[] = [
    { value: "LR", label: "→", title: "Horizontal (left → right)" },
    { value: "TB", label: "↓", title: "Vertical (top → bottom)" },
  ]
  return (
    <div style={{
      display: "flex",
      background: "rgba(12,12,14,0.88)",
      border: "1px solid #27272a",
      borderRadius: 7,
      overflow: "hidden",
      backdropFilter: "blur(8px)",
      gap: 1,
    }}>
      {options.map((opt) => {
        const active = dir === opt.value
        return (
          <button
            key={opt.value}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "5px 11px",
              border: "none",
              background: active ? "rgba(255,255,255,0.07)" : "transparent",
              color: active ? "#e4e4e7" : "#52525b",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.12s, color 0.12s",
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa"
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#52525b"
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Inner component ──────────────────────────────────────────
function HypothesisFlowGraphInner({
  program, hypotheses, onHypothesisClick, dir: dirProp = "LR", onDirChange,
}: HypothesisFlowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { fitView } = useReactFlow()
  const dir = dirProp
  const prevCount = useRef(0)
  const runningCount = hypotheses.filter((h) => h.status === "running").length

  const rebuild = useCallback(() => {
    const { nodes: n, edges: e } = buildGraph(program, hypotheses, runningCount, dir, onHypothesisClick)
    setNodes(n)
    setEdges(e)
    if (hypotheses.length > prevCount.current) {
      prevCount.current = hypotheses.length
      setTimeout(() => fitView({ padding: 0.14, duration: 600 }), 50)
    }
  }, [program, hypotheses, runningCount, dir, onHypothesisClick, setNodes, setEdges, fitView])

  useEffect(() => { rebuild() }, [rebuild])

  // Re-fit when direction changes
  const handleDirChange = useCallback((next: Direction) => {
    onDirChange?.(next)
    setTimeout(() => fitView({ padding: 0.14, duration: 500 }), 80)
  }, [fitView, onDirChange])

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "hypothesis") {
      const data = node.data as HypothesisNodeData
      data.onOpen?.()
    }
  }, [])

  if (hypotheses.length === 0) {
    const skel = buildSkeletonGraph(dir)
    return (
      <ReactFlow
        nodes={skel.nodes} edges={skel.edges}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        onInit={(i) => i.fitView({ padding: 0.14 })}
        proOptions={{ hideAttribution: true }}
        fitView minZoom={0.1} maxZoom={1.5}
        panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        style={{ background: "var(--bg-base)" }}
      >
        <Background color="#1a1a1e" gap={28} size={1} />
        <Panel position="top-right">
          <DirectionToggle dir={dir} onChange={handleDirChange} />
        </Panel>
      </ReactFlow>
    )
  }

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      onInit={(i) => i.fitView({ padding: 0.14 })}
      proOptions={proOptions}
      fitView minZoom={0.08} maxZoom={1.5}
      nodesDraggable={false} nodesConnectable={false}
      onNodeClick={handleNodeClick}
      style={{ background: "var(--bg-base)" }}
    >
      <Background color="#1a1a1e" gap={28} size={1} />
      <Panel position="top-right">
        <DirectionToggle dir={dir} onChange={handleDirChange} />
      </Panel>
    </ReactFlow>
  )
}

// ─── Export wrapped in ReactFlowProvider ──────────────────────
export default function HypothesisFlowGraph(props: HypothesisFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <HypothesisFlowGraphInner {...props} />
    </ReactFlowProvider>
  )
}
