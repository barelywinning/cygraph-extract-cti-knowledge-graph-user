"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Activity, Database, Zap, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fastapiClient } from "@/lib/services/fastapi-client";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock metrics data
const processingMetrics = [
  { date: "2024-01", processed: 450, extracted: 3200, accuracy: 94 },
  { date: "2024-02", processed: 520, extracted: 3850, accuracy: 95 },
  { date: "2024-03", processed: 680, extracted: 4920, accuracy: 96 },
  { date: "2024-04", processed: 750, extracted: 5450, accuracy: 97 },
  { date: "2024-05", processed: 890, extracted: 6380, accuracy: 96 },
  { date: "2024-06", processed: 1020, extracted: 7340, accuracy: 98 },
];

const entityDistribution = [
  { name: "Threat Actors", value: 234, color: "#ef4444" },
  { name: "Malware", value: 456, color: "#f97316" },
  { name: "Vulnerabilities", value: 189, color: "#ec4899" },
  { name: "Techniques", value: 312, color: "#f59e0b" },
  { name: "Targets", value: 278, color: "#06b6d4" },
  { name: "IOCs", value: 523, color: "#8b5cf6" },
];

const systemHealth = [
  { component: "Next.js API Server", status: "operational", uptime: 99.9, latency: 15 },
  { component: "Neo4j Database", status: "operational", uptime: 99.9, latency: 12 },
  { component: "NER Pipeline", status: "operational", uptime: 98.5, latency: 230 },
  { component: "Ontology Service", status: "operational", uptime: 99.7, latency: 67 },
  { component: "Graph Renderer", status: "operational", uptime: 99.9, latency: 89 },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  const fetchHealthMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await fastapiClient.getHealthMetrics();
      setHealthData(data);
    } catch (err) {
      console.error("Failed to fetch health metrics:", err);
      setError("Using demo data - backend health endpoint not available");
    } finally {
      setIsLoading(false);
    }
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

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            System Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time monitoring and analytics for CyGraph-Extract
          </p>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <Badge className="bg-green-500">+12%</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">1,020</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Documents Processed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Database className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <Badge className="bg-green-500">+18%</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">7,340</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Entities Extracted</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <Badge className="bg-green-500">+2%</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">98%</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Avg. Accuracy</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
                <Badge className="bg-blue-500">Online</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">99.8%</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">System Uptime</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="processing" className="space-y-6">
          <TabsList>
            <TabsTrigger value="processing">Processing Metrics</TabsTrigger>
            <TabsTrigger value="entities">Entity Distribution</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="processing" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documents Processed</CardTitle>
                  <CardDescription>Monthly processing volume over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={processingMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="processed" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Extraction Accuracy</CardTitle>
                  <CardDescription>NER model accuracy trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={processingMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[90, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Entities Extracted</CardTitle>
                  <CardDescription>Total entities extracted per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processingMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="extracted" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="entities" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Entity Type Distribution</CardTitle>
                  <CardDescription>Breakdown by entity category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={entityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {entityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Entity Statistics</CardTitle>
                  <CardDescription>Detailed breakdown by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {entityDistribution.map((entity) => (
                      <div key={entity.name}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: entity.color }}
                            />
                            <span className="text-sm font-medium">{entity.name}</span>
                          </div>
                          <span className="text-sm font-bold">{entity.value}</span>
                        </div>
                        <Progress
                          value={(entity.value / entityDistribution.reduce((a, b) => a + b.value, 0)) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Components</CardTitle>
                <CardDescription>Health status and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemHealth.map((component) => (
                    <div key={component.component} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium">{component.component}</span>
                        </div>
                        <Badge className="bg-green-500">{component.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Uptime:</span>
                          <span className="font-medium ml-2">{component.uptime}%</span>
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400">Avg. Latency:</span>
                          <span className="font-medium ml-2">{component.latency}ms</span>
                        </div>
                      </div>
                      <Progress value={component.uptime} className="h-1 mt-3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}