"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { errorLogger } from "@/lib/error-logger";
import { getErrorMessage } from "@/lib/utils";
import { useAuth, isAdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { HelpLink } from "@/components/help/help-link";
import { ProviderIcon } from "@/components/provider-icons";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SettingsPageSkeleton } from "@/components/ui/settings-page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AISettingsForm } from "@/components/ai/ai-settings-form";
import {
  Loader2,
  Brain,
  Plus,
  Trash2,
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  Play,
  Settings2,
  Info,
  RefreshCw,
  Pencil,
} from "lucide-react";

interface AIProvider {
  id: number;
  provider: string;
  model: string;
  api_key_set: boolean;
  is_enabled: boolean;
  is_primary: boolean;
  base_url?: string | null;
  endpoint?: string | null;
  region?: string | null;
  access_key_set?: boolean;
  secret_key_set?: boolean;
}

interface DiscoveredModel {
  id: string;
  name: string;
  provider: string;
  capabilities?: string[];
}

interface ProviderTemplate {
  id: string;
  name: string;
  requires_api_key: boolean;
  supports_vision: boolean;
  supports_discovery: boolean;
  requires_endpoint?: boolean;
  requires_aws_credentials?: boolean;
}

const providerTemplates: ProviderTemplate[] = [
  {
    id: "claude",
    name: "Claude (Anthropic)",
    requires_api_key: true,
    supports_vision: true,
    supports_discovery: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    requires_api_key: true,
    supports_vision: true,
    supports_discovery: true,
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    requires_api_key: true,
    supports_vision: true,
    supports_discovery: true,
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    requires_api_key: false,
    supports_vision: false,
    supports_discovery: true,
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    requires_api_key: true,
    requires_endpoint: true,
    supports_vision: true,
    supports_discovery: true,
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    requires_api_key: false,
    requires_aws_credentials: true,
    supports_vision: true,
    supports_discovery: true,
  },
];

type LLMMode = "single" | "aggregation" | "council";

export default function AISettingsPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [mode, setMode] = useState<LLMMode>("single");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingProviders, setTestingProviders] = useState<Set<number>>(new Set());

  // Add/Edit provider dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newProviderModel, setNewProviderModel] = useState<string>("");
  const [newProviderApiKey, setNewProviderApiKey] = useState<string>("");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState<string>("");
  const [newProviderEndpoint, setNewProviderEndpoint] = useState<string>("");
  const [newProviderRegion, setNewProviderRegion] = useState<string>("us-east-1");
  const [newProviderAccessKey, setNewProviderAccessKey] = useState<string>("");
  const [newProviderSecretKey, setNewProviderSecretKey] = useState<string>("");

  // API key validation state (Add/Edit Provider dialog)
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Model discovery state (Add/Edit Provider dialog)
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const LLM_MODELS_CACHE_KEY = "llm_discovered_models";
  const LLM_MODELS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  const getCachedModels = (provider: string): DiscoveredModel[] | null => {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(`${LLM_MODELS_CACHE_KEY}_${provider}`);
      if (!raw) return null;
      const { models, ts } = JSON.parse(raw) as { models: DiscoveredModel[]; ts: number };
      if (Date.now() - ts > LLM_MODELS_CACHE_TTL_MS) return null;
      return models;
    } catch {
      return null;
    }
  };

  const setCachedModels = (provider: string, models: DiscoveredModel[]) => {
    try {
      sessionStorage.setItem(
        `${LLM_MODELS_CACHE_KEY}_${provider}`,
        JSON.stringify({ models, ts: Date.now() })
      );
    } catch {
      // ignore
    }
  };

  const clearCachedModels = (provider: string) => {
    try {
      sessionStorage.removeItem(`${LLM_MODELS_CACHE_KEY}_${provider}`);
    } catch {
      // ignore
    }
  };

  const refreshModels = () => {
    if (selectedTemplate) {
      clearCachedModels(selectedTemplate);
    }
    setDiscoveryError(null);
    discoverModels();
  };

  const fetchAIConfig = useCallback(async () => {
    try {
      const response = await api.get("/llm/config");
      setProviders(response.data.providers || []);
      setMode(response.data.mode || "single");
    } catch (error: unknown) {
      errorLogger.report(
        error instanceof Error ? error : new Error("Failed to fetch AI config"),
        { source: "ai-page" }
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAIConfig();
  }, [fetchAIConfig]);

  const handleModeChange = async (newMode: LLMMode) => {
    setMode(newMode);
    setIsSaving(true);

    try {
      await api.put("/llm/config", { mode: newMode });
      toast.success(`LLM mode set to ${newMode}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update mode"));
      // Revert
      fetchAIConfig();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProvider = async () => {
    if (!selectedTemplate || !newProviderModel) {
      toast.error("Please select a provider and model");
      return;
    }

    const template = providerTemplates.find((t) => t.id === selectedTemplate);
    if (template?.requires_api_key && !newProviderApiKey && selectedTemplate !== "bedrock") {
      toast.error("API key is required for this provider");
      return;
    }
    if (selectedTemplate === "azure" && !newProviderEndpoint?.trim()) {
      toast.error("Azure OpenAI endpoint is required");
      return;
    }
    if (selectedTemplate === "bedrock" && (!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim())) {
      toast.error("AWS access key and secret key are required for Bedrock");
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.post("/llm/providers", {
        provider: selectedTemplate,
        model: newProviderModel,
        api_key: newProviderApiKey || undefined,
        base_url: selectedTemplate === "ollama" ? (newProviderBaseUrl || undefined) : undefined,
        endpoint: selectedTemplate === "azure" ? newProviderEndpoint || undefined : undefined,
        region: selectedTemplate === "bedrock" ? newProviderRegion || undefined : undefined,
        access_key: selectedTemplate === "bedrock" ? newProviderAccessKey || undefined : undefined,
        secret_key: selectedTemplate === "bedrock" ? newProviderSecretKey || undefined : undefined,
      });

      setProviders((prev) => [...prev, response.data.provider]);
      setShowAddDialog(false);
      resetAddDialog();
      toast.success("Provider added successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to add provider"));
    } finally {
      setIsSaving(false);
    }
  };

  const resetAddDialog = () => {
    setSelectedTemplate("");
    setNewProviderModel("");
    setNewProviderApiKey("");
    setNewProviderBaseUrl("");
    setNewProviderEndpoint("");
    setNewProviderRegion("us-east-1");
    setNewProviderAccessKey("");
    setNewProviderSecretKey("");
    setKeyValid(null);
    setKeyError(null);
    setDiscoveredModels([]);
    setDiscoveryError(null);
    setEditingProvider(null);
  };

  const openEditDialog = (provider: AIProvider) => {
    setEditingProvider(provider);
    setSelectedTemplate(provider.provider);
    setNewProviderModel(provider.model);
    setNewProviderApiKey("");
    setNewProviderBaseUrl(provider.base_url || "");
    setNewProviderEndpoint(provider.endpoint || "");
    setNewProviderRegion(provider.region || "us-east-1");
    setNewProviderAccessKey("");
    setNewProviderSecretKey("");
    setKeyValid(null);
    setKeyError(null);
    setDiscoveryError(null);
    const cached = getCachedModels(provider.provider);
    setDiscoveredModels(cached ?? []);
  };

  const handleEditProvider = async () => {
    if (!editingProvider || !newProviderModel) {
      toast.error("Please select a model");
      return;
    }

    if (editingProvider.provider === "azure" && !newProviderEndpoint?.trim()) {
      toast.error("Azure OpenAI endpoint is required");
      return;
    }

    setIsSaving(true);

    try {
      // Only send fields that have changed or have values
      const payload: Record<string, unknown> = {};

      if (newProviderModel !== editingProvider.model) {
        payload.model = newProviderModel;
      }

      // Only send api_key if the user typed a new one
      if (newProviderApiKey) {
        payload.api_key = newProviderApiKey;
      }

      if (editingProvider.provider === "ollama") {
        const newUrl = newProviderBaseUrl || "";
        const oldUrl = editingProvider.base_url || "";
        if (newUrl !== oldUrl) {
          payload.base_url = newUrl || null;
        }
      }

      if (editingProvider.provider === "azure") {
        const newEp = newProviderEndpoint || "";
        const oldEp = editingProvider.endpoint || "";
        if (newEp !== oldEp) {
          payload.endpoint = newEp || null;
        }
      }

      if (editingProvider.provider === "bedrock") {
        const newRegion = newProviderRegion || "";
        const oldRegion = editingProvider.region || "";
        if (newRegion !== oldRegion) {
          payload.region = newRegion || null;
        }
        // Only send credentials if user typed new ones
        if (newProviderAccessKey) {
          payload.access_key = newProviderAccessKey;
        }
        if (newProviderSecretKey) {
          payload.secret_key = newProviderSecretKey;
        }
      }

      const response = await api.put(`/llm/providers/${editingProvider.id}`, payload);

      setProviders((prev) =>
        prev.map((p) => (p.id === editingProvider.id ? response.data.provider : p))
      );
      setEditingProvider(null);
      resetAddDialog();
      toast.success("Provider updated successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update provider"));
    } finally {
      setIsSaving(false);
    }
  };

  const testApiKey = async () => {
    if (selectedTemplate === "ollama") {
      if (!newProviderBaseUrl?.trim()) {
        setKeyError("Enter Ollama host (e.g. http://localhost:11434)");
        return;
      }
    } else if (selectedTemplate === "azure") {
      if (!newProviderEndpoint?.trim()) {
        setKeyError("Enter Azure OpenAI endpoint (e.g. https://your-resource.openai.azure.com)");
        return;
      }
      if (!newProviderApiKey?.trim()) {
        setKeyError("Enter your API key");
        return;
      }
    } else if (selectedTemplate === "bedrock") {
      if (!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim()) {
        setKeyError("Enter AWS access key and secret key");
        return;
      }
    } else if (!newProviderApiKey?.trim()) {
      setKeyError("Enter your API key");
      return;
    }
    setIsTestingKey(true);
    setKeyError(null);
    setKeyValid(null);
    try {
      const response = await api.post("/llm-settings/test-key", {
        provider: selectedTemplate,
        api_key: newProviderApiKey || undefined,
        host: selectedTemplate === "ollama" ? (newProviderBaseUrl || "http://localhost:11434") : undefined,
        endpoint: selectedTemplate === "azure" ? newProviderEndpoint || undefined : undefined,
        region: selectedTemplate === "bedrock" ? newProviderRegion || undefined : undefined,
        access_key: selectedTemplate === "bedrock" ? newProviderAccessKey || undefined : undefined,
        secret_key: selectedTemplate === "bedrock" ? newProviderSecretKey || undefined : undefined,
      });
      setKeyValid(response.data.valid);
      if (!response.data.valid && response.data.error) {
        setKeyError(response.data.error);
      }
    } catch (err: unknown) {
      const data = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
        : null;
      setKeyValid(false);
      setKeyError(data?.error ?? data?.message ?? "Failed to validate API key");
    } finally {
      setIsTestingKey(false);
    }
  };

  const discoverModels = async () => {
    if (selectedTemplate === "ollama") {
      if (!newProviderBaseUrl?.trim()) {
        setDiscoveryError("Enter Ollama host first");
        return;
      }
    } else if (selectedTemplate === "azure") {
      if (!newProviderEndpoint?.trim()) {
        setDiscoveryError("Enter Azure OpenAI endpoint first");
        return;
      }
      if (!newProviderApiKey?.trim()) {
        setDiscoveryError("Enter your API key first");
        return;
      }
    } else if (selectedTemplate === "bedrock") {
      if (!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim()) {
        setDiscoveryError("Enter AWS access key and secret key first");
        return;
      }
    } else if (!newProviderApiKey?.trim()) {
      setDiscoveryError("Enter your API key first");
      return;
    }
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const response = await api.post("/llm-settings/discover-models", {
        provider: selectedTemplate,
        api_key: newProviderApiKey || undefined,
        host: selectedTemplate === "ollama" ? (newProviderBaseUrl || "http://localhost:11434") : undefined,
        endpoint: selectedTemplate === "azure" ? newProviderEndpoint || undefined : undefined,
        region: selectedTemplate === "bedrock" ? newProviderRegion || undefined : undefined,
        access_key: selectedTemplate === "bedrock" ? newProviderAccessKey || undefined : undefined,
        secret_key: selectedTemplate === "bedrock" ? newProviderSecretKey || undefined : undefined,
      });
      const models = response.data.models ?? [];
      setDiscoveredModels(models);
      if (selectedTemplate) {
        setCachedModels(selectedTemplate, models);
      }
      if (models.length === 0) {
        setDiscoveryError("No models returned. Check your API key or host.");
      }
    } catch (err: unknown) {
      const data = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
        : null;
      setDiscoveryError(data?.message ?? data?.error ?? "Failed to fetch models. Check your API key.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleToggleProvider = async (providerId: number, enabled: boolean) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, is_enabled: enabled } : p))
    );

    try {
      await api.put(`/llm/providers/${providerId}`, { is_enabled: enabled });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update provider"));
      fetchAIConfig();
    }
  };

  const handleSetPrimary = async (providerId: number) => {
    setProviders((prev) =>
      prev.map((p) => ({
        ...p,
        is_primary: p.id === providerId,
      }))
    );

    try {
      await api.put(`/llm/providers/${providerId}`, { is_primary: true });
      toast.success("Primary provider updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update provider"));
      fetchAIConfig();
    }
  };

  const handleDeleteProvider = async (providerId: number) => {
    try {
      await api.delete(`/llm/providers/${providerId}`);
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
      toast.success("Provider removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to remove provider"));
    }
  };

  const handleTestProvider = async (providerId: number, providerName: string) => {
    setTestingProviders((prev) => new Set(prev).add(providerId));

    try {
      const response = await api.post(`/llm/test/${providerName}`);
      if (response.data.success) {
        toast.success("Provider connection successful!");
      } else {
        toast.error(response.data.error || "Connection test failed");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Connection test failed"));
    } finally {
      setTestingProviders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  };

  const selectedTemplateData = providerTemplates.find(
    (t) => t.id === selectedTemplate
  );

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI / LLM Settings</h1>
        <p className="text-muted-foreground">
          Configure AI providers and orchestration modes.{" "}
          <HelpLink articleId="ai-llm-settings" />
        </p>
      </div>

      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Orchestration Mode
          </CardTitle>
          <CardDescription>
            Choose how AI providers work together to generate responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as LLMMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Single</TabsTrigger>
              <TabsTrigger value="aggregation">Aggregation</TabsTrigger>
              <TabsTrigger value="council">Council</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Single Mode</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Queries are sent to your primary provider only. This is the fastest
                    and most cost-effective option.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Best for:</strong> Standard tasks, cost-conscious usage, when you trust
                    one provider for your needs. Uses 1 API call per request.
                  </p>
                </AlertDescription>
              </Alert>
            </TabsContent>
            <TabsContent value="aggregation" className="mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Aggregation Mode</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    All enabled providers are queried in parallel, then the primary provider
                    reads all responses and synthesizes them into one comprehensive answer.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Best for:</strong> Complex questions where different AI models may offer
                    unique insights. The primary provider decides what to include. Uses N+1 API calls.
                  </p>
                </AlertDescription>
              </Alert>
            </TabsContent>
            <TabsContent value="council" className="mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Council Mode</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    All providers respond independently, then a consensus algorithm compares their
                    answers. The final response includes only points where providers agree (70%+
                    threshold), plus a confidence score and any dissenting views.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Best for:</strong> Critical decisions, fact verification, reducing AI
                    hallucinations. No single provider has final say—it&apos;s democratic. Requires
                    at least 2 enabled providers.
                  </p>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Providers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Providers
              </CardTitle>
              <CardDescription>
                Manage your configured AI providers.
              </CardDescription>
            </div>
            <Dialog
              open={showAddDialog}
              onOpenChange={(open) => {
                setShowAddDialog(open);
                if (!open) resetAddDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add AI Provider</DialogTitle>
                  <DialogDescription>
                    Configure a new AI provider for your application.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={selectedTemplate}
                      onValueChange={(v) => {
                        setSelectedTemplate(v);
                        setNewProviderModel("");
                        setNewProviderEndpoint("");
                        setNewProviderRegion("us-east-1");
                        setNewProviderAccessKey("");
                        setNewProviderSecretKey("");
                        setKeyValid(null);
                        setKeyError(null);
                        setDiscoveryError(null);
                        const cached = getCachedModels(v);
                        setDiscoveredModels(cached ?? []);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplateData && (
                    <>
                      {selectedTemplateData.requires_api_key && (
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="password"
                                value={newProviderApiKey}
                                onChange={(e) => {
                                  setNewProviderApiKey(e.target.value);
                                  setKeyValid(null);
                                  setKeyError(null);
                                  setDiscoveredModels([]);
                                  setDiscoveryError(null);
                                }}
                                placeholder="Enter your API key"
                              />
                              {keyValid === true && (
                                <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
                              )}
                              {keyValid === false && (
                                <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={testApiKey}
                              disabled={
                                (selectedTemplate === "azure" ? !newProviderEndpoint?.trim() || !newProviderApiKey?.trim() : !newProviderApiKey?.trim()) ||
                                isTestingKey
                              }
                            >
                              {isTestingKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Test"
                              )}
                            </Button>
                          </div>
                          {keyError && (
                            <p className="text-sm text-destructive">{keyError}</p>
                          )}
                        </div>
                      )}

                      {selectedTemplate === "azure" && (
                        <div className="space-y-2">
                          <Label>Azure OpenAI endpoint</Label>
                          <Input
                            type="url"
                            value={newProviderEndpoint}
                            onChange={(e) => {
                              setNewProviderEndpoint(e.target.value);
                              setKeyValid(null);
                              setKeyError(null);
                              setDiscoveredModels([]);
                              setDiscoveryError(null);
                            }}
                            placeholder="https://your-resource.openai.azure.com"
                          />
                        </div>
                      )}

                      {selectedTemplate === "bedrock" && (
                        <>
                          <div className="space-y-2">
                            <Label>AWS Region</Label>
                            <Select
                              value={newProviderRegion}
                              onValueChange={(v) => {
                                setNewProviderRegion(v);
                                setKeyValid(null);
                                setKeyError(null);
                                setDiscoveredModels([]);
                                setDiscoveryError(null);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="us-east-1">us-east-1</SelectItem>
                                <SelectItem value="us-west-2">us-west-2</SelectItem>
                                <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                                <SelectItem value="eu-central-1">eu-central-1</SelectItem>
                                <SelectItem value="ap-northeast-1">ap-northeast-1</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Access Key ID</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  type="password"
                                  value={newProviderAccessKey}
                                  onChange={(e) => {
                                    setNewProviderAccessKey(e.target.value);
                                    setKeyValid(null);
                                    setKeyError(null);
                                    setDiscoveredModels([]);
                                    setDiscoveryError(null);
                                  }}
                                  placeholder="AKIA..."
                                />
                                {keyValid === true && (
                                  <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
                                )}
                                {keyValid === false && (
                                  <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={testApiKey}
                                disabled={!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim() || isTestingKey}
                              >
                                {isTestingKey ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Test"
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Secret Access Key</Label>
                            <Input
                              type="password"
                              value={newProviderSecretKey}
                              onChange={(e) => {
                                setNewProviderSecretKey(e.target.value);
                                setKeyValid(null);
                                setKeyError(null);
                                setDiscoveredModels([]);
                                setDiscoveryError(null);
                              }}
                              placeholder="Enter secret key"
                            />
                          </div>
                          {keyError && (
                            <p className="text-sm text-destructive">{keyError}</p>
                          )}
                        </>
                      )}

                      {selectedTemplate === "ollama" && (
                        <div className="space-y-2">
                          <Label>Ollama host</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="text"
                                value={newProviderBaseUrl}
                                onChange={(e) => {
                                  setNewProviderBaseUrl(e.target.value);
                                  setKeyValid(null);
                                  setKeyError(null);
                                  setDiscoveredModels([]);
                                  setDiscoveryError(null);
                                }}
                                placeholder="http://localhost:11434"
                              />
                              {keyValid === true && (
                                <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
                              )}
                              {keyValid === false && (
                                <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={testApiKey}
                              disabled={!newProviderBaseUrl?.trim() || isTestingKey}
                            >
                              {isTestingKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Test"
                              )}
                            </Button>
                          </div>
                          {keyError && (
                            <p className="text-sm text-destructive">{keyError}</p>
                          )}
                        </div>
                      )}

                      {selectedTemplateData.supports_discovery && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Label className="mb-0">Models</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={discoverModels}
                              disabled={
                                (selectedTemplateData.requires_api_key && !newProviderApiKey?.trim()) ||
                                (selectedTemplate === "ollama" && !newProviderBaseUrl?.trim()) ||
                                (selectedTemplate === "azure" && (!newProviderEndpoint?.trim() || !newProviderApiKey?.trim())) ||
                                (selectedTemplate === "bedrock" && (!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim())) ||
                                isDiscovering
                              }
                            >
                              {isDiscovering ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : null}
                              Fetch Models
                            </Button>
                            {discoveredModels.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={refreshModels}
                                disabled={isDiscovering}
                              >
                                <RefreshCw className={`mr-1 h-3 w-3 ${isDiscovering ? "animate-spin" : ""}`} />
                                Refresh
                              </Button>
                            )}
                          </div>
                          {discoveryError && (
                            <p className="text-sm text-destructive">{discoveryError}</p>
                          )}
                          {discoveredModels.length > 0 ? (
                            <Select
                              value={newProviderModel}
                              onValueChange={setNewProviderModel}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                              <SelectContent>
                                {discoveredModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Enter your API key (or host for Ollama) and click Fetch Models.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {selectedTemplateData.supports_vision && (
                          <Badge variant="secondary">Vision Support</Badge>
                        )}
                        {!selectedTemplateData.requires_api_key && (
                          <Badge variant="outline">No API Key Required</Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      resetAddDialog();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddProvider} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Provider
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No providers configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add an AI provider to get started with LLM functionality.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <CollapsibleCard
                  key={provider.id}
                  title={provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)}
                  description={provider.model}
                  icon={
                    <ProviderIcon provider={provider.provider} size="sm" style="mono" />
                  }
                  status={{
                    label: provider.is_primary
                      ? "Primary"
                      : provider.api_key_set
                        ? "API Key Set"
                        : "No API Key",
                    variant: provider.is_primary
                      ? "default"
                      : provider.api_key_set
                        ? "success"
                        : "warning",
                  }}
                  defaultOpen={provider.is_primary}
                  headerActions={
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(provider)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleTestProvider(provider.id, provider.provider)
                        }
                        disabled={testingProviders.has(provider.id)}
                      >
                        {testingProviders.has(provider.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetPrimary(provider.id)}
                        disabled={provider.is_primary}
                      >
                        {provider.is_primary ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Switch
                        checked={provider.is_enabled}
                        onCheckedChange={(checked) =>
                          handleToggleProvider(provider.id, checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                >
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(provider)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleTestProvider(provider.id, provider.provider)
                      }
                      disabled={testingProviders.has(provider.id)}
                    >
                      {testingProviders.has(provider.id) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Test connection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(provider.id)}
                      disabled={provider.is_primary}
                    >
                      {provider.is_primary ? (
                        <Star className="mr-2 h-4 w-4 fill-current" />
                      ) : (
                        <StarOff className="mr-2 h-4 w-4" />
                      )}
                      {provider.is_primary ? "Primary" : "Set as primary"}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Enabled</Label>
                      <Switch
                        checked={provider.is_enabled}
                        onCheckedChange={(checked) =>
                          handleToggleProvider(provider.id, checked)
                        }
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove provider
                    </Button>
                  </div>
                </CollapsibleCard>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Provider Dialog */}
      <Dialog
        open={!!editingProvider}
        onOpenChange={(open) => {
          if (!open) resetAddDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit AI Provider</DialogTitle>
            <DialogDescription>
              Update settings for{" "}
              {providerTemplates.find((t) => t.id === editingProvider?.provider)?.name ?? editingProvider?.provider}.
            </DialogDescription>
          </DialogHeader>
          {editingProvider && selectedTemplateData && (
            <div className="space-y-4 py-4">
              {/* Provider (read-only) */}
              <div className="space-y-2">
                <Label>Provider</Label>
                <Input
                  value={providerTemplates.find((t) => t.id === editingProvider.provider)?.name ?? editingProvider.provider}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* API Key */}
              {selectedTemplateData.requires_api_key && (
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="password"
                        value={newProviderApiKey}
                        onChange={(e) => {
                          setNewProviderApiKey(e.target.value);
                          setKeyValid(null);
                          setKeyError(null);
                        }}
                        placeholder={editingProvider.api_key_set ? "Leave blank to keep current" : "Enter your API key"}
                      />
                      {keyValid === true && (
                        <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
                      )}
                      {keyValid === false && (
                        <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testApiKey}
                      disabled={
                        (editingProvider.provider === "azure" ? !newProviderEndpoint?.trim() || !newProviderApiKey?.trim() : !newProviderApiKey?.trim()) ||
                        isTestingKey
                      }
                    >
                      {isTestingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                  {keyError && (
                    <p className="text-sm text-destructive">{keyError}</p>
                  )}
                </div>
              )}

              {/* Azure endpoint */}
              {editingProvider.provider === "azure" && (
                <div className="space-y-2">
                  <Label>Azure OpenAI endpoint</Label>
                  <Input
                    type="url"
                    value={newProviderEndpoint}
                    onChange={(e) => {
                      setNewProviderEndpoint(e.target.value);
                      setKeyValid(null);
                      setKeyError(null);
                    }}
                    placeholder="https://your-resource.openai.azure.com"
                  />
                </div>
              )}

              {/* Bedrock credentials */}
              {editingProvider.provider === "bedrock" && (
                <>
                  <div className="space-y-2">
                    <Label>AWS Region</Label>
                    <Select
                      value={newProviderRegion}
                      onValueChange={(v) => {
                        setNewProviderRegion(v);
                        setKeyValid(null);
                        setKeyError(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">us-east-1</SelectItem>
                        <SelectItem value="us-west-2">us-west-2</SelectItem>
                        <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                        <SelectItem value="eu-central-1">eu-central-1</SelectItem>
                        <SelectItem value="ap-northeast-1">ap-northeast-1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key ID</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="password"
                          value={newProviderAccessKey}
                          onChange={(e) => {
                            setNewProviderAccessKey(e.target.value);
                            setKeyValid(null);
                            setKeyError(null);
                          }}
                          placeholder={editingProvider.access_key_set ? "Leave blank to keep current" : "AKIA..."}
                        />
                        {keyValid === true && (
                          <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
                        )}
                        {keyValid === false && (
                          <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testApiKey}
                        disabled={!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim() || isTestingKey}
                      >
                        {isTestingKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Access Key</Label>
                    <Input
                      type="password"
                      value={newProviderSecretKey}
                      onChange={(e) => {
                        setNewProviderSecretKey(e.target.value);
                        setKeyValid(null);
                        setKeyError(null);
                      }}
                      placeholder={editingProvider.secret_key_set ? "Leave blank to keep current" : "Enter secret key"}
                    />
                  </div>
                  {keyError && (
                    <p className="text-sm text-destructive">{keyError}</p>
                  )}
                </>
              )}

              {/* Ollama host */}
              {editingProvider.provider === "ollama" && (
                <div className="space-y-2">
                  <Label>Ollama host</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        value={newProviderBaseUrl}
                        onChange={(e) => {
                          setNewProviderBaseUrl(e.target.value);
                          setKeyValid(null);
                          setKeyError(null);
                        }}
                        placeholder="http://localhost:11434"
                      />
                      {keyValid === true && (
                        <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600 dark:text-green-400" />
                      )}
                      {keyValid === false && (
                        <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testApiKey}
                      disabled={!newProviderBaseUrl?.trim() || isTestingKey}
                    >
                      {isTestingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                  {keyError && (
                    <p className="text-sm text-destructive">{keyError}</p>
                  )}
                </div>
              )}

              {/* Model selection */}
              {selectedTemplateData.supports_discovery && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="mb-0">Model</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={discoverModels}
                      disabled={
                        (selectedTemplateData.requires_api_key && !newProviderApiKey?.trim()) ||
                        (editingProvider.provider === "ollama" && !newProviderBaseUrl?.trim()) ||
                        (editingProvider.provider === "azure" && (!newProviderEndpoint?.trim() || !newProviderApiKey?.trim())) ||
                        (editingProvider.provider === "bedrock" && (!newProviderAccessKey?.trim() || !newProviderSecretKey?.trim())) ||
                        isDiscovering
                      }
                    >
                      {isDiscovering ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Fetch Models
                    </Button>
                    {discoveredModels.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={refreshModels}
                        disabled={isDiscovering}
                      >
                        <RefreshCw className={`mr-1 h-3 w-3 ${isDiscovering ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    )}
                  </div>
                  {discoveryError && (
                    <p className="text-sm text-destructive">{discoveryError}</p>
                  )}
                  {discoveredModels.length > 0 ? (
                    <Select
                      value={newProviderModel}
                      onValueChange={setNewProviderModel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* If the current model isn't in the discovered list, show it as an option */}
                        {newProviderModel && !discoveredModels.some((m) => m.id === newProviderModel) && (
                          <SelectItem key={newProviderModel} value={newProviderModel}>
                            {newProviderModel} (current)
                          </SelectItem>
                        )}
                        {discoveredModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        value={newProviderModel}
                        onChange={(e) => setNewProviderModel(e.target.value)}
                        placeholder="Enter model name"
                      />
                      <p className="text-sm text-muted-foreground">
                        Enter your API key above and click Fetch Models to browse, or type a model name directly.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => resetAddDialog()}
            >
              Cancel
            </Button>
            <Button onClick={handleEditProvider} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mode Requirements Alert */}
      {mode === "council" && providers.filter((p) => p.is_enabled).length < 2 && (
        <Alert variant="warning">
          <AlertTitle>Council Mode Requirement</AlertTitle>
          <AlertDescription>
            Council mode requires at least 2 enabled providers to reach consensus.
            Please enable more providers or switch to a different mode.
          </AlertDescription>
        </Alert>
      )}

      {/* System Defaults (admin-only) */}
      {isAdmin && <AISettingsForm mode={mode} />}
    </div>
  );
}
