"use client";

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
import { ArrowRight, Info } from "lucide-react";
import type { AgentData } from "@/app/create/page";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LLM_PROVIDERS, getLLMProvider } from "@/lib/llms";

interface LLMStepProps {
  data: AgentData;
  onUpdate: (updates: Partial<AgentData>) => void;
  onNext: () => void;
}

export function LLMStep({ data, onUpdate, onNext }: LLMStepProps) {
  const selectedProvider = getLLMProvider(data.llmConfig.provider);
  const selectedModel = selectedProvider?.models.find(
    (m) => m.id === data.llmConfig.model
  );

  const handleProviderChange = (providerId: string) => {
    const provider = getLLMProvider(providerId);
    onUpdate({
      llmConfig: {
        ...data.llmConfig,
        provider: providerId,
        model: provider?.models[0]?.id || "",
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

  const canProceed = data.llmConfig.provider && data.llmConfig.model;

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
            {LLM_PROVIDERS.map((provider) => (
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
            <Select
              value={data.llmConfig.model}
              onValueChange={handleModelChange}
            >
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

        {/* API Key Guidance */}
        {selectedProvider && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>API Access</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Renters will securely provide their own API keys during
                      checkout.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="p-4 bg-muted/60 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                No keys needed from you.
              </p>
              <p>
                When someone rents your agent they’ll be prompted to supply a
                valid {selectedProvider.name} API key so usage stays on their
                account.
              </p>
              <p className="mt-2">
                Share this link with renters if they need to generate a key:{" "}
                <a
                  href={selectedProvider.apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {selectedProvider.apiKeyUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            </div>
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
                Lower values make output more focused, higher values more
                creative
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
