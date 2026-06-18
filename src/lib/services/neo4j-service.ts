import neo4j, { Driver, Session } from "neo4j-driver";

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

const stripQuotes = (val: string | undefined): string => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

class Neo4jService {
  private driver: Driver | null = null;

  /**
   * Initialize Neo4j connection
   */
  connect(config: Neo4jConfig): void {
    try {
      const uri = stripQuotes(config.uri);
      const username = stripQuotes(config.username);
      const password = stripQuotes(config.password);

      // For Neo4j Aura (neo4j+s://), use simple connection without extra config
      this.driver = neo4j.driver(
        uri,
        neo4j.auth.basic(username, password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000,
        }
      );
    } catch (error) {
      console.error("Failed to connect to Neo4j:", error);
      throw error;
    }
  }

  /**
   * Close Neo4j connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  /**
   * Test Neo4j connection
   */
  async testConnection(config: Neo4jConfig): Promise<{ success: boolean; version?: string; error?: string }> {
    let tempDriver: Driver | null = null;
    let session: Session | null = null;
    try {
      const uri = stripQuotes(config.uri);
      const username = stripQuotes(config.username);
      const password = stripQuotes(config.password);

      // Create driver for Neo4j Aura
      tempDriver = neo4j.driver(
        uri,
        neo4j.auth.basic(username, password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000,
        }
      );

      // Verify connectivity
      await tempDriver.verifyConnectivity();

      // Get version using default database
      session = tempDriver.session({ database: config.database || "neo4j" });
      const result = await session.run("RETURN 'Connection successful' as status");
      
      // Try to get version
      try {
        const versionResult = await session.run("CALL dbms.components() YIELD versions RETURN versions[0] as version");
        const version = versionResult.records[0]?.get("version") || "Connected";
        return { success: true, version };
      } catch {
        // If version query fails, just return success
        return { success: true, version: "Connected" };
      }
    } catch (error: any) {
      console.error("Neo4j connection error:", error);
      return { 
        success: false, 
        error: error.message || "Connection failed" 
      };
    } finally {
      if (session) {
        await session.close();
      }
      if (tempDriver) {
        await tempDriver.close();
      }
    }
  }

  /**
   * Store entity in Neo4j
   */
  async createEntity(entity: {
    id: string;
    text: string;
    type: string;
    confidence: number;
    attributes?: Record<string, any>;
  }): Promise<void> {
    if (!this.driver) throw new Error("Neo4j driver not initialized");

    const session = this.driver.session({ database: "neo4j" });
    try {
      await session.run(
        `
        MERGE (e:Entity {id: $id})
        SET e.text = $text,
            e.type = $type,
            e.confidence = $confidence,
            e.attributes = $attributes,
            e.updated_at = datetime()
        `,
        {
          id: entity.id,
          text: entity.text,
          type: entity.type,
          confidence: entity.confidence,
          attributes: JSON.stringify(entity.attributes || {}),
        }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Store relation in Neo4j
   */
  async createRelation(relation: {
    source: string;
    target: string;
    relation: string;
    confidence: number;
  }): Promise<void> {
    if (!this.driver) throw new Error("Neo4j driver not initialized");

    const session = this.driver.session({ database: "neo4j" });
    try {
      await session.run(
        `
        MATCH (source:Entity {id: $sourceId})
        MATCH (target:Entity {id: $targetId})
        MERGE (source)-[r:RELATES {type: $relationType}]->(target)
        SET r.confidence = $confidence,
            r.updated_at = datetime()
        `,
        {
          sourceId: relation.source,
          targetId: relation.target,
          relationType: relation.relation,
          confidence: relation.confidence,
        }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Query graph data
   */
  async queryGraph(cypherQuery?: string, params?: Record<string, any>): Promise<{
    nodes: Neo4jNode[];
    relationships: Neo4jRelationship[];
  }> {
    if (!this.driver) throw new Error("Neo4j driver not initialized");

    const session = this.driver.session({ database: "neo4j" });
    try {
      const query = cypherQuery || `
        MATCH (n:Entity)
        OPTIONAL MATCH (n)-[r:RELATES]->(m:Entity)
        RETURN n, r, m
        LIMIT $limit
      `;

      const result = await session.run(query, {
        limit: params?.limit ?? 200,
        ...(params || {}),
      });
      
      const nodes: Neo4jNode[] = [];
      const relationships: Neo4jRelationship[] = [];
      const nodeIds = new Set<string>();

      result.records.forEach((record) => {
        const n = record.get("n");
        const r = record.get("r");
        const m = record.get("m");

        if (n && !nodeIds.has(n.properties.id)) {
          nodes.push({
            id: n.properties.id || n.identity.toString(),
            labels: n.labels,
            properties: n.properties,
          });
          nodeIds.add(n.properties.id);
        }

        if (m && !nodeIds.has(m.properties.id)) {
          nodes.push({
            id: m.properties.id || m.identity.toString(),
            labels: m.labels,
            properties: m.properties,
          });
          nodeIds.add(m.properties.id);
        }

        if (r && n && m) {
          relationships.push({
            id: r.identity.toString(),
            type: r.properties.type || r.type,
            startNode: n.properties.id || n.identity.toString(),
            endNode: m.properties.id || m.identity.toString(),
            properties: r.properties,
          });
        }
      });

      return { nodes, relationships };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute custom Cypher query
   */
  async executeCypher(query: string, params?: Record<string, any>): Promise<any[]> {
    if (!this.driver) throw new Error("Neo4j driver not initialized");

    const session = this.driver.session({ database: "neo4j" });
    try {
      const result = await session.run(query, params || {});
      return result.records.map((record) => record.toObject());
    } finally {
      await session.close();
    }
  }

  /**
   * Clear all graph data
   */
  async clearGraph(): Promise<void> {
    if (!this.driver) throw new Error("Neo4j driver not initialized");

    const session = this.driver.session({ database: "neo4j" });
    try {
      await session.run("MATCH (n) DETACH DELETE n");
    } finally {
      await session.close();
    }
  }
}

export const neo4jService = new Neo4jService();