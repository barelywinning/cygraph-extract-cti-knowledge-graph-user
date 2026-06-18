import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedTriple {
  entity1: string;
  entity1Type: string;
  relation: string;
  entity2: string;
  entity2Type: string;
  confidence: number;
}

export interface AIExtractionResult {
  triples: ExtractedTriple[];
  metadata: {
    model: string;
    processingTime: number;
  };
}

class AIExtractionService {
  private genAI: GoogleGenerativeAI | null = null;

  /**
   * Initialize Gemini client
   */
  initialize(apiKey: string): void {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Extract semantic triples using Gemini
   */
  async extractTriples(text: string): Promise<AIExtractionResult> {
    if (!this.genAI) {
      throw new Error("Gemini client not initialized");
    }

    const startTime = Date.now();

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const prompt = `You are a cybersecurity threat intelligence analyst. Extract entity-relation-entity triples from CTI text.

For each triple, identify:
1. entity1: First entity (threat actor, malware, vulnerability, tool, etc.)
2. entity1_type: Type of first entity (threat-actor, malware, vulnerability, tool, technique, indicator, campaign, location, organization)
3. relation: The relationship (uses, exploits, targets, communicates-with, deploys, creates, associated-with, aka, located-in, part-of, derived-from)
4. entity2: Second entity
5. entity2_type: Type of second entity
6. confidence: Confidence score 0-1

Return ONLY a valid JSON object with a "triples" array. Extract ALL possible relationships, not just obvious ones.

Example output:
{
  "triples": [
    {
      "entity1": "APT28",
      "entity1_type": "threat-actor",
      "relation": "uses",
      "entity2": "Zebrocy",
      "entity2_type": "malware",
      "confidence": 0.95
    }
  ]
}

CTI Text:
${text}

Return only valid JSON, no additional text:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\n/, "").replace(/\n```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\n/, "").replace(/\n```$/, "");
      }
      
      const parsed = JSON.parse(jsonText);
      const triples = parsed.triples || parsed.results || [];

      const processingTime = Date.now() - startTime;

      return {
        triples: this.validateTriples(triples),
        metadata: {
          model: "gemini-2.5-flash-lite",
          processingTime,
        },
      };
    } catch (error) {
      console.error("AI extraction failed:", error);
      throw error;
    }
  }

  /**
   * Validate and normalize extracted triples
   */
  private validateTriples(triples: any[]): ExtractedTriple[] {
    const validTypes = new Set([
      "threat-actor",
      "malware",
      "vulnerability",
      "tool",
      "technique",
      "indicator",
      "campaign",
      "location",
      "organization",
      "unknown",
    ]);

    const validRelations = new Set([
      "uses",
      "exploits",
      "targets",
      "communicates-with",
      "deploys",
      "creates",
      "associated-with",
      "aka",
      "located-in",
      "part-of",
      "derived-from",
      "related-to",
    ]);

    return triples
      .filter((t) => t.entity1 && t.entity2 && t.relation)
      .map((t) => ({
        entity1: String(t.entity1).trim(),
        entity1Type: validTypes.has(t.entity1_type || t.entity1Type)
          ? t.entity1_type || t.entity1Type
          : "unknown",
        relation: validRelations.has(t.relation) ? t.relation : "related-to",
        entity2: String(t.entity2).trim(),
        entity2Type: validTypes.has(t.entity2_type || t.entity2Type)
          ? t.entity2_type || t.entity2Type
          : "unknown",
        confidence: Math.min(Math.max(Number(t.confidence || 0.7), 0), 1),
      }));
  }

  /**
   * Fallback pattern-based extraction when AI is not available
   */
  extractTriplesPattern(text: string): AIExtractionResult {
    const startTime = Date.now();
    const triples: ExtractedTriple[] = [];

    // Pattern matching for common CTI relationships
    const patterns = [
      {
        regex: /(\w+(?:\s+\w+)*)\s+(?:uses|utilizing|deploys)\s+(\w+(?:\s+\w+)*)/gi,
        relation: "uses",
      },
      {
        regex: /(\w+(?:\s+\w+)*)\s+(?:exploits|exploiting)\s+(CVE-\d{4}-\d+|\w+(?:\s+\w+)*)/gi,
        relation: "exploits",
      },
      {
        regex: /(\w+(?:\s+\w+)*)\s+(?:targets|targeting)\s+(\w+(?:\s+\w+)*)/gi,
        relation: "targets",
      },
      {
        regex: /(\w+(?:\s+\w+)*)\s+(?:aka|also known as)\s+(\w+(?:\s+\w+)*)/gi,
        relation: "aka",
      },
    ];

    patterns.forEach(({ regex, relation }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        triples.push({
          entity1: match[1].trim(),
          entity1Type: this.inferEntityType(match[1]),
          relation,
          entity2: match[2].trim(),
          entity2Type: this.inferEntityType(match[2]),
          confidence: 0.7,
        });
      }
    });

    return {
      triples,
      metadata: {
        model: "pattern-based",
        processingTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Infer entity type from text
   */
  private inferEntityType(text: string): string {
    const lower = text.toLowerCase();
    
    if (/apt\d+|fancy bear|cozy bear|lazarus/i.test(text)) return "threat-actor";
    if (/malware|trojan|ransomware|backdoor/i.test(lower)) return "malware";
    if (/cve-\d{4}-\d+/i.test(text)) return "vulnerability";
    if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)) return "indicator";
    if (/mimikatz|powershell|cobalt strike/i.test(lower)) return "tool";
    
    return "unknown";
  }
}

export const aiExtractionService = new AIExtractionService();