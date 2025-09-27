"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Layers, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HomeHeader from "@/components/home-header";
import { UsageChart } from "@/components/usage-chart";
import { fetchAgent, type AgentData } from "@/lib/agents";

export default function AgentPage({ params }: { params: { id: string } }) {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const tokenId = Number.parseInt(params.id, 10);
    if (Number.isNaN(tokenId)) {
      setError("Invalid agent identifier.");
      setIsLoading(false);
      return;
    }

    const loadAgent = async () => {
      try {
        const result = await fetchAgent(tokenId);
        if (mounted) {
          if (!result) {
            setError("Agent not found.");
          } else {
            setAgent(result);
          }
        }
      } catch (err) {
        console.error("Failed to load agent", err);
        if (mounted) {
          setError("Unable to load agent details. Please try again.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAgent();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const usageData = useMemo(() => agent?.usageData ?? [], [agent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <HomeHeader />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading agent details…
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <HomeHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="text-2xl font-semibold">
            {error ?? "Agent not found."}
          </div>
          <Button asChild variant="outline">
            <Link href="/marketplace">Back to marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const usageSummary = usageData.reduce(
    (total, point) => total + point.rentals,
    0
  );
  const avatarIsImage =
    agent.avatar.startsWith("http") || agent.avatar.startsWith("data:");
  const ratingAvailable =
    typeof agent.rating === "number" && !Number.isNaN(agent.rating);
  const reviewsCount = agent.reviews ?? 0;

  const llmSummary = [agent.llmConfig.provider, agent.llmConfig.model]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/marketplace">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16 text-3xl">
                    {avatarIsImage ? (
                      <AvatarImage src={agent.avatar} alt={agent.name} />
                    ) : (
                      <AvatarFallback className="text-3xl">
                        {agent.avatar || "🤖"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-3xl">{agent.name}</CardTitle>
                      <Badge variant="secondary">{agent.category}</Badge>
                    </div>
                    <CardDescription className="text-base mb-4">
                      {agent.description}
                    </CardDescription>
                    {ratingAvailable ? (
                      <div className="text-sm text-muted-foreground">
                        Rated {agent.rating?.toFixed(1)} ({reviewsCount}{" "}
                        reviews)
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Be the first to review this agent
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Badge variant="outline">{agent.pricing.displayLabel}</Badge>
                <Badge variant="outline">{llmSummary}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-4 h-4" />
                    Sessions last 7 days
                  </CardTitle>
                  <div className="text-2xl font-bold text-primary mt-1">
                    {usageSummary.toLocaleString()}
                  </div>
                </div>
                <div className="w-32 h-16">
                  <UsageChart data={usageData} compact />
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agent.capabilities.map((capability) => (
                    <div
                      key={capability}
                      className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Integrated Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agent.tools.map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm"
                    >
                      <span className="text-xl">🛠️</span>
                      <span className="font-medium">{tool}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                  <Brain className="w-5 h-5" />
                  Pay Per Call
                </CardTitle>
                <CardDescription className="text-center">
                  Settled in MATIC on Polygon Amoy via x402
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    {agent.pricing.displayLabel}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ({agent.pricing.priceMoney} USD reference)
                  </div>
                </div>

                <Button asChild size="lg" className="w-full">
                  <Link href={`/chat/${agent.tokenId}`}>Start Paid Chat</Link>
                </Button>

                <div className="text-xs text-muted-foreground">
                  Requires a connected wallet and confirms payment before each
                  response.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
