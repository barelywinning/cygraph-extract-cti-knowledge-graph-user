"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, RefreshCw, Settings, Database } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Dynamic import to avoid SSR issues
const ForceGraphVisualization = dynamic(
  () => import("@/components/ForceGraphVisualization"),
  { ssr: false }
);

export default function GraphPage() {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [source, setSource] = useState<"localStorage" | "neo4j">("localStorage");
  const [stats, setStats] = useState({
    nodes: 0,
    edges: 0,
    entityTypes: 0,
  });

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async (forceNeo4j = false) => {
    setLoading(true);
    try {
      // First try Neo4j if configured and requested
      const savedConfig = localStorage.getItem("cygraph-config");
      const config = savedConfig ? JSON.parse(savedConfig) : {};

      if (forceNeo4j && config.neo4jUri) {
        const response = await fetch("/api/neo4j/query", {
          method: "GET",
          headers: {
            "x-neo4j-config": JSON.stringify({
              uri: config.neo4jUri,
              username: config.neo4jUsername,
              password: config.neo4jPassword,
            }),
          },
        });

        const result = await response.json();
        
        if (result.success && result.data) {
          setGraphData(result.data);
          setSource("neo4j");
          calculateStats(result.data);
          toast.success("Loaded graph from Neo4j");
          setLoading(false);
          return;
        }
      }

      // Fallback to localStorage
      const savedResults = localStorage.getItem("cti-results");
      if (savedResults) {
        const parsedResults = JSON.parse(savedResults);
        if (parsedResults.graph) {
          setGraphData(parsedResults.graph);
          setSource("localStorage");
          calculateStats(parsedResults.graph);
        }
      } else if (!forceNeo4j) {
        // Try API endpoint as last resort
        const response = await fetch("/api/graph");
        const result = await response.json();
        
        if (result.success && result.data) {
          setGraphData(result.data);
          calculateStats(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch graph data:", error);
      toast.error("Failed to load graph data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (data: any) => {
    const uniqueTypes = new Set(data.nodes?.map((n: any) => n.type));
    setStats({
      nodes: data.nodes?.length || 0,
      edges: data.edges?.length || 0,
      entityTypes: uniqueTypes.size,
    });
  };

  const handleRefreshFromNeo4j = () => {
    setRefreshing(true);
    fetchGraphData(true);
  };

  const handleSeedSampleData = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/neo4j/seed", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Sample data seeded! ${result.entities} entities, ${result.relationships} relationships`);
        // Immediately load the new data
        setTimeout(() => {
          handleRefreshFromNeo4j();
        }, 1000);
      } else {
        toast.error(result.error || "Failed to seed sample data");
      }
    } catch (error) {
      console.error("Failed to seed sample data:", error);
      toast.error("Failed to seed sample data");
    } finally {
      setSeeding(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cygraph-${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button onClick={handleSeedSampleData} variant="outline" disabled={seeding}>
              <Database className={`h-4 w-4 mr-2 ${seeding ? "animate-pulse" : ""}`} />
              {seeding ? "Seeding..." : "Seed Sample Data"}
            </Button>
            <Button onClick={handleRefreshFromNeo4j} variant="outline" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Load from Neo4j
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Knowledge Graph Visualization
            </h1>
            <Badge variant={source === "neo4j" ? "default" : "secondary"}>
              {source === "neo4j" ? "Neo4j" : "Given Data"}
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Interactive visualization of extracted threat intelligence entities and relationships
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Entities</CardDescription>
              <CardTitle className="text-3xl">{stats.nodes}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Relations</CardDescription>
              <CardTitle className="text-3xl">{stats.edges}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Entity Types</CardDescription>
              <CardTitle className="text-3xl">{stats.entityTypes}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Graph Visualization */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interactive Graph</CardTitle>



              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading graph visualization...</p>
                  </div>
                </div>
              ) : graphData?.nodes && graphData?.edges ? (
                <ForceGraphVisualization 
                  nodes={graphData.nodes} 
                  links={graphData.edges}
                  width={1200}
                  height={600}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-slate-500 mb-4">No graph data available</p>
                  <div className="flex gap-2">
                    <Button onClick={handleSeedSampleData} disabled={seeding}>
                      <Database className="h-4 w-4 mr-2" />
                      Seed Sample Data
                    </Button>
                    <Link href="/upload">
                      <Button variant="outline">Process CTI Text</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entity Types Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-red-500">Threat Actor</Badge>
              <Badge className="bg-orange-500">Malware</Badge>
              <Badge className="bg-yellow-500">Tool</Badge>
              <Badge className="bg-green-500">Vulnerability</Badge>
              <Badge className="bg-blue-500">Indicator</Badge>
              <Badge className="bg-purple-500">Campaign</Badge>
              <Badge className="bg-pink-500">Technique</Badge>
              <Badge className="bg-cyan-500">Location</Badge>
              <Badge className="bg-violet-500">Organization</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
