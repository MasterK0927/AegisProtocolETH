"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ExternalLink, KeyRound } from "lucide-react";

import type { AgentData } from "@/lib/agents";
import type { LLMProviderConfig } from "@/lib/llms";
import type { AgentCredentials } from "@/hooks/use-agent-credentials";
import { useToast } from "@/hooks/use-toast";

type ToolRequirement = {
  key: string;
  provider: string;
  tools: string[];
  url: string;
};

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentData;
  llmConfig?: { provider?: string; model?: string };
  llmProvider?: LLMProviderConfig;
  toolRequirements: ToolRequirement[];
  credentials: AgentCredentials;
  credentialsLoaded: boolean;
  isPersisted: boolean;
  onSave: (payload: AgentCredentials, options: { persist: boolean }) => void;
  onClear: () => void;
}

export function ApiKeyModal({
  open,
  onOpenChange,
  agent,
  llmConfig,
  llmProvider,
  toolRequirements,
  credentials,
  credentialsLoaded,
  isPersisted,
  onSave,
  onClear,
}: ApiKeyModalProps) {
  const { toast } = useToast();
  const [llmApiKey, setLlmApiKey] = useState("");
  const [toolKeys, setToolKeys] = useState<Record<string, string>>({});
  const [rememberKeys, setRememberKeys] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [visibleToolKeys, setVisibleToolKeys] = useState<
    Record<string, boolean>
  >({});
  const [formTouched, setFormTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormTouched(false);
      setShowLlmKey(false);
      setVisibleToolKeys({});
      return;
    }

    if (!credentialsLoaded) {
      return;
    }

    setLlmApiKey(credentials.llm?.apiKey ?? "");

    const nextToolKeys: Record<string, string> = {};
    toolRequirements.forEach((requirement) => {
      nextToolKeys[requirement.key] =
        credentials.tools?.[requirement.key]?.apiKey ?? "";
    });
    setToolKeys(nextToolKeys);
    setVisibleToolKeys((previous) => {
      const mapping: Record<string, boolean> = {};
      toolRequirements.forEach((requirement) => {
        mapping[requirement.key] = previous[requirement.key] ?? false;
      });
      return mapping;
    });
    setRememberKeys(isPersisted);
  }, [open, credentials, credentialsLoaded, toolRequirements, isPersisted]);

  const missingProviders = useMemo(() => {
    if (!open) {
      return [] as string[];
    }

    const missing: string[] = [];
    if (llmProvider && !llmApiKey.trim()) {
      missing.push(llmProvider.name);
    }
    toolRequirements.forEach((requirement) => {
      if (!toolKeys[requirement.key]?.trim()) {
        missing.push(requirement.provider);
      }
    });
    return missing;
  }, [open, llmProvider, llmApiKey, toolKeys, toolRequirements]);

  const handleSave = () => {
    setFormTouched(true);

    if (missingProviders.length > 0) {
      toast({
        title: "Missing API keys",
        description: `Provide keys for: ${missingProviders.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    const payload: AgentCredentials = {
      llm:
        llmProvider && llmApiKey.trim()
          ? {
              provider: llmProvider.id,
              model: llmConfig?.model,
              apiKey: llmApiKey.trim(),
            }
          : undefined,
      tools: {},
    };

    toolRequirements.forEach((requirement) => {
      const value = toolKeys[requirement.key]?.trim();
      if (value) {
        payload.tools[requirement.key] = {
          providerLabel: requirement.provider,
          apiKey: value,
          toolIds: requirement.tools,
        };
      }
    });

    onSave(payload, { persist: rememberKeys });
    toast({
      title: "API keys updated",
      description: `Credentials saved for ${agent.name}.`,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    onClear();
    setLlmApiKey("");
    setToolKeys({});
    setRememberKeys(false);
    setVisibleToolKeys({});
    toast({
      title: "Credentials cleared",
      description: "All stored API keys for this agent have been removed.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Manage API keys
          </DialogTitle>
          <DialogDescription>
            Provide or update the credentials required to run {agent.name}. Keys
            stay in your browser only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">LLM credential</CardTitle>
              <CardDescription>
                {llmProvider
                  ? `Needed to access ${llmProvider.name} during this rental.`
                  : "This agent doesn’t require an LLM API key."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {llmProvider ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor="modal-llm-key"
                      className="text-sm font-medium"
                    >
                      {llmProvider.name} API key
                    </Label>
                    <Button
                      asChild
                      variant="link"
                      className="h-auto px-0 text-xs"
                    >
                      <a
                        href={llmProvider.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get key
                        <ExternalLink className="ml-1 inline h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="modal-llm-key"
                      type={showLlmKey ? "text" : "password"}
                      value={llmApiKey}
                      onChange={(event) => setLlmApiKey(event.target.value)}
                      placeholder={`Enter your ${llmProvider.name} API key`}
                      className={
                        formTouched &&
                        missingProviders.includes(llmProvider.name)
                          ? "border-destructive focus-visible:ring-destructive"
                          : undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setShowLlmKey((previous) => !previous)}
                      aria-label={showLlmKey ? "Hide API key" : "Show API key"}
                    >
                      {showLlmKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {formTouched &&
                    missingProviders.includes(llmProvider.name) && (
                      <p className="text-xs text-destructive">
                        Required to run the agent&apos;s language model.
                      </p>
                    )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The agent creator hasn&apos;t specified an LLM provider.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tool credentials</CardTitle>
              <CardDescription>
                {toolRequirements.length > 0
                  ? "These keys enable the agent’s external tool integrations."
                  : "No external tools require credentials for this agent."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {toolRequirements.length > 0 ? (
                toolRequirements.map((requirement) => {
                  const value = toolKeys[requirement.key] ?? "";
                  const visible = visibleToolKeys[requirement.key] ?? false;
                  const isMissing =
                    formTouched &&
                    missingProviders.includes(requirement.provider);
                  return (
                    <div
                      key={requirement.key}
                      className="space-y-2 rounded-lg border border-border/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {requirement.provider}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Used for: {requirement.tools.join(", ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() =>
                            setVisibleToolKeys((previous) => ({
                              ...previous,
                              [requirement.key]: !visible,
                            }))
                          }
                          aria-label={visible ? "Hide API key" : "Show API key"}
                        >
                          {visible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <Input
                        type={visible ? "text" : "password"}
                        value={value}
                        onChange={(event) =>
                          setToolKeys((previous) => ({
                            ...previous,
                            [requirement.key]: event.target.value,
                          }))
                        }
                        placeholder={`Enter your ${requirement.provider} API key`}
                        className={
                          isMissing
                            ? "border-destructive focus-visible:ring-destructive"
                            : undefined
                        }
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <a
                          className="underline underline-offset-2"
                          href={requirement.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Documentation
                        </a>
                        {isMissing && (
                          <Badge variant="destructive" className="text-[10px]">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground">
                  This agent has no tools that require separate API credentials.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Remember on this device</p>
              <p className="text-xs text-muted-foreground">
                Toggle on to store keys securely in this browser for future
                rentals.
              </p>
            </div>
            <Switch checked={rememberKeys} onCheckedChange={setRememberKeys} />
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="text-xs"
            >
              Clear all keys
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save keys
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
