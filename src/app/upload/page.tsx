"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import mammoth from "mammoth";
import { toast } from "sonner";

export default function UploadPage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const router = useRouter();

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
      // Get saved configuration
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
      
      // Store results in localStorage for results page
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Upload CTI Text
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Upload or paste Cyber Threat Intelligence text for automated extraction and analysis
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Upload Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>CTI Text Input</CardTitle>
                  <CardDescription>
                    Paste CTI text directly or upload a file (PDF, DOCX, TXT, CSV, JSON)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <Label htmlFor="file-upload">Upload File</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="file-upload"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-indigo-400 transition-colors"
                      >
                        <div className="text-center">
                          {isExtracting ? (
                            <>
                              <Loader2 className="h-8 w-8 text-indigo-500 mx-auto mb-2 animate-spin" />
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Extracting text from {file?.name}...
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {file ? file.name : "Click to upload or drag and drop"}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                PDF, DOCX, TXT, CSV, or JSON files
                              </p>
                            </>
                          )}
                        </div>
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
                  </div>

                  {/* Text Area */}
                  <div>
                    <Label htmlFor="cti-text">CTI Text</Label>
                    <Textarea
                      id="cti-text"
                      placeholder="Paste your CTI text here... e.g., 'The APT28 group has been observed using the Zebrocy malware to target government organizations...'"
                      className="mt-2 min-h-[300px] font-mono text-sm"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={isExtracting}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {text.length} characters | {text.split(/\s+/).filter(Boolean).length} words
                    </p>
                  </div>

                  {/* Progress */}
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Processing CTI text...</span>
                        <span className="text-slate-600 dark:text-slate-400">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Success Alert */}
                  {results && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600 dark:text-green-400">
                        Successfully processed! Extracted {results.entities?.length || 0} entities and{" "}
                        {results.relations?.length || 0} relations.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleProcess}
                    disabled={isProcessing || isExtracting || !text.trim()}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 mr-2" />
                        Process CTI Text
                      </>
                    )}
                  </Button>

                  {results && (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={handleViewResults}>
                        View Results
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={handleViewGraph}>
                        View Graph
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Supported Formats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">PDF</Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Portable Document Format
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">DOCX</Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Microsoft Word Document
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">TXT</Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Plain Text File
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">CSV</Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Comma-Separated Values
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">JSON</Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      JavaScript Object Notation
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processing Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">1</Badge>
                    <div>
                      <p className="font-medium text-sm">Text Preprocessing</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Clean and tokenize input text
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">2</Badge>
                    <div>
                      <p className="font-medium text-sm">NER Extraction</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Identify malware, threats, and IOCs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">3</Badge>
                    <div>
                      <p className="font-medium text-sm">Relation Mapping</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Extract entity relationships
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">4</Badge>
                    <div>
                      <p className="font-medium text-sm">Graph Construction</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Build Neo4j knowledge graph
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sample CTI Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setText(
                        "APT28, also known as Fancy Bear, has been observed deploying the Zebrocy malware family to target government and military organizations across Eastern Europe. The malware uses HTTP for C2 communication and exfiltrates sensitive documents. Recent campaigns have leveraged spear-phishing emails with malicious attachments exploiting CVE-2017-0199."
                      )
                    }
                  >
                    Load Sample Text
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}