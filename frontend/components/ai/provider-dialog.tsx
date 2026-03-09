"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import type { AIProvider, DiscoveredModel, ProviderTemplate } from "@/components/ai/ai-types";
import { providerTemplates } from "@/components/ai/ai-types";

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProvider?: AIProvider | null;
  onSave: (provider: AIProvider) => void;
}

const LLM_MODELS_CACHE_KEY = "llm_discovered_models";
const LLM_MODELS_CACHE_TTL_MS = 60 * 60 * 1000;

function getCachedModels(provider: string): DiscoveredModel[] | null {
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
}

function setCachedModels(provider: string, models: DiscoveredModel[]) {
  try {
    sessionStorage.setItem(
      `${LLM_MODELS_CACHE_KEY}_${provider}`,
      JSON.stringify({ models, ts: Date.now() })
    );
  } catch {
    // ignore
  }
}

function clearCachedModels(provider: string) {
  try {
    sessionStorage.removeItem(`${LLM_MODELS_CACHE_KEY}_${provider}`);
  } catch {
    // ignore
  }
}

export function ProviderDialog({
  open,
  onOpenChange,
  editingProvider,
  onSave,
}: ProviderDialogProps) {
  const isEditing = !!editingProvider;

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [endpoint, setEndpoint] = useState<string>("");
  const [region, setRegion] = useState<string>("us-east-1");
  const [accessKey, setAccessKey] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");

  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const activeProvider = isEditing ? editingProvider!.provider : selectedTemplate;
  const templateData = providerTemplates.find((t) => t.id === activeProvider);

  const resetState = useCallback(() => {
    setSelectedTemplate("");
    setModel("");
    setApiKey("");
    setBaseUrl("");
    setEndpoint("");
    setRegion("us-east-1");
    setAccessKey("");
    setSecretKey("");
    setKeyValid(null);
    setKeyError(null);
    setDiscoveredModels([]);
    setDiscoveryError(null);
    setIsSaving(false);
  }, []);

  const initEditState = useCallback((provider: AIProvider) => {
    setSelectedTemplate(provider.provider);
    setModel(provider.model);
    setApiKey("");
    setBaseUrl(provider.base_url || "");
    setEndpoint(provider.endpoint || "");
    setRegion(provider.region || "us-east-1");
    setAccessKey("");
    setSecretKey("");
    setKeyValid(null);
    setKeyError(null);
    setDiscoveryError(null);
    const cached = getCachedModels(provider.provider);
    setDiscoveredModels(cached ?? []);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen && editingProvider) {
      initEditState(editingProvider);
    } else if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  }, [editingProvider, initEditState, resetState, onOpenChange]);

  // When dialog opens with editingProvider, initialize state
  // Use a ref-like approach: check if we need to sync
  const [lastEditId, setLastEditId] = useState<number | null>(null);
  if (open && editingProvider && editingProvider.id !== lastEditId) {
    setLastEditId(editingProvider.id);
    initEditState(editingProvider);
  } else if (!open && lastEditId !== null) {
    setLastEditId(null);
  }

  const clearKeyState = () => {
    setKeyValid(null);
    setKeyError(null);
  };

  const clearDiscoveryOnCredentialChange = () => {
    setDiscoveredModels([]);
    setDiscoveryError(null);
  };

  const testApiKey = async () => {
    if (activeProvider === "ollama") {
      if (!baseUrl?.trim()) {
        setKeyError("Enter Ollama host (e.g. http://localhost:11434)");
        return;
      }
    } else if (activeProvider === "azure") {
      if (!endpoint?.trim()) {
        setKeyError("Enter Azure OpenAI endpoint (e.g. https://your-resource.openai.azure.com)");
        return;
      }
      if (!apiKey?.trim()) {
        setKeyError("Enter your API key");
        return;
      }
    } else if (activeProvider === "bedrock") {
      if (!accessKey?.trim() || !secretKey?.trim()) {
        setKeyError("Enter AWS access key and secret key");
        return;
      }
    } else if (!apiKey?.trim()) {
      setKeyError("Enter your API key");
      return;
    }
    setIsTestingKey(true);
    setKeyError(null);
    setKeyValid(null);
    try {
      const response = await api.post("/llm-settings/test-key", {
        provider: activeProvider,
        api_key: apiKey || undefined,
        host: activeProvider === "ollama" ? (baseUrl || "http://localhost:11434") : undefined,
        endpoint: activeProvider === "azure" ? endpoint || undefined : undefined,
        region: activeProvider === "bedrock" ? region || undefined : undefined,
        access_key: activeProvider === "bedrock" ? accessKey || undefined : undefined,
        secret_key: activeProvider === "bedrock" ? secretKey || undefined : undefined,
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
    if (activeProvider === "ollama") {
      if (!baseUrl?.trim()) {
        setDiscoveryError("Enter Ollama host first");
        return;
      }
    } else if (activeProvider === "azure") {
      if (!endpoint?.trim()) {
        setDiscoveryError("Enter Azure OpenAI endpoint first");
        return;
      }
      if (!apiKey?.trim()) {
        setDiscoveryError("Enter your API key first");
        return;
      }
    } else if (activeProvider === "bedrock") {
      if (!accessKey?.trim() || !secretKey?.trim()) {
        setDiscoveryError("Enter AWS access key and secret key first");
        return;
      }
    } else if (!apiKey?.trim()) {
      setDiscoveryError("Enter your API key first");
      return;
    }
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const response = await api.post("/llm-settings/discover-models", {
        provider: activeProvider,
        api_key: apiKey || undefined,
        host: activeProvider === "ollama" ? (baseUrl || "http://localhost:11434") : undefined,
        endpoint: activeProvider === "azure" ? endpoint || undefined : undefined,
        region: activeProvider === "bedrock" ? region || undefined : undefined,
        access_key: activeProvider === "bedrock" ? accessKey || undefined : undefined,
        secret_key: activeProvider === "bedrock" ? secretKey || undefined : undefined,
      });
      const models = response.data.models ?? [];
      setDiscoveredModels(models);
      if (activeProvider) {
        setCachedModels(activeProvider, models);
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

  const refreshModels = () => {
    if (activeProvider) {
      clearCachedModels(activeProvider);
    }
    setDiscoveryError(null);
    discoverModels();
  };

  const handleSave = async () => {
    if (isEditing) {
      if (!model) {
        toast.error("Please select a model");
        return;
      }
      if (editingProvider!.provider === "azure" && !endpoint?.trim()) {
        toast.error("Azure OpenAI endpoint is required");
        return;
      }
      setIsSaving(true);
      try {
        const payload: Record<string, unknown> = {};
        if (model !== editingProvider!.model) {
          payload.model = model;
        }
        if (apiKey) {
          payload.api_key = apiKey;
        }
        if (editingProvider!.provider === "ollama") {
          const newUrl = baseUrl || "";
          const oldUrl = editingProvider!.base_url || "";
          if (newUrl !== oldUrl) {
            payload.base_url = newUrl || null;
          }
        }
        if (editingProvider!.provider === "azure") {
          const newEp = endpoint || "";
          const oldEp = editingProvider!.endpoint || "";
          if (newEp !== oldEp) {
            payload.endpoint = newEp || null;
          }
        }
        if (editingProvider!.provider === "bedrock") {
          const newRegion = region || "";
          const oldRegion = editingProvider!.region || "";
          if (newRegion !== oldRegion) {
            payload.region = newRegion || null;
          }
          if (accessKey) {
            payload.access_key = accessKey;
          }
          if (secretKey) {
            payload.secret_key = secretKey;
          }
        }
        const response = await api.put(`/llm/providers/${editingProvider!.id}`, payload);
        onSave(response.data.provider);
        handleOpenChange(false);
      } catch (err: unknown) {
        const data = err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : null;
        toast.error(data?.message ?? "Failed to update provider");
      } finally {
        setIsSaving(false);
      }
    } else {
      if (!selectedTemplate || !model) {
        toast.error("Please select a provider and model");
        return;
      }
      const template = providerTemplates.find((t) => t.id === selectedTemplate);
      if (template?.requires_api_key && !apiKey && selectedTemplate !== "bedrock") {
        toast.error("API key is required for this provider");
        return;
      }
      if (selectedTemplate === "azure" && !endpoint?.trim()) {
        toast.error("Azure OpenAI endpoint is required");
        return;
      }
      if (selectedTemplate === "bedrock" && (!accessKey?.trim() || !secretKey?.trim())) {
        toast.error("AWS access key and secret key are required for Bedrock");
        return;
      }
      setIsSaving(true);
      try {
        const response = await api.post("/llm/providers", {
          provider: selectedTemplate,
          model: model,
          api_key: apiKey || undefined,
          base_url: selectedTemplate === "ollama" ? (baseUrl || undefined) : undefined,
          endpoint: selectedTemplate === "azure" ? endpoint || undefined : undefined,
          region: selectedTemplate === "bedrock" ? region || undefined : undefined,
          access_key: selectedTemplate === "bedrock" ? accessKey || undefined : undefined,
          secret_key: selectedTemplate === "bedrock" ? secretKey || undefined : undefined,
        });
        onSave(response.data.provider);
        handleOpenChange(false);
      } catch (err: unknown) {
        const data = err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
          : null;
        toast.error(data?.message ?? "Failed to add provider");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const isDiscoverDisabled =
    (templateData?.requires_api_key && !apiKey?.trim()) ||
    (activeProvider === "ollama" && !baseUrl?.trim()) ||
    (activeProvider === "azure" && (!endpoint?.trim() || !apiKey?.trim())) ||
    (activeProvider === "bedrock" && (!accessKey?.trim() || !secretKey?.trim())) ||
    isDiscovering;

  const isTestDisabled = (() => {
    if (isTestingKey) return true;
    if (activeProvider === "ollama") return !baseUrl?.trim();
    if (activeProvider === "azure") return !endpoint?.trim() || !apiKey?.trim();
    if (activeProvider === "bedrock") return !accessKey?.trim() || !secretKey?.trim();
    return !apiKey?.trim();
  })();

  const renderCredentialFields = (tmpl: ProviderTemplate) => (
    <>
      {tmpl.requires_api_key && (
        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  clearKeyState();
                  if (!isEditing) clearDiscoveryOnCredentialChange();
                }}
                placeholder={isEditing && editingProvider?.api_key_set ? "Leave blank to keep current" : "Enter your API key"}
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
              disabled={isTestDisabled}
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

      {activeProvider === "azure" && (
        <div className="space-y-2">
          <Label>Azure OpenAI endpoint</Label>
          <Input
            type="url"
            value={endpoint}
            onChange={(e) => {
              setEndpoint(e.target.value);
              clearKeyState();
              if (!isEditing) clearDiscoveryOnCredentialChange();
            }}
            placeholder="https://your-resource.openai.azure.com"
          />
        </div>
      )}

      {activeProvider === "bedrock" && (
        <>
          <div className="space-y-2">
            <Label>AWS Region</Label>
            <Select
              value={region}
              onValueChange={(v) => {
                setRegion(v);
                clearKeyState();
                if (!isEditing) clearDiscoveryOnCredentialChange();
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
                  value={accessKey}
                  onChange={(e) => {
                    setAccessKey(e.target.value);
                    clearKeyState();
                    if (!isEditing) clearDiscoveryOnCredentialChange();
                  }}
                  placeholder={isEditing && editingProvider?.access_key_set ? "Leave blank to keep current" : "AKIA..."}
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
                disabled={!accessKey?.trim() || !secretKey?.trim() || isTestingKey}
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
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                clearKeyState();
                if (!isEditing) clearDiscoveryOnCredentialChange();
              }}
              placeholder={isEditing && editingProvider?.secret_key_set ? "Leave blank to keep current" : "Enter secret key"}
            />
          </div>
          {keyError && (
            <p className="text-sm text-destructive">{keyError}</p>
          )}
        </>
      )}

      {activeProvider === "ollama" && (
        <div className="space-y-2">
          <Label>Ollama host</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  clearKeyState();
                  if (!isEditing) clearDiscoveryOnCredentialChange();
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
              disabled={!baseUrl?.trim() || isTestingKey}
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
    </>
  );

  const renderModelSelection = (tmpl: ProviderTemplate) => {
    if (!tmpl.supports_discovery) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="mb-0">{isEditing ? "Model" : "Models"}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={discoverModels}
            disabled={!!isDiscoverDisabled}
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
            value={model}
            onValueChange={setModel}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {isEditing && model && !discoveredModels.some((m) => m.id === model) && (
                <SelectItem key={model} value={model}>
                  {model} (current)
                </SelectItem>
              )}
              {discoveredModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : isEditing ? (
          <div className="space-y-1">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Enter model name"
            />
            <p className="text-sm text-muted-foreground">
              Enter your API key above and click Fetch Models to browse, or type a model name directly.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter your API key (or host for Ollama) and click Fetch Models.
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit AI Provider" : "Add AI Provider"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? <>Update settings for {providerTemplates.find((t) => t.id === editingProvider?.provider)?.name ?? editingProvider?.provider}.</>
              : "Configure a new AI provider for your application."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isEditing ? (
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input
                value={providerTemplates.find((t) => t.id === editingProvider!.provider)?.name ?? editingProvider!.provider}
                disabled
                className="bg-muted"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(v) => {
                  setSelectedTemplate(v);
                  setModel("");
                  setEndpoint("");
                  setRegion("us-east-1");
                  setAccessKey("");
                  setSecretKey("");
                  clearKeyState();
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
          )}

          {templateData && (
            <>
              {renderCredentialFields(templateData)}
              {renderModelSelection(templateData)}

              {!isEditing && (
                <div className="flex gap-2">
                  {templateData.supports_vision && (
                    <Badge variant="secondary">Vision Support</Badge>
                  )}
                  {!templateData.requires_api_key && (
                    <Badge variant="outline">No API Key Required</Badge>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
