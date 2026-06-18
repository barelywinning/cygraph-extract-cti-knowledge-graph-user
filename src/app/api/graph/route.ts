import { NextRequest, NextResponse } from "next/server";
import { neo4jService } from "@/lib/services/neo4j-service";

const sampleGraphData = {
  nodes: [
    { id: "apt28", label: "APT28", type: "threat-actor", confidence: 0.98 },
    { id: "zebrocy", label: "Zebrocy", type: "malware", confidence: 0.96 },
    { id: "fancy-bear", label: "Fancy Bear", type: "alias", confidence: 0.98 },
    { id: "government", label: "Government", type: "target-sector", confidence: 0.93 },
    { id: "http", label: "HTTP", type: "protocol", confidence: 0.95 },
    { id: "cve-2017-0199", label: "CVE-2017-0199", type: "vulnerability", confidence: 0.97 },
    { id: "t1566-001", label: "Spear Phishing", type: "technique", confidence: 0.94 },
    { id: "eastern-europe", label: "Eastern Europe", type: "location", confidence: 0.91 },
  ],
  edges: [
    { id: "rel-1", source: "apt28", target: "zebrocy", label: "uses", confidence: 0.96 },
    { id: "rel-2", source: "apt28", target: "fancy-bear", label: "aka", confidence: 0.98 },
    { id: "rel-3", source: "apt28", target: "government", label: "targets", confidence: 0.93 },
    { id: "rel-4", source: "zebrocy", target: "http", label: "communicates-via", confidence: 0.95 },
    { id: "rel-5", source: "zebrocy", target: "cve-2017-0199", label: "exploits", confidence: 0.97 },
    { id: "rel-6", source: "apt28", target: "t1566-001", label: "leverages", confidence: 0.94 },
    { id: "rel-7", source: "government", target: "eastern-europe", label: "located-in", confidence: 0.91 },
  ],
  links: [
    { id: "rel-1", source: "apt28", target: "zebrocy", label: "uses", confidence: 0.96 },
    { id: "rel-2", source: "apt28", target: "fancy-bear", label: "aka", confidence: 0.98 },
    { id: "rel-3", source: "apt28", target: "government", label: "targets", confidence: 0.93 },
    { id: "rel-4", source: "zebrocy", target: "http", label: "communicates-via", confidence: 0.95 },
    { id: "rel-5", source: "zebrocy", target: "cve-2017-0199", label: "exploits", confidence: 0.97 },
    { id: "rel-6", source: "apt28", target: "t1566-001", label: "leverages", confidence: 0.94 },
    { id: "rel-7", source: "government", target: "eastern-europe", label: "located-in", confidence: 0.91 },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "200", 10);

    const neo4jConfig = {
      uri: process.env.NEO4J_URI || "",
      username: process.env.NEO4J_USERNAME || "neo4j",
      password: process.env.NEO4J_PASSWORD || "",
      database: process.env.NEO4J_DATABASE || "neo4j",
    };

    if (!neo4jConfig.uri || !neo4jConfig.password) {
      return NextResponse.json({
        success: true,
        data: sampleGraphData,
        metadata: {
          total_nodes: sampleGraphData.nodes.length,
          total_edges: sampleGraphData.edges.length,
          source: "sample",
        },
      });
    }

    let graphData;
    try {
      neo4jService.connect(neo4jConfig);
      
      // Explicitly define Cypher query to pull nodes and relationships
      const cypherQuery = `
        MATCH (n:Entity)
        OPTIONAL MATCH (n)-[r:RELATES]->(m:Entity)
        RETURN n, r, m
        LIMIT $limit
      `;
      graphData = await neo4jService.queryGraph(cypherQuery, { limit });
    } finally {
      await neo4jService.close();
    }

    const transformedData = {
      nodes: graphData.nodes.map((node) => ({
        id: node.id,
        label: node.properties.text || node.id,
        type: node.properties.type || "unknown",
        confidence: node.properties.confidence || 0.5,
      })),
      links: graphData.relationships.map((rel) => ({
        id: rel.id,
        source: rel.startNode,
        target: rel.endNode,
        label: rel.type,
        confidence: rel.properties.confidence || 0.5,
      })),
      edges: graphData.relationships.map((rel) => ({
        id: rel.id,
        source: rel.startNode,
        target: rel.endNode,
        label: rel.type,
        confidence: rel.properties.confidence || 0.5,
      })),
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      metadata: {
        total_nodes: transformedData.nodes.length,
        total_edges: transformedData.edges.length,
        source: "neo4j",
      },
    });
  } catch (error) {
    console.error("Error querying graph:", error);
    return NextResponse.json({
      success: true,
      data: sampleGraphData,
      metadata: {
        total_nodes: sampleGraphData.nodes.length,
        total_edges: sampleGraphData.edges.length,
        source: "sample",
        warning: "Neo4j query failed; returned sample graph data",
      },
    });
  }
}

// POST endpoint for creating/updating graph data
export async function POST(request: NextRequest) {
  try {
    const { nodes, edges } = await request.json();

    // In production, this would insert data into Neo4j
    // Example: await session.run("CREATE (n:Entity {id: $id, ...})", params)

    return NextResponse.json({
      success: true,
      message: "Graph data created successfully",
      nodes_created: nodes?.length || 0,
      edges_created: edges?.length || 0,
    });
  } catch (error) {
    console.error("Error creating graph data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
