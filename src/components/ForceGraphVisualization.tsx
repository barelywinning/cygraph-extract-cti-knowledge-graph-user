"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

interface Node {
  id: string;
  label: string;
  type: string;
  confidence?: number;
}

interface Link {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence?: number;
}

interface ForceGraphVisualizationProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
}

const NODE_COLORS: Record<string, string> = {
  "threat-actor": "#ef4444",
  "malware": "#f97316",
  "tool": "#eab308",
  "vulnerability": "#22c55e",
  "indicator": "#3b82f6",
  "campaign": "#a855f7",
  "technique": "#ec4899",
  "location": "#06b6d4",
  "organization": "#8b5cf6",
  "unknown": "#6b7280",
};

export default function ForceGraphVisualization({
  nodes,
  links,
  width = 1200,
  height = 600,
}: ForceGraphVisualizationProps) {
  const fgRef = useRef<any>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<any>(null);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge").strength(-300);
      fgRef.current.d3Force("link").distance(100);
    }
  }, []);

  const handleNodeHover = (node: any) => {
    setHighlightNodes(new Set(node ? [node.id] : []));
    setHoverNode(node);
  };

  const handleLinkHover = (link: any) => {
    setHighlightLinks(new Set(link ? [link.id] : []));
  };

  const paintNode = (node: any, ctx: CanvasRenderingContext2D) => {
    const size = 6;
    const color = NODE_COLORS[node.type] || NODE_COLORS.unknown;
    const isHighlighted = highlightNodes.has(node.id);

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();

    // Highlight if hovered
    if (isHighlighted) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw label
    if (isHighlighted || nodes.length < 50) {
      const label = node.label || node.id;
      const fontSize = 10;
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x, node.y + size + 8);
    }
  };

  const paintLink = (link: any, ctx: CanvasRenderingContext2D) => {
    const isHighlighted = highlightLinks.has(link.id);
    
    ctx.strokeStyle = isHighlighted ? "#6366f1" : "#94a3b8";
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.globalAlpha = isHighlighted ? 1 : 0.6;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();

    // Draw arrow
    const arrowLength = 8;
    const arrowWidth = 4;
    const angle = Math.atan2(
      link.target.y - link.source.y,
      link.target.x - link.source.x
    );
    
    ctx.save();
    ctx.translate(link.target.x, link.target.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowLength, -arrowWidth);
    ctx.lineTo(-arrowLength, arrowWidth);
    ctx.closePath();
    ctx.fillStyle = isHighlighted ? "#6366f1" : "#94a3b8";
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;

    // Draw label if highlighted
    if (isHighlighted) {
      const midX = (link.source.x + link.target.x) / 2;
      const midY = (link.source.y + link.target.y) / 2;
      const label = link.label || "related-to";
      
      ctx.font = "9px Sans-Serif";
      ctx.fillStyle = "#1e293b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, midX, midY - 8);
    }
  };

  return (
    <div className="relative w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        width={width}
        height={height}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        cooldownTicks={100}
        onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
      />
      
      {hoverNode && (
        <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
            {hoverNode.label}
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Type:</span>
              <span className="font-medium capitalize">{hoverNode.type}</span>
            </div>
            {hoverNode.confidence && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Confidence:</span>
                <span className="font-medium">{(hoverNode.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}