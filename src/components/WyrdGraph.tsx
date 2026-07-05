"use client";

/**
 * WyrdGraph — the declarative SVG renderer. Given a GraphModel it draws the
 * origin crossguard, every edge, and every node, and manages a lightweight
 * follow-cursor tooltip. All geometry comes from the pure layout layer; this
 * component only maps model → JSX and owns hover state.
 */

import { useState } from "react";
import { COLORS, GEOMETRY } from "@/lib/graph/theme";
import { dayY, laneX, renderEdge, svgHeight } from "@/lib/graph/layout";
import type { GraphModel, GraphNode } from "@/lib/graph/types";

interface TooltipState {
  x: number;
  y: number;
  meta: string;
  text: string;
  ghost: boolean;
}

const TOOLTIP_WIDTH = 220;

function nodeMeta(node: GraphNode): string {
  if (node.kind === "ghost") return `DAY ${node.day + 1} · GHOST`;
  const tasks = node.total ? ` · ${node.done}/${node.total} TASKS` : "";
  return `DAY ${node.day + 1}${tasks}`;
}

export default function WyrdGraph({ model }: { model: GraphModel }) {
  const [tip, setTip] = useState<TooltipState | null>(null);

  const height = svgHeight(model);
  const ox = laneX(model.origin.lane);
  const oy = dayY(0);

  function place(e: React.MouseEvent, node: GraphNode) {
    const left = Math.min(e.clientX + 14, window.innerWidth - (TOOLTIP_WIDTH + 16));
    setTip({
      x: left,
      y: e.clientY + 14,
      meta: nodeMeta(node),
      text: node.msg,
      ghost: node.kind === "ghost",
    });
  }

  return (
    <>
      <svg
        width={GEOMETRY.width}
        height={height}
        viewBox={`0 0 ${GEOMETRY.width} ${height}`}
        style={{ display: "block", margin: "0 auto" }}
        role="img"
        aria-label="Your trajectory as a commit graph"
      >
        {/* —— origin: sword crossguard —— */}
        <line
          x1={ox - 26}
          y1={oy - 16}
          x2={ox + 26}
          y2={oy - 16}
          stroke={model.origin.color}
          strokeWidth={3}
        />
        <circle
          cx={ox}
          cy={oy - 30}
          r={4}
          fill="none"
          stroke={model.origin.color}
          strokeWidth={2.5}
        />

        {/* —— edges —— */}
        {model.edges.map((edge, i) => {
          const r = renderEdge(edge);
          return (
            <path
              key={`e${i}`}
              d={r.d}
              fill="none"
              stroke={r.color}
              strokeWidth={r.width}
              strokeDasharray={r.dash}
              opacity={r.opacity}
            />
          );
        })}

        {/* —— nodes —— */}
        {model.nodes.map((node, i) => (
          <NodeMark
            key={`n${i}`}
            node={node}
            onEnter={(e) => place(e, node)}
            onMove={(e) => place(e, node)}
            onLeave={() => setTip(null)}
          />
        ))}
      </svg>

      {tip && (
        <div
          style={{
            position: "fixed",
            left: tip.x,
            top: tip.y,
            width: TOOLTIP_WIDTH,
            padding: "10px 12px",
            background: COLORS.paperCard,
            border: `1.5px solid ${tip.ghost ? COLORS.inkSoft : COLORS.magenta}`,
            borderRadius: 3,
            boxShadow: "0 3px 10px rgba(58,46,28,.25)",
            fontSize: 14,
            lineHeight: 1.35,
            pointerEvents: "none",
            zIndex: 60,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: COLORS.inkSoft,
              marginBottom: 3,
            }}
          >
            {tip.meta}
          </div>
          <div style={tip.ghost ? { fontStyle: "italic", color: COLORS.inkSoft } : undefined}>
            {tip.text}
          </div>
        </div>
      )}
    </>
  );
}

interface NodeMarkProps {
  node: GraphNode;
  onEnter: (e: React.MouseEvent) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;
}

function NodeMark({ node, onEnter, onMove, onLeave }: NodeMarkProps) {
  const x = laneX(node.lane);
  const y = dayY(node.day);
  // A node with no task total is a branch-origin marker — a plain solid dot.
  const hasTasks = node.total != null;
  const ratio = hasTasks ? (node.done ?? 0) / (node.total ?? 1) : 0;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onEnter}
    >
      {node.tip && (
        <circle cx={x} cy={y} r={15} fill={node.color} fillOpacity={0.18}>
          <animate
            attributeName="r"
            values="12;17;12"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {node.kind === "ghost" ? (
        <circle
          cx={x}
          cy={y}
          r={GEOMETRY.ghostNodeRadius}
          fill="none"
          stroke={node.color}
          strokeWidth={1.8}
          strokeDasharray="3 3"
        />
      ) : node.kind === "merge" || node.kind === "counter" ? (
        <rect
          x={x - 6}
          y={y - 6}
          width={12}
          height={12}
          fill={node.kind === "counter" ? COLORS.magenta : COLORS.gold}
          stroke={COLORS.ink}
          strokeWidth={1}
          transform={`rotate(45 ${x} ${y})`}
        />
      ) : (
        <circle
          cx={x}
          cy={y}
          r={GEOMETRY.nodeRadius}
          fill={node.color}
          fillOpacity={hasTasks ? 0.2 + 0.8 * ratio : 1}
          stroke={node.color}
          strokeWidth={1.8}
        />
      )}

      {node.total ? (
        <text
          x={x + 14}
          y={y + 4}
          fontSize={10.5}
          fontFamily="var(--font-crimson), serif"
          fontWeight={600}
          fill={ratio >= 0.8 ? COLORS.ink : COLORS.inkSoft}
        >
          {node.done}/{node.total}
        </text>
      ) : null}
    </g>
  );
}
