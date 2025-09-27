"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Eye, EyeOff, Info } from "lucide-react";
import type { AgentData } from "@/app/create/page";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const llmProviders = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "Most capable model" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and efficient" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High performance" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Cost effective" },
    ],
    apiKeyUrl: "https://platform.openai.com/api-keys",
    logo: "🤖",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Most intelligent model" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", description: "Fast and lightweight" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Most powerful model" },
    ],
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    logo: "🧠",
  },
  {
    id: "google",
    name: "Google",
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced reasoning" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast responses" },
      { id: "gemini-pro", name: "Gemini Pro", description: "Balanced performance" },
    ],
    apiKeyUrl: "https://makersuite.google.com/app/apikey",
    logo: "🔍",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", description: "Most capable" },
      { id: "mistral-medium-latest", name: "Mistral Medium", description: "Balanced" },
      { id: "mistral-small-latest", name: "Mistral Small", description: "Efficient" },
    ],
    apiKeyUrl: "https://console.mistral.ai/api-keys/",
    logo: "🌪️",
  },
];

interface LLMStepProps {
  data: AgentData;
  onUpdate: (updates: Partial<AgentData>) => void;
  onNext: () => void;
}

export function LLMStep({ data, onUpdate, onNext }: LLMStepProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const selectedProvider = llmProviders.find(
    (p) => p.id === data.llmConfig.provider
  );
  const selectedModel = selectedProvider?.models.find(
    (m) => m.id === data.llmConfig.model
  );

  const handleProviderChange = (providerId: string) => {
    const provider = llmProviders.find((p) => p.id === providerId);
    onUpdate({
      llmConfig: {
        ...data.llmConfig,
        provider: providerId,
        model: provider?.models[0]?.id || "",
        apiKey: "",
      },
    });
  };

  const handleModelChange = (modelId: string) => {
    onUpdate({
      llmConfig: {
        ...data.llmConfig,
        model: modelId,
      },
    });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onUpdate({
      llmConfig: {
        ...data.llmConfig,
        apiKey,
      },
    });
  };

  const handleTemperatureChange = (temperature: number[]) => {
    onUpdate({
      llmConfig: {
        ...data.llmConfig,
        temperature: temperature[0],
      },
    });
  };

  const handleMaxTokensChange = (maxTokens: string) => {
    onUpdate({
      llmConfig: {
        ...data.llmConfig,
        maxTokens: parseInt(maxTokens) || 2000,
      },
    });
  };

  const canProceed =
    data.llmConfig.provider &&
    data.llmConfig.model &&
    data.llmConfig.apiKey.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure your AI model</CardTitle>
        <CardDescription>
          Select the LLM provider and model that will power your agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label>LLM Provider</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {llmProviders.map((provider) => (
              <Card
                key={provider.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  data.llmConfig.provider === provider.id
                    ? "ring-2 ring-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleProviderChange(provider.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.logo}</span>
                    <div>
                      <h4 className="font-medium">{provider.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {provider.models.length} models available
                      </p>
                    </div>
                    {data.llmConfig.provider === provider.id && (
                      <div className="ml-auto w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        {selectedProvider && (
          <div className="space-y-3">
            <Label>Model</Label>
            <Select value={data.llmConfig.model} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {model.description}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="text-sm text-muted-foreground">
                {selectedModel.description}
              </p>
            )}
          </div>
        )}

        {/* API Key */}
        {selectedProvider && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>API Key</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your API key is stored securely and only used by your agent</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={`Enter your ${selectedProvider.name} API key`}
                value={data.llmConfig.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Don't have an API key?{" "}
              <a
                href={selectedProvider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get one here
              </a>
            </p>
          </div>
        )}

        {/* Advanced Settings */}
        {selectedProvider && (
          <div className="space-y-4">
            <Label>Advanced Settings</Label>
            
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Temperature</Label>
                <span className="text-sm text-muted-foreground">
                  {data.llmConfig.temperature}
                </span>
              </div>
              <Slider
                value={[data.llmConfig.temperature || 0.7]}
                onValueChange={handleTemperatureChange}
                max={2}
                min={0}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values make output more focused, higher values more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label className="text-sm">Max Tokens</Label>
              <Input
                type="number"
                min="100"
                max="8000"
                value={data.llmConfig.maxTokens}
                onChange={(e) => handleMaxTokensChange(e.target.value)}
                placeholder="2000"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens in the response
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6">
          <Button onClick={onNext} disabled={!canProceed} size="lg">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
