"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Database, Key, AlertTriangle, CheckCircle, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  const [config, setConfig] = useState({
    neo4jUri: "",
    neo4jUsername: "neo4j",
    neo4jPassword: "",
    geminiApiKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      setIsProduction(true);
      return;
    }
    const savedConfig = localStorage.getItem("cygraph-config");
    let loadedConfig = config;

    if (savedConfig) {
      loadedConfig = JSON.parse(savedConfig);
      setConfig(loadedConfig);
    }

    if (loadedConfig.neo4jUri && loadedConfig.neo4jUsername && loadedConfig.neo4jPassword) {
      testConnection(loadedConfig);
    }
  }, []);

  if (isProduction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-amber-200 dark:border-amber-950">
          <CardHeader className="text-center">
            <div className="mx-auto bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Access Restricted</CardTitle>
            <CardDescription className="mt-2 text-slate-600 dark:text-slate-400">
              Interactive credential configuration is disabled in public production mode for security.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed text-center">
              Please supply your database connection and API credentials using target system environment variables instead:
            </p>
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg font-mono text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>NEO4J_URI</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Required</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>NEO4J_USERNAME</span>
                <span className="text-slate-500">Optional ("neo4j")</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>NEO4J_PASSWORD</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Required</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>GEMINI_API_KEY</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Required</span>
              </div>
            </div>
            <div className="pt-2">
              <Link href="/" className="block">
                <Button className="w-full">Return to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const testConnection = async (configToTest = config) => {
    setTesting(true);
    setConnectionError(null);
    try {
      const response = await fetch("/api/neo4j/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: configToTest.neo4jUri,
          username: configToTest.neo4jUsername,
          password: configToTest.neo4jPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setConnected(true);
        setConnectionError(null);
        toast.success(`Connected successfully! Neo4j version: ${result.version}`);
      } else {
        setConnected(false);
        setConnectionError(result.error);
        toast.error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      setConnected(false);
      setConnectionError("Failed to test connection");
      toast.error("Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("cygraph-config", JSON.stringify(config));
      
      // Test connection
      const response = await fetch("/api/neo4j/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: config.neo4jUri,
          username: config.neo4jUsername,
          password: config.neo4jPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setConnected(true);
        setConnectionError(null);
        toast.success("Configuration saved and Neo4j connection verified!");
      } else {
        setConnected(false);
        setConnectionError(result.error);
        toast.warning("Configuration saved, but couldn't verify Neo4j connection.");
      }
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    await testConnection();
  };

  const isAuthError = connectionError?.includes("unauthorized") || connectionError?.includes("authentication");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          {connected && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Connected</span>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Configuration Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Configure your Neo4j Aura and Gemini credentials
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Authentication Error Alert */}
          {isAuthError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  The current Neo4j credentials were rejected by the configured instance.
                </p>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">To get the correct password:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to <a href="https://console.neo4j.io" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">console.neo4j.io <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Find the database that matches your connection URI</li>
                    <li>Click the ⋮ menu → "Reset password"</li>
                    <li>Copy the new password and paste it below</li>
                    <li>Click "Test Connection"</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Neo4j Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600" />
                <CardTitle>Neo4j Database</CardTitle>
              </div>
              <CardDescription>
                  Configure your Neo4j connection details from environment variables or local storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="neo4j-uri">Connection URI</Label>
                <Input
                  id="neo4j-uri"
                  placeholder="neo4j+s://xxxxx.databases.neo4j.io"
                  value={config.neo4jUri}
                  onChange={(e) => setConfig({ ...config, neo4jUri: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Loaded from local environment or browser storage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neo4j-username">Username</Label>
                <Input
                  id="neo4j-username"
                  placeholder="neo4j"
                  value={config.neo4jUsername}
                  onChange={(e) => setConfig({ ...config, neo4jUsername: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neo4j-password">Password</Label>
                <Input
                  id="neo4j-password"
                  type="password"
                  placeholder="Enter your Neo4j password"
                  value={config.neo4jPassword}
                  onChange={(e) => setConfig({ ...config, neo4jPassword: e.target.value })}
                />
                {isAuthError && (
                  <p className="text-xs text-destructive">
                    ⚠️ The current credentials were rejected by Neo4j. Update your local environment or storage.
                  </p>
                )}
              </div>

              <Button 
                onClick={handleTest} 
                variant="outline" 
                disabled={testing || !config.neo4jUri}
                className="w-full"
              >
                {testing ? "Testing..." : "Test Connection"}
              </Button>
            </CardContent>
          </Card>

          {/* Gemini Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                <CardTitle>Google Gemini API</CardTitle>
              </div>
              <CardDescription>
                Provide a Gemini API key in local storage or your environment for AI-powered extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-key">API Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder="Enter your Gemini API key"
                  value={config.geminiApiKey}
                  onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Get your API key from{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status Notice */}
          {connected ? (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-900 dark:text-green-100">
                    All Systems Ready
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your Neo4j database is connected and the system is ready for CTI extraction and graph building.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-900 dark:text-amber-100">
                    Neo4j Not Connected
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  The app works without Neo4j (using memory storage), but you'll need to connect for persistent data storage.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}
