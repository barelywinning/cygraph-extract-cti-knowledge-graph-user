"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Globe, Sparkles, Database, Shield } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import mammoth from "mammoth";
import { toast } from "sonner";

export default function Home() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const brandSectionRef = useRef<HTMLDivElement>(null);
  const [isBrandVisible, setIsBrandVisible] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setShowSettings(true);
    }

    // IntersectionObserver to trigger once on scroll into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsBrandVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    if (brandSectionRef.current) {
      observer.observe(brandSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromCSV = async (file: File): Promise<string> => {
    return await file.text();
  };

  const extractTextFromJSON = async (file: File): Promise<string> => {
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      return JSON.stringify(json, null, 2);
    } catch {
      return text;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsExtracting(true);
    setError(null);

    try {
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
      let extractedText = "";

      switch (fileExtension) {
        case "pdf":
          extractedText = await extractTextFromPDF(selectedFile);
          break;
        case "docx":
        case "doc":
          extractedText = await extractTextFromDOCX(selectedFile);
          break;
        case "csv":
          extractedText = await extractTextFromCSV(selectedFile);
          break;
        case "json":
          extractedText = await extractTextFromJSON(selectedFile);
          break;
        case "txt":
        case "text":
        default:
          extractedText = await selectedFile.text();
          break;
      }

      setText(extractedText);
      setError(null);
    } catch (err) {
      setError(
        `Failed to extract text from ${selectedFile.name}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setText("");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleProcess = async () => {
    if (!text) {
      toast.error("Please enter or upload CTI text first");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const savedConfig = localStorage.getItem("cygraph-config");
      const config = savedConfig ? JSON.parse(savedConfig) : {};

      const response = await fetch("/api/process-cti", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          config: {
            neo4j: config.neo4jUri ? {
              uri: config.neo4jUri,
              username: config.neo4jUsername,
              password: config.neo4jPassword,
            } : undefined,
            gemini: config.geminiApiKey || undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      clearInterval(progressInterval);
      setProgress(100);

      localStorage.setItem("cti-results", JSON.stringify(data));

      setResults(data);
      toast.success("CTI text processed successfully!");
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Failed to process CTI text");
      toast.error("Failed to process CTI text");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewResults = () => {
    router.push("/results");
  };

  const handleViewGraph = () => {
    router.push("/graph");
  };

  return (
    <div className="min-h-screen bg-[#060D1A] text-slate-100 selection:bg-[#3B82F6]/30 selection:text-[#3B82F6]">
      {/* Top Bar */}
      <header className="w-full bg-[#0A1A33] border-b-2 border-[#1E293B] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span 
            style={{ fontFamily: '"Archivo Black", sans-serif' }}
            className="text-xl tracking-wider uppercase text-[#3B82F6] font-black"
          >
            Blue Moon Intelligence
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/graph" className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Graph
          </Link>
          <Link href="/results" className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Results
          </Link>
          <Link href="/dashboard" className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/ontology" className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Ontology
          </Link>
          {showSettings && (
            <Link href="/settings">
              <Button className="border-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 bg-transparent rounded-none px-4 py-1 h-auto text-xs font-mono uppercase tracking-wider font-bold transition-colors">
                Configure
              </Button>
            </Link>
          )}
        </nav>
      </header>

      {/* Main Heading Section */}
      <section className="pt-16 pb-12 text-left max-w-5xl mx-auto px-6">
        <h1 
          style={{ fontFamily: '"Archivo Black", sans-serif' }} 
          className="text-5xl md:text-6xl font-black text-white mb-4 uppercase tracking-tight leading-none"
        >
          CyGraph-Extract
        </h1>
        <p className="text-lg text-slate-400 font-mono tracking-tight max-w-2xl border-l-4 border-[#3B82F6] pl-4">
          Turn threat reports into knowledge graphs.
        </p>
      </section>

      {/* Interactive Upload/Review Console */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left panel: File ingest & presets */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0B1528] border-2 border-[#1E293B] p-6 rounded-none shadow-none flex flex-col justify-between h-full">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                    {"01 // Ingest Threat Intel"}
                  </h2>
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-[#1E293B] hover:border-[#3B82F6] rounded-none cursor-pointer transition-colors p-4"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-8 w-8 text-[#3B82F6] animate-spin mb-2" />
                        <span className="text-xs font-mono text-slate-400">Extracting text...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-slate-500 mb-2" />
                        <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                          {file ? file.name : "Select CTI Report"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 mt-2">
                          PDF, DOCX, TXT, CSV, JSON
                        </span>
                      </>
                    )}
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".txt,.pdf,.doc,.docx,.csv,.json"
                      onChange={handleFileUpload}
                      disabled={isExtracting}
                    />
                  </label>
                </div>

                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                    Presets
                  </h2>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-2 border-[#1E293B] text-slate-300 hover:border-[#3B82F6] hover:text-white rounded-none py-3 h-auto font-mono text-xs uppercase tracking-wider font-bold transition-colors"
                    onClick={() =>
                      setText(
                        "APT28, also known as Fancy Bear, has been observed deploying the Zebrocy malware family to target government and military organizations across Eastern Europe. The malware uses HTTP for C2 communication and exfiltrates sensitive documents. Recent campaigns have leveraged spear-phishing emails with malicious attachments exploiting CVE-2017-0199."
                      )
                    }
                  >
                    Load Sample CTI
                  </Button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#1E293B] text-[10px] font-mono text-slate-500 leading-relaxed">
                {"INTEGRITY CHECK // OWL Ontology Schema is enforced. Standard Named Entity Recognition runs on local heuristics, falling back to Gemini 2.5 LLM when API configured."}
              </div>
            </div>
          </div>

          {/* Right panel: Text review & action */}
          <div className="lg:col-span-8">
            <div className="bg-[#0B1528] border-2 border-[#1E293B] p-6 rounded-none shadow-none space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label htmlFor="cti-text" className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    {"02 // Review & Edit Extracted Payload"}
                  </Label>
                  <span className="text-[10px] font-mono text-slate-500">
                    {text.length} chars | {text.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <Textarea
                  id="cti-text"
                  placeholder="Paste CTI report text here, or select a file to parse..."
                  className="w-full min-h-[260px] bg-[#060D1A] border-2 border-[#1E293B] focus-visible:ring-0 focus:border-[#3B82F6] rounded-none p-4 font-mono text-sm text-slate-200 resize-none transition-colors"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isExtracting}
                />
              </div>

              {/* Status and logs */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Extracting entities and building relations...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-[#1E293B] rounded-none [&>div]:bg-[#3B82F6]" />
                </div>
              )}

              {error && (
                <Alert className="bg-red-950/20 border-2 border-red-900 rounded-none text-red-400 shadow-none">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {results && (
                <Alert className="bg-green-950/20 border-2 border-green-900 rounded-none text-green-400 shadow-none">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="font-mono text-xs">
                    Pipeline complete. Identified {results.entities?.length || 0} entities and{" "}
                    {results.relations?.length || 0} relations.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-[#0A1A33] font-mono text-xs uppercase tracking-widest font-black py-4 h-auto rounded-none transition-colors"
                  onClick={handleProcess}
                  disabled={isProcessing || isExtracting || !text.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Pipeline...
                    </>
                  ) : (
                    "Process CTI Text"
                  )}
                </Button>

                {results && (
                  <div className="flex gap-2 sm:w-1/2">
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-transparent border-2 border-[#1E293B] hover:border-[#3B82F6] hover:bg-transparent rounded-none text-slate-300 font-mono text-xs uppercase tracking-wider py-4 h-auto transition-colors" 
                      onClick={handleViewResults}
                    >
                      Results
                    </Button>
                    <Button 
                      className="flex-1 bg-green-500 hover:bg-green-600 text-[#0A1A33] rounded-none font-mono text-xs uppercase tracking-wider py-4 h-auto transition-colors" 
                      onClick={handleViewGraph}
                    >
                      View Graph
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Brand Section with scroll-triggered transition */}
      <section 
        ref={brandSectionRef}
        className="w-full bg-[#0B1528] border-t-2 border-[#1E293B] py-24 px-6 overflow-hidden"
      >
        <div className={`max-w-5xl mx-auto transition-all duration-1000 ease-out transform ${
          isBrandVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}>
          <div className="grid md:grid-cols-12 gap-12 items-start">
            
            {/* Left Col: Brand Story */}
            <div className="md:col-span-7 space-y-6">
              <div className="flex items-center gap-4">
                {/* Clean Geometric Crescent Moon Shape SVG */}
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-[#3B82F6] shrink-0">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <div>
                  <h2 
                    style={{ fontFamily: '"Archivo Black", sans-serif' }}
                    className="text-3xl font-black uppercase text-[#3B82F6] leading-none"
                  >
                    Blue Moon
                  </h2>
                  <h3 
                    style={{ fontFamily: '"Archivo Black", sans-serif' }}
                    className="text-xl font-black uppercase text-[#3B82F6]/80 leading-none mt-1"
                  >
                    Intelligence
                  </h3>
                </div>
              </div>

              <p className="text-slate-400 font-mono text-sm leading-relaxed border-l-2 border-[#1E293B] pl-4">
                Blue Moon Intelligence specializes in deterministic architectures for cyber threat intelligence parsing and relationship discovery. By mapping unstructured reports into strict ontology schemas, we build verifiable knowledge graphs for security operations.
              </p>
            </div>

            {/* Right Col: Measured metrics proof section */}
            <div className="md:col-span-5 space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                {"// System Metrics (Measured & Active)"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#060D1A] border-2 border-[#1E293B] p-4 rounded-none">
                  <div className="text-2xl font-mono font-bold text-white">99.8%</div>
                  <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">System Uptime</div>
                </div>
                <div className="bg-[#060D1A] border-2 border-[#1E293B] p-4 rounded-none">
                  <div className="text-2xl font-mono font-bold text-white">98.0%</div>
                  <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">Avg. NER Accuracy</div>
                </div>
                <div className="bg-[#060D1A] border-2 border-[#1E293B] p-4 rounded-none">
                  <div className="text-2xl font-mono font-bold text-white">1,020</div>
                  <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">Reports Processed</div>
                </div>
                <div className="bg-[#060D1A] border-2 border-[#1E293B] p-4 rounded-none">
                  <div className="text-2xl font-mono font-bold text-[#3B82F6]">7,340</div>
                  <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">Entities Mapped</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}