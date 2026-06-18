// Ontology Management Service
// Handles OWL ontology parsing, validation, and browser-compatible operations

export interface OntologyClass {
  id: string;
  label: string;
  description?: string;
  superClasses: string[];
  properties: OntologyProperty[];
}

export interface OntologyProperty {
  id: string;
  label: string;
  domain: string[];
  range: string[];
  type: "object" | "datatype";
}

export interface OntologyRelation {
  id: string;
  label: string;
  domain: string;
  range: string;
  inverse?: string;
}

export interface OntologyStructure {
  classes: OntologyClass[];
  properties: OntologyProperty[];
  relations: OntologyRelation[];
}

class OntologyManager {
  private ontology: OntologyStructure | null = null;

  /**
   * Load and parse OWL ontology file
   * In a browser environment, this uses DOMParser to parse XML
   */
  async loadOntology(fileContent: string): Promise<OntologyStructure> {
    try {
      // Parse OWL/RDF XML using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fileContent, "text/xml");

      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Failed to parse OWL file: Invalid XML");
      }

      // Extract classes
      const classes = this.extractClasses(xmlDoc);
      const properties = this.extractProperties(xmlDoc);
      const relations = this.extractRelations(xmlDoc);

      this.ontology = {
        classes,
        properties,
        relations,
      };

      return this.ontology;
    } catch (error) {
      console.error("Error loading ontology:", error);
      throw error;
    }
  }

  /**
   * Extract OWL classes from XML document
   */
  private extractClasses(xmlDoc: Document): OntologyClass[] {
    const classes: OntologyClass[] = [];
    const classElements = xmlDoc.querySelectorAll("owl\\:Class, Class");

    classElements.forEach((element) => {
      const id = element.getAttribute("rdf:about") || element.getAttribute("rdf:ID") || "";
      const label = element.querySelector("rdfs\\:label, label")?.textContent || id;
      const description = element.querySelector("rdfs\\:comment, comment")?.textContent;

      const superClassElements = element.querySelectorAll("rdfs\\:subClassOf, subClassOf");
      const superClasses: string[] = [];
      superClassElements.forEach((sc) => {
        const scId = sc.getAttribute("rdf:resource");
        if (scId) superClasses.push(scId);
      });

      classes.push({
        id,
        label,
        description,
        superClasses,
        properties: [],
      });
    });

    return classes;
  }

  /**
   * Extract OWL properties from XML document
   */
  private extractProperties(xmlDoc: Document): OntologyProperty[] {
    const properties: OntologyProperty[] = [];
    const propertyElements = xmlDoc.querySelectorAll(
      "owl\\:ObjectProperty, ObjectProperty, owl\\:DatatypeProperty, DatatypeProperty"
    );

    propertyElements.forEach((element) => {
      const id = element.getAttribute("rdf:about") || element.getAttribute("rdf:ID") || "";
      const label = element.querySelector("rdfs\\:label, label")?.textContent || id;
      const type = element.tagName.includes("Object") ? "object" : "datatype";

      const domainElements = element.querySelectorAll("rdfs\\:domain, domain");
      const domain: string[] = [];
      domainElements.forEach((d) => {
        const dId = d.getAttribute("rdf:resource");
        if (dId) domain.push(dId);
      });

      const rangeElements = element.querySelectorAll("rdfs\\:range, range");
      const range: string[] = [];
      rangeElements.forEach((r) => {
        const rId = r.getAttribute("rdf:resource");
        if (rId) range.push(rId);
      });

      properties.push({
        id,
        label,
        domain,
        range,
        type,
      });
    });

    return properties;
  }

  /**
   * Extract relations (object properties) from ontology
   */
  private extractRelations(xmlDoc: Document): OntologyRelation[] {
    const relations: OntologyRelation[] = [];
    const relationElements = xmlDoc.querySelectorAll("owl\\:ObjectProperty, ObjectProperty");

    relationElements.forEach((element) => {
      const id = element.getAttribute("rdf:about") || element.getAttribute("rdf:ID") || "";
      const label = element.querySelector("rdfs\\:label, label")?.textContent || id;

      const domainElement = element.querySelector("rdfs\\:domain, domain");
      const domain = domainElement?.getAttribute("rdf:resource") || "";

      const rangeElement = element.querySelector("rdfs\\:range, range");
      const range = rangeElement?.getAttribute("rdf:resource") || "";

      const inverseElement = element.querySelector("owl\\:inverseOf, inverseOf");
      const inverse = inverseElement?.getAttribute("rdf:resource") || undefined;

      relations.push({
        id,
        label,
        domain,
        range,
        inverse,
      });
    });

    return relations;
  }

  /**
   * Get current ontology structure
   */
  getOntology(): OntologyStructure | null {
    return this.ontology;
  }

  /**
   * Validate entity type against ontology
   */
  validateEntityType(entityType: string): boolean {
    if (!this.ontology) return false;
    return this.ontology.classes.some(
      (c) => c.id === entityType || c.label.toLowerCase() === entityType.toLowerCase()
    );
  }

  /**
   * Validate relation against ontology
   */
  validateRelation(relation: string, sourceType: string, targetType: string): boolean {
    if (!this.ontology) return false;
    return this.ontology.relations.some(
      (r) =>
        (r.id === relation || r.label.toLowerCase() === relation.toLowerCase()) &&
        r.domain === sourceType &&
        r.range === targetType
    );
  }

  /**
   * Get valid relations for a source entity type
   */
  getValidRelations(sourceType: string): OntologyRelation[] {
    if (!this.ontology) return [];
    return this.ontology.relations.filter((r) => r.domain === sourceType);
  }

  /**
   * Get class hierarchy
   */
  getClassHierarchy(): Map<string, string[]> {
    const hierarchy = new Map<string, string[]>();
    if (!this.ontology) return hierarchy;

    this.ontology.classes.forEach((c) => {
      if (!hierarchy.has(c.id)) {
        hierarchy.set(c.id, []);
      }
      c.superClasses.forEach((sc) => {
        if (!hierarchy.has(sc)) {
          hierarchy.set(sc, []);
        }
        hierarchy.get(sc)?.push(c.id);
      });
    });

    return hierarchy;
  }

  /**
   * Load default CTI ontology
   */
  loadDefaultOntology(): OntologyStructure {
    // Default CTI ontology structure
    const defaultOntology: OntologyStructure = {
      classes: [
        {
          id: "ThreatActor",
          label: "Threat Actor",
          description: "Entity that conducts malicious cyber activities",
          superClasses: ["Entity"],
          properties: [],
        },
        {
          id: "Malware",
          label: "Malware",
          description: "Malicious software",
          superClasses: ["ThreatIndicator"],
          properties: [],
        },
        {
          id: "Vulnerability",
          label: "Vulnerability",
          description: "Security weakness in a system",
          superClasses: ["ThreatIndicator"],
          properties: [],
        },
        {
          id: "Technique",
          label: "Attack Technique",
          description: "Method used to conduct attack",
          superClasses: ["ThreatIndicator"],
          properties: [],
        },
        {
          id: "Target",
          label: "Target",
          description: "Victim of cyber attack",
          superClasses: ["Entity"],
          properties: [],
        },
        {
          id: "IOC",
          label: "Indicator of Compromise",
          description: "Observable artifact indicating potential intrusion",
          superClasses: ["ThreatIndicator"],
          properties: [],
        },
      ],
      properties: [
        {
          id: "hasName",
          label: "has name",
          domain: ["Entity"],
          range: ["string"],
          type: "datatype",
        },
        {
          id: "hasConfidence",
          label: "has confidence",
          domain: ["Entity", "Relation"],
          range: ["float"],
          type: "datatype",
        },
      ],
      relations: [
        {
          id: "uses",
          label: "uses",
          domain: "ThreatActor",
          range: "Malware",
          inverse: "usedBy",
        },
        {
          id: "targets",
          label: "targets",
          domain: "ThreatActor",
          range: "Target",
          inverse: "targetedBy",
        },
        {
          id: "exploits",
          label: "exploits",
          domain: "Malware",
          range: "Vulnerability",
          inverse: "exploitedBy",
        },
        {
          id: "leverages",
          label: "leverages",
          domain: "ThreatActor",
          range: "Technique",
          inverse: "leveragedBy",
        },
        {
          id: "communicatesVia",
          label: "communicates via",
          domain: "Malware",
          range: "Protocol",
        },
      ],
    };

    this.ontology = defaultOntology;
    return defaultOntology;
  }
}

// Export singleton instance
export const ontologyManager = new OntologyManager();