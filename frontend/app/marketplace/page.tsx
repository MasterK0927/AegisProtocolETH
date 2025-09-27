"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star, TrendingUp } from "lucide-react";

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
import HomeHeader from "@/components/home-header";
import { fetchAgents, type AgentData } from "@/lib/agents";

export default function MarketplacePage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  useEffect(() => {
    let mounted = true;

    const loadAgents = async () => {
      try {
        const data = await fetchAgents();
        if (mounted) {
          setAgents(data);
        }
      } catch (err) {
        console.error("Failed to fetch agents", err);
        if (mounted) {
          setError("Unable to load the agent catalog. Please try again.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    agents.forEach((agent) => {
      if (agent.category) {
        categorySet.add(agent.category);
      }
    });
    return [
      "All Categories",
      ...Array.from(categorySet).sort((a, b) => a.localeCompare(b)),
    ];
  }, [agents]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesCategory =
        selectedCategory === "All Categories" ||
        agent.category === selectedCategory;
      const haystack =
        `${agent.name} ${agent.shortDescription} ${agent.description}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [agents, selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            AI Agent Marketplace
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover and rent powerful AI agents for your projects
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search agents..."
            className="pl-10 h-12 text-lg"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === selectedCategory ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Trending Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Trending This Week
            </h2>
          </div>

          {isLoading && (
            <div className="text-muted-foreground">
              Loading marketplace agents…
            </div>
          )}

          {error && !isLoading && (
            <div className="text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredAgents.length === 0 && (
            <div className="text-muted-foreground">No agents found.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.map((agent) => {
              const trending = Boolean(agent.trending);
              const usage =
                agent.usageDelta ??
                (agent.totalSessions
                  ? `${agent.totalSessions.toLocaleString()} lifetime sessions`
                  : "Recently listed");

              return (
                <Card
                  key={agent.tokenId}
                  className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="text-3xl mb-2">{agent.avatar}</div>
                      {trending && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          Trending
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {agent.shortDescription}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Pay-per-call</span>
                      <Badge variant="outline">{agent.category}</Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">
                        {agent.rating?.toFixed(1) ?? "-"}
                      </span>
                      <span className="text-muted-foreground">
                        ({agent.reviews ?? 0})
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium">
                        Available Tools:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {agent.tools.length > 0 ? (
                          <>
                            {agent.tools.slice(0, 3).map((tool, index) => (
                              <Badge
                                key={`${tool}-${index}`}
                                variant="outline"
                                className="text-xs px-2 py-0.5"
                              >
                                {tool}
                              </Badge>
                            ))}
                            {agent.tools.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-0.5"
                              >
                                +{agent.tools.length - 3} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 opacity-60"
                          >
                            Tool metadata unavailable
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>{usage}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">
                        {agent.pricing.displayLabel}
                      </span>
                      <Button asChild size="sm">
                        <Link href={`/agent/${agent.tokenId}`}>Explore</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
