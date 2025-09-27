"use client";

import { useState } from "react";
import { Eye, EyeOff, Info, Key, AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRequiredApiKeys, getToolById } from "@/lib/real-tools";
import type { AgentData } from "@/lib/agents";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKeys: Record<string, string>) => void;
  agent: AgentData;
  isLoading?: boolean;
}

const llmProviders = [
  {
    id: "openai",
    name: "OpenAI",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    testEndpoint: "https://api.openai.com/v1/models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    testEndpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    id: "google",
    name: "Google",
    apiKeyUrl: "https://makersuite.google.com/app/apikey",
    testEndpoint: "https://generativelanguage.googleapis.com/v1/models",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    apiKeyUrl: "https://console.mistral.ai/api-keys/",
    testEndpoint: "https://api.mistral.ai/v1/models",
  },
];

export function ApiKeyModal({
  isOpen,
  onClose,
  onSubmit,
  agent,
  isLoading = false,
}: ApiKeyModalProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Get required API keys for tools
  const toolApiKeys = getRequiredApiKeys(agent.tools);

  // Get LLM provider info from agent metadata
  const llmProvider = llmProviders.find(
    (p) => agent.metadata?.aegis?.llmConfig?.provider === p.id
  );

  // All required API key providers
  const allRequiredKeys = [
    ...(llmProvider
      ? [
          {
            provider: llmProvider.name,
            url: llmProvider.apiKeyUrl,
            tools: ["LLM"],
            id: llmProvider.id,
            type: "llm" as const,
          },
        ]
      : []),
    ...toolApiKeys.map((key) => ({
      ...key,
      id: key.provider.toLowerCase().replace(/\s+/g, ""),
      type: "tool" as const,
    })),
  ];

  const handleApiKeyChange = (keyId: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [keyId]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[keyId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[keyId];
        return newErrors;
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const validateApiKeys = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    allRequiredKeys.forEach((keyInfo) => {
      const value = apiKeys[keyInfo.id]?.trim();
      if (!value) {
        errors[keyInfo.id] = `${keyInfo.provider} API key is required`;
        isValid = false;
      } else if (value.length < 10) {
        errors[keyInfo.id] = `API key appears to be too short`;
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = () => {
    if (validateApiKeys()) {
      onSubmit(apiKeys);
    }
  };

  const allKeysProvided = allRequiredKeys.every((keyInfo) =>
    apiKeys[keyInfo.id]?.trim()
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Keys Required
          </DialogTitle>
          <DialogDescription>
            To use <strong>{agent.name}</strong>, you need to provide API keys
            for the AI model and tools. Your keys are used securely and only for
            this session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Security Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">
                    Your API Keys Are Secure
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    API keys are only stored temporarily in your browser session
                    and are never saved to our servers. You maintain full
                    control over your API usage and costs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key Inputs */}
          <div className="space-y-4">
            {allRequiredKeys.map((keyInfo) => (
              <Card
                key={keyInfo.id}
                className={validationErrors[keyInfo.id] ? "border-red-200" : ""}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">
                          {keyInfo.provider}
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              keyInfo.type === "llm" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {keyInfo.type === "llm" ? "AI Model" : "Tools"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {keyInfo.type === "llm"
                              ? "Required for AI responses"
                              : `Required for: ${keyInfo.tools.join(", ")}`}
                          </span>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={keyInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs"
                              >
                                Get API Key
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Opens {keyInfo.provider} API key page in new tab
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="relative">
                      <Input
                        type={showKeys[keyInfo.id] ? "text" : "password"}
                        placeholder={`Enter your ${keyInfo.provider} API key`}
                        value={apiKeys[keyInfo.id] || ""}
                        onChange={(e) =>
                          handleApiKeyChange(keyInfo.id, e.target.value)
                        }
                        className={`pr-10 ${
                          validationErrors[keyInfo.id] ? "border-red-500" : ""
                        }`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleKeyVisibility(keyInfo.id)}
                      >
                        {showKeys[keyInfo.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {validationErrors[keyInfo.id] && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        {validationErrors[keyInfo.id]}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Cost Information */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">
                    API Usage Costs
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Using this agent will consume credits from your API
                    accounts. Monitor your usage in each provider's dashboard.
                    Different models and tools have different pricing
                    structures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!allKeysProvided || isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Starting Session...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Start Agent Session
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By continuing, you acknowledge that you will be responsible for
              API usage costs and that your keys will be used only for this
              agent session.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
