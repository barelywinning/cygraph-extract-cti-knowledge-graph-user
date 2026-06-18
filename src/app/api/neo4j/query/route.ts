import { NextRequest, NextResponse } from "next/server";
import { neo4jService } from "@/lib/services/neo4j-service";

function getConfigFromRequest(request: NextRequest) {
  const headerConfig = request.headers.get("x-neo4j-config");
  if (headerConfig) {
    try {
      const parsed = JSON.parse(headerConfig);
      return {
        uri: parsed.uri || "",
        username: parsed.username || "neo4j",
        password: parsed.password || "",
        database: parsed.database || process.env.NEO4J_DATABASE || "neo4j",
      };
    } catch {
      return null;
    }
  }

  return {
    uri: process.env.NEO4J_URI || "",
    username: process.env.NEO4J_USERNAME || "",
    password: process.env.NEO4J_PASSWORD || "",
    database: process.env.NEO4J_DATABASE || "neo4j",
  };
}

export async function GET(request: NextRequest) {
  try {
    const neo4jConfig = getConfigFromRequest(request);

    if (!neo4jConfig?.uri || !neo4jConfig.username || !neo4jConfig.password) {
      return NextResponse.json(
        { success: false, error: "Neo4j configuration missing" },
        { status: 500 }
      );
    }

    let graphData;
    try {
      neo4jService.connect(neo4jConfig);
      graphData = await neo4jService.queryGraph();
    } finally {
      await neo4jService.close();
    }

    // Transform to graph visualization format
    const transformedData = {
      nodes: graphData.nodes.map((node) => ({
        id: node.id,
        label: node.properties.text || node.id,
        type: node.properties.type || "unknown",
        confidence: node.properties.confidence || 0.5,
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
    });
  } catch (error: any) {
    console.error("Neo4j query error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, params, config } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Cypher query is required" },
        { status: 400 }
      );
    }

    const neo4jConfig = config || getConfigFromRequest(request) || {
      uri: process.env.NEO4J_URI || "",
      username: process.env.NEO4J_USERNAME || "",
      password: process.env.NEO4J_PASSWORD || "",
      database: process.env.NEO4J_DATABASE || "neo4j",
    };

    if (!neo4jConfig.uri || !neo4jConfig.username || !neo4jConfig.password) {
      return NextResponse.json(
        { error: "Neo4j configuration missing" },
        { status: 500 }
      );
    }

    let result;
    try {
      neo4jService.connect(neo4jConfig);
      result = await neo4jService.executeCypher(query, params);
    } finally {
      await neo4jService.close();
    }
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Neo4j query error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
