import { NextRequest, NextResponse } from "next/server";
import { neo4jService } from "@/lib/services/neo4j-service";
import { aiExtractionService } from "@/lib/services/ai-extraction-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, config } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Text is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Get configuration (Neo4j + Gemini)
    const envNeo4jConfig =
      process.env.NEO4J_URI && process.env.NEO4J_PASSWORD
        ? {
            uri: process.env.NEO4J_URI,
            username: process.env.NEO4J_USERNAME || "neo4j",
            password: process.env.NEO4J_PASSWORD,
            database: process.env.NEO4J_DATABASE || "neo4j",
          }
        : undefined;
    const neo4jConfig = config?.neo4j || envNeo4jConfig;
    const geminiKey = config?.gemini || process.env.GEMINI_API_KEY;
    let extractionMethod = "pattern-based";

    // Step 1: Extract triples using AI or fallback to pattern-based
    let extractionResult;
    
    if (geminiKey) {
      try {
        aiExtractionService.initialize(geminiKey);
        extractionResult = await aiExtractionService.extractTriples(text);
        extractionMethod = "ai";
      } catch (error) {
        console.warn("AI extraction failed, falling back to pattern-based:", error);
        extractionResult = aiExtractionService.extractTriplesPattern(text);
      }
    } else {
      extractionResult = aiExtractionService.extractTriplesPattern(text);
    }

    // Step 2: Build entities and relations from triples
    const entitiesMap = new Map();
    const relations: any[] = [];

    extractionResult.triples.forEach((triple, idx) => {
      // Add entity1
      if (!entitiesMap.has(triple.entity1)) {
        entitiesMap.set(triple.entity1, {
          id: `entity-${entitiesMap.size}`,
          text: triple.entity1,
          type: triple.entity1Type,
          confidence: triple.confidence,
        });
      }

      // Add entity2
      if (!entitiesMap.has(triple.entity2)) {
        entitiesMap.set(triple.entity2, {
          id: `entity-${entitiesMap.size}`,
          text: triple.entity2,
          type: triple.entity2Type,
          confidence: triple.confidence,
        });
      }

      // Add relation
      const entity1Id = entitiesMap.get(triple.entity1).id;
      const entity2Id = entitiesMap.get(triple.entity2).id;

      relations.push({
        id: `relation-${idx}`,
        source: entity1Id,
        target: entity2Id,
        relation: triple.relation,
        confidence: triple.confidence,
      });
    });

    const entities = Array.from(entitiesMap.values());

    // Step 3: Store in Neo4j if configured
    let neo4jStored = false;
    if (neo4jConfig?.uri && neo4jConfig?.username && neo4jConfig?.password) {
      try {
        neo4jService.connect(neo4jConfig);

        // Store entities
        for (const entity of entities) {
          await neo4jService.createEntity(entity);
        }

        // Store relations
        for (const relation of relations) {
          await neo4jService.createRelation(relation);
        }

        neo4jStored = true;
      } catch (error) {
        console.error("Neo4j storage failed:", error);
        // Continue without Neo4j storage
      } finally {
        await neo4jService.close();
      }
    }

    // Step 4: Build graph data
    const graph = {
      nodes: entities.map((e) => ({
        id: e.id,
        label: e.text,
        type: e.type,
        confidence: e.confidence,
      })),
      edges: relations.map((r) => ({
        id: r.id,
        source: r.source,
        target: r.target,
        label: r.relation,
        confidence: r.confidence,
      })),
    };

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      entities,
      relations,
      graph,
      metadata: {
        processing_time: processingTime,
        model_version: extractionResult.metadata.model,
        confidence_threshold: 0.5,
        text_length: text.length,
        total_entities: entities.length,
        total_relations: relations.length,
        neo4j_stored: neo4jStored,
        extraction_method: extractionMethod,
      },
    });
  } catch (error: any) {
    console.error("CTI processing error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
