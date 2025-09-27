"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket } from "lucide-react";
import type { AgentData } from "@/app/create/page";
import { uploadAgentMetadata, type AgentMetadataPayload } from "@/lib/storage";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { realTools } from "@/lib/real-tools";

interface ReviewStepProps {
  data: AgentData;
  onUpdate: (updates: Partial<AgentData>) => void;
}

export function ReviewStep({ data, onUpdate }: ReviewStepProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { connect, address } = useWeb3();

  const handleDeploy = async () => {
    if (isDeploying) {
      return;
    }

    if (!data.name.trim()) {
      toast({
        title: "Agent name required",
        description: "Give your agent a name before deploying.",
        variant: "destructive",
      });
      return;
    }

    if (!data.shortDescription.trim() && !data.description.trim()) {
      toast({
        title: "Add a description",
        description:
          "Provide a short or long description so renters know what your agent does.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(data.hourlyRate) || data.hourlyRate <= 0) {
      toast({
        title: "Invalid hourly rate",
        description: "Set a positive hourly rate in ETH before deploying.",
        variant: "destructive",
      });
      return;
    }

    if (!data.llmConfig.provider || !data.llmConfig.model) {
      toast({
        title: "LLM configuration incomplete",
        description: "Please configure your AI model selection.",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);

    try {
      let activeAddress = address;
      if (!activeAddress) {
        try {
          const connection = await connect();
          activeAddress = connection?.address ?? null;
        } catch (connectionError) {
          console.warn("Wallet connection skipped", connectionError);
        }
      }

      const now = new Date().toISOString();
      const metadataPayload: AgentMetadataPayload = {
        name: data.name || `Agent created ${now}`,
        description:
          data.description || data.shortDescription || "Aegis Protocol agent",
        shortDescription: data.shortDescription,
        attributes: [
          { trait_type: "category", value: data.category },
          { trait_type: "hourlyRate", value: data.hourlyRate },
          { trait_type: "llmProvider", value: data.llmConfig.provider },
          { trait_type: "llmModel", value: data.llmConfig.model },
        ],
        aegis: {
          name: data.name,
          shortDescription: data.shortDescription,
          description: data.description,
          category: data.category,
          tools: data.tools,
          capabilities: data.outputs,
          context: data.context,
          hourlyRate: data.hourlyRate,
          outputs: data.outputs,
          llmConfig: {
            provider: data.llmConfig.provider,
            model: data.llmConfig.model,
            // Note: API key is intentionally excluded from metadata for security
            temperature: data.llmConfig.temperature,
            maxTokens: data.llmConfig.maxTokens,
          },
          createdBy: activeAddress ?? "anonymous",
          createdAt: now,
        },
      };

      toast({
        title: "Uploading agent metadata",
        description: "Saving details to Filecoin via Lighthouse...",
      });

      const uploadResult = await uploadAgentMetadata(
        metadataPayload,
        data.files
      );

      toast({
        title: "Agent published",
        description: "Metadata uploaded successfully to Filecoin.",
      });

      router.push("/marketplace");
    } catch (error) {
      console.error("Agent deployment failed", error);
      toast({
        title: "Deployment failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while deploying your agent.",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            {data.name}
          </CardTitle>
          <CardDescription>{data.shortDescription}</CardDescription>
          {data.description !== data.shortDescription && (
            <p className="text-sm text-muted-foreground mt-2">
              {data.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{data.category}</Badge>
            {data.outputs.map((output) => (
              <Badge key={output} variant="outline">
                {output}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* LLM Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Model Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Provider</Label>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {data.llmConfig.provider || "Not configured"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Model</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {data.llmConfig.model || "Not selected"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Temperature</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {data.llmConfig.temperature}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Max Tokens</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {data.llmConfig.maxTokens}
              </p>
            </div>
          </div>
          <div className="col-span-2">
            <Label className="text-sm font-medium">API Key Requirement</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Renter will provide their own API key when using this agent
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Context & Knowledge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Context & Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.context && (
            <div>
              <Label className="text-sm font-medium">Additional Context</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {data.context}
              </p>
            </div>
          )}

          {data.files.length > 0 && (
            <div>
              <Label className="text-sm font-medium">
                Uploaded Files ({data.files.length})
              </Label>
              <div className="mt-2 space-y-1">
                {data.files.map((file, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Tools & Capabilities ({data.tools.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.tools.map((toolId) => {
              const tool = realTools.find((t) => t.id === toolId);
              return (
                <Badge
                  key={toolId}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <span>{tool?.icon}</span>
                  {tool?.name || toolId}
                  {tool?.type === "api" && (
                    <span className="text-xs opacity-70">(API)</span>
                  )}
                  {tool?.type === "mcp" && (
                    <span className="text-xs opacity-70">(MCP)</span>
                  )}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pricing</CardTitle>
          <CardDescription>Set your hourly rental rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="hourlyRate">Hourly Rate (ETH)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.001"
                min="0.001"
                value={data.hourlyRate}
                onChange={(e) =>
                  onUpdate({
                    hourlyRate: Number.parseFloat(e.target.value) || 0.05,
                  })
                }
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Platform fee: 2.5%</div>
              <div>
                You earn: {(data.hourlyRate * 0.975).toFixed(4)} ETH/hour
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deploy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ready to Deploy</CardTitle>
          <CardDescription>
            Your agent will be deployed to the blockchain and listed on the
            marketplace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">What happens next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Agent deployed to blockchain (requires wallet signature)
                </li>
                <li>• Listed on Aegis Protocol marketplace</li>
                <li>• Available for rental by other users</li>
                <li>• You earn ETH from each rental</li>
              </ul>
            </div>

            <Button
              onClick={handleDeploy}
              size="lg"
              className="w-full"
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Agent to Marketplace
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
