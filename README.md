# CyGraph-Extract

**Automated Framework for Constructing Real-Time Malware Threat Intelligence Knowledge Graphs**

A production-ready full-stack application that constructs knowledge graphs from unstructured Cyber Threat Intelligence (CTI) text using Named Entity Recognition (NER), self-correcting relation extraction, and ontology validation.

---

## Features

### Core Capabilities
- **Multi-Stage NER Pipeline**: Extract entities (Malware, ThreatActor, Tool, Vulnerability, Campaign, Tactic, Indicator, Location) with pattern-based fallbacks.
- **Self-Correcting Relation Extraction**: Dual-agent architecture featuring a Generator (LLM) and Validator (Ontology) with built-in feedback loops.
- **Ontology Management**: OWL-based validation and reasoning built directly into Next.js.
- **Neo4j Knowledge Graph**: Persistent storage with Cypher query API.
- **Interactive Visualization**: D3.js-powered graph exploration with drag-and-drop mechanics.
- **Real-Time Dashboard**: Metrics, statistics, and system monitoring.
- **Feedback System**: Human-in-the-loop corrections for pipeline improvement.

### Technical Highlights
- **Next.js 15** frontend and backend using the App Router.
- **TypeScript** for compile-time type safety and verification.
- **Tailwind CSS** + Shadcn/UI components for a modern interface.
- **Google Gemini API** (utilizing `gemini-2.5-flash-lite`) for relationship extraction.
- **Neo4j** graph database integration.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (Next.js)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Upload  │  │  Graph   │  │ Results  │  │Dashboard │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Server (TypeScript)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CTI Processing Pipeline (/api/process-cti)          │  │
│  │  1. Text Preprocessing                               │  │
│  │  2. NER Pattern-Based Fallback                       │  │
│  │  3. Relation Extraction (Gemini 2.5 Flash Lite)      │  │
│  │  4. Ontology Validation & OWL Schema                 │  │
│  │  5. Self-Correcting Feedback Loop                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Neo4j Knowledge Graph Database                  │
│  Nodes: Entities | Edges: Relations | Constraints & Indexes │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation and Setup

### Prerequisites
- **Node.js** 18+
- **Neo4j** 4.4+ (or Docker)
- **npm** or **bun**

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/cygraph-extract.git
cd cygraph-extract
```

### 2. Install Dependencies
```bash
npm install
# or
bun install
```

### 3. Neo4j Setup
**Option A: Docker**
```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest
```

**Option B: Local Installation**
- Download from [neo4j.com/download](https://neo4j.com/download/)
- Set password to `password` (or update in configuration)

### 4. Environment Variables
Create `.env.local` in the project root:
```env
# Neo4j Database Configuration
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=neo4j

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Run Application
```bash
npm run dev
# or
bun dev
```

Access the application at: **http://localhost:3000**

---

## Usage Guide

### 1. Upload CTI Text
Navigate to `/upload` and:
- Paste CTI text directly.
- Upload `.txt` files.
- Click "Load Sample Text" for a demonstration.

**Example CTI Text:**
```
APT28, also known as Fancy Bear, has been observed deploying the 
Zebrocy malware family to target government and military organizations 
across Eastern Europe. The malware uses HTTP for C2 communication and 
exfiltrates sensitive documents. Recent campaigns have leveraged 
spear-phishing emails with malicious attachments exploiting CVE-2017-0199.
```

### 2. View Extraction Results
After processing, navigate to `/results` to see:
- Extracted entities with confidence scores.
- Relation triples (subject -> relation -> object).
- Validation status (Valid | Invalid).

### 3. Explore Knowledge Graph
Navigate to `/graph` for:
- Interactive force-directed visualization.
- Dragging nodes to rearrange the layout.
- Clicking nodes for entity details.
- Color-coded entity types.

### 4. Monitor Dashboard
Navigate to `/dashboard` for:
- Extraction metrics (precision, recall, F1).
- Entity distribution charts.
- Relation frequency analysis.
- System health logs.

---

## Ontology Structure

**Core Classes** (`cygraph.owl`):
```
Malware
  ├─ uses -> Tool
  ├─ exploits -> Vulnerability
  └─ targets -> Location

ThreatActor
  ├─ uses -> Malware | Tool
  ├─ conducts -> Campaign
  └─ operates_in -> Location

Tool
  └─ used_by -> ThreatActor | Malware

Vulnerability
  └─ exploited_by -> Malware

Campaign
  └─ conducted_by -> ThreatActor

Tactic
  └─ employed_by -> ThreatActor | Campaign

Indicator (IOC)
  └─ associated_with -> Malware | Campaign
```

**Validation Rules:**
- `uses` valid only between: ThreatActor -> Tool/Malware
- `exploits` valid only between: Malware -> Vulnerability
- `targets` valid only between: ThreatActor/Malware -> Location

---

## Self-Correcting Pipeline

### Dual-Agent Architecture

**1. Generator Agent (Gemini 2.5 Flash Lite)**
- Proposes relation triples from CTI text.
- Uses pattern-based context and structured JSON prompts.

**2. Validator Agent (Ontology Schema)**
- Checks triples against ontology rules.
- Returns structured feedback messages.
- Triggers correction iterations.

### Feedback Loop
```
CTI Text -> NER -> Triple Generation -> Validation
                        ↑                ↓
                        └────── Feedback ←┘
                        (if invalid)
```

**Max Iterations:** 3 (configurable)
**Precision Threshold:** 85%

---

## API Endpoints

### Next.js API Routes
```
POST   /api/process-cti      # Process CTI text
GET    /api/graph            # Fetch knowledge graph (Cypher queried)
POST   /api/neo4j/query      # Execute Cypher query
POST   /api/neo4j/test       # Test database connection handshake
```

---

## Testing

### Unit and Type Tests
```bash
# Verify TypeScript compilation and ESLint compliance
npm run lint
npm run build
```

---

## Project Structure

```
cygraph-extract/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── upload/page.tsx          # CTI upload
│   │   ├── graph/page.tsx           # Graph visualization
│   │   ├── results/page.tsx         # Extraction results
│   │   ├── dashboard/page.tsx       # Metrics dashboard
│   │   ├── feedback/page.tsx        # Feedback system
│   │   └── api/
│   │       ├── process-cti/route.ts
│   │       ├── graph/route.ts
│   │       ├── neo4j/query/route.ts
│   │       └── neo4j/test/route.ts
│   ├── components/
│   │   ├── D3GraphVisualization.tsx # D3.js graph
│   │   ├── FeedbackForm.tsx         # Feedback UI
│   │   └── ui/                      # Shadcn components
│   └── lib/
│       └── services/
│           ├── neo4j-client.ts      # Neo4j client
│           ├── ontology-manager.ts  # OWL handling
│           ├── ner-pipeline.ts      # NER processing
│           └── relation-extractor.ts # RE logic
├── ontology/
│   └── cygraph.owl                  # Ontology definition
├── eslint.config.mjs
├── tsconfig.json
└── README.md
```

---

## Acknowledgments

- **Neo4j** - Graph database platform
- **Google AI Studio** - Gemini model access API
- **Shadcn/UI** - Tailwind component framework
- **D3.js** - Graph rendering visualization library

---

**Built for the cybersecurity research community**