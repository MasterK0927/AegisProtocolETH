"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, TrendingUp, Clock, Users, Zap, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HomeHeader from "@/components/home-header";
import { RentalModal } from "@/components/rental-modal";
import { UsageChart } from "@/components/usage-chart";
import { fetchAgent, type AgentData } from "@/lib/agents";

export default function AgentPage({ params }: { params: { id: string } }) {
  const [showRentalModal, setShowRentalModal] = useState(false);
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
          setError(
            "Unable to load agent data. Ensure the local Hardhat node is running and contracts are deployed."
          );
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
  const formatAddress = (address?: string) => {
    if (!address) {
      return "Unknown";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  const creatorDisplayName = agent.creatorName ?? formatAddress(agent.creator);
  const creatorInitials =
    creatorDisplayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "AG";
  const avatarIsImage =
    agent.avatar.startsWith("http") || agent.avatar.startsWith("data:");
  const ratingAvailable =
    typeof agent.rating === "number" && !Number.isNaN(agent.rating);
  const reviewsCount = agent.reviews ?? 0;
  const activeRentals = agent.activeRentals ?? 0;

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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent Header */}
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
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-3xl">{agent.name}</CardTitle>
                      <Badge variant="secondary">{agent.category}</Badge>
                    </div>
                    <CardDescription className="text-base mb-4">
                      {agent.description}
                    </CardDescription>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {creatorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">
                          Created by {creatorDisplayName}
                        </span>
                      </div>
                      {ratingAvailable ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {agent.rating?.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            ({reviewsCount} reviews)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Star className="w-4 h-4" />
                          <span className="text-sm">No reviews yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Rentals last 7 days
                    </CardTitle>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {usageSummary.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-32 h-16">
                    <UsageChart data={usageData} compact />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agent.capabilities.map((capability, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                    >
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm">{capability}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agent.tools.length > 0 ? (
                    agent.tools.map((tool, index) => {
                      const trimmed = tool.trim();
                      const [firstSymbol, ...rest] = trimmed.split(" ");
                      const looksLikeEmoji = /\p{Extended_Pictographic}/u.test(
                        firstSymbol ?? ""
                      );
                      const name = looksLikeEmoji ? rest.join(" ") : trimmed;
                      const icon = looksLikeEmoji ? firstSymbol : "🛠️";

                      return (
                        <div
                          key={`${tool}-${index}`}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                        >
                          <div className="text-2xl">{icon}</div>
                          <span className="text-sm font-medium">
                            {name || trimmed}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Tool metadata not provided for this agent.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rental Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-center">Rent This Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-foreground">
                    {agent.hourlyRateEth.toLocaleString(undefined, {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}
                  </div>
                  <div className="text-muted-foreground">ETH per hour</div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Minimum rental:
                    </span>
                    <span className="font-medium">1 hour</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Response time:
                    </span>
                    <span className="font-medium">&lt; 30 seconds</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Availability:</span>
                    <span className="font-medium text-green-500">24/7</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowRentalModal(true)}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Rent Now
                </Button>

                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>
                    {activeRentals} {activeRentals === 1 ? "person" : "people"}{" "}
                    are using this agent
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Creator Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About the Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarFallback>{creatorInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{creatorDisplayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {agent.creator}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Creator biography metadata has not been provided. Connect with
                  the creator to learn more about this agent.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <RentalModal
        isOpen={showRentalModal}
        onClose={() => setShowRentalModal(false)}
        agent={agent}
      />
    </div>
  );
}
