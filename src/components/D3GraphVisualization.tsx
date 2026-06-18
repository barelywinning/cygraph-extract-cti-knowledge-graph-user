"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from "lucide-react";

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  color?: string;
  size?: number;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  type?: string;
}

interface D3GraphVisualizationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onLinkClick?: (link: GraphLink) => void;
}

export default function D3GraphVisualization({
  nodes,
  links,
  width = 800,
  height = 600,
  onNodeClick,
  onLinkClick,
}: D3GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const container = svg.append("g");

    // Define arrow markers for directed edges
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#94a3b8");

    // Create force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    // Create links
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        if (onLinkClick) onLinkClick(d);
      });

    // Create link labels
    const linkLabel = container
      .append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("font-size", 10)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .text((d) => d.label || "");

    // Create nodes
    const node = container
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d.size || 20)
      .attr("fill", (d) => d.color || "#6366f1")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        if (onNodeClick) onNodeClick(d);
      })
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      );

    // Create node labels
    const nodeLabel = container
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("font-size", 12)
      .attr("font-weight", "600")
      .attr("fill", "#1e293b")
      .attr("text-anchor", "middle")
      .attr("dy", 35)
      .text((d) => d.label)
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);

      nodeLabel.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    // Drag functions
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior as any);

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onNodeClick, onLinkClick]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.3);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.7);
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(750)
      .call(
        d3
          .zoom<SVGSVGElement, unknown>()
          .transform as any,
        d3.zoomIdentity
      );
  };

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button size="sm" variant="secondary" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Graph Canvas */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white dark:bg-slate-900"
      />

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="w-64">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Node Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Label:</span>
                <p className="font-medium">{selectedNode.label}</p>
              </div>
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Type:</span>
                <Badge variant="secondary" className="ml-2">
                  {selectedNode.type}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-400">ID:</span>
                <p className="text-xs font-mono">{selectedNode.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10">
        <Badge variant="secondary">Zoom: {(zoom * 100).toFixed(0)}%</Badge>
      </div>
    </div>
  );
}