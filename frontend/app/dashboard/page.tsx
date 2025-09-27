"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatEther } from "ethers";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Users,
  Bot,
  Calendar,
  BarChart3,
  PieChart,
  ExternalLink,
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeHeader from "@/components/home-header";
import { UsageChart } from "@/components/usage-chart";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { fetchAgents, type AgentData } from "@/lib/agents";
import {
  fetchActiveRental,
  fetchRentalHistory,
  type ActiveRental,
  type RentalHistoryEvent,
} from "@/lib/rentals";

interface UserStats {
  totalAgentsCreated: number;
  totalAgentsRented: number;
  totalEarnings: number;
  totalSpent: number;
  activeRentals: number;
  monthlyEarnings: number;
  monthlySpent: number;
}

interface AgentExpense {
  agentId: number;
  agentName: string;
  totalSpentEth: number;
  totalSpentUsd: number;
  totalDurationHours: number;
  rentalsCount: number;
  lastUsed: Date;
  averageCostPerHourUsd: number;
}

const ETH_TO_USD = 2500;
const USAGE_WINDOW_DAYS = 14;

type UsagePoint = {
  date: string;
  rentals: number;
};

function buildUsageSeries(events: RentalHistoryEvent[]): UsagePoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - (USAGE_WINDOW_DAYS - 1));

  const buckets = new Map<string, number>();

  for (let i = 0; i < USAGE_WINDOW_DAYS; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  events.forEach((event) => {
    const eventDate = new Date(event.startedAt);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < start || eventDate > today) {
      return;
    }
    const key = eventDate.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rentals]) => ({ date, rentals }));
}

export default function DashboardPage() {
  const { address, balance, connect, isConnecting } = useWeb3();
  const { toast } = useToast();

  const [allAgents, setAllAgents] = useState<AgentData[]>([]);
  const [userAgents, setUserAgents] = useState<AgentData[]>([]);
  const [rentedAgents, setRentedAgents] = useState<AgentData[]>([]);
  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [rentalHistory, setRentalHistory] = useState<RentalHistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizedAddress = address?.toLowerCase() ?? null;

  const userStats: UserStats = useMemo(() => {
    if (!normalizedAddress) {
      return {
        totalAgentsCreated: 0,
        totalAgentsRented: 0,
        activeRentals: 0,
        totalEarnings: 0,
        totalSpent: 0,
        monthlyEarnings: 0,
        monthlySpent: 0,
      } satisfies UserStats;
    }

    const createdEvents = rentalHistory.filter(
      (event) => event.creator === normalizedAddress
    );
    const rentedEvents = rentalHistory.filter(
      (event) => event.renter === normalizedAddress
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalEarningsWei = createdEvents.reduce<bigint>(
      (sum, event) => sum + event.pricePaidWei,
      0n
    );
    const totalSpentWei = rentedEvents.reduce<bigint>(
      (sum, event) => sum + event.pricePaidWei,
      0n
    );
    const monthlyEarningsWei = createdEvents.reduce<bigint>(
      (sum, event) =>
        event.startedAt >= thirtyDaysAgo ? sum + event.pricePaidWei : sum,
      0n
    );
    const monthlySpentWei = rentedEvents.reduce<bigint>(
      (sum, event) =>
        event.startedAt >= thirtyDaysAgo ? sum + event.pricePaidWei : sum,
      0n
    );

    const totalEarningsEth = Number(formatEther(totalEarningsWei));
    const totalSpentUsd = Number(formatEther(totalSpentWei)) * ETH_TO_USD;
    const monthlyEarningsEth = Number(formatEther(monthlyEarningsWei));
    const monthlySpentUsd = Number(formatEther(monthlySpentWei)) * ETH_TO_USD;

    return {
      totalAgentsCreated: userAgents.length,
      totalAgentsRented: rentedAgents.length,
      activeRentals: activeRentals.length,
      totalEarnings: totalEarningsEth,
      totalSpent: totalSpentUsd,
      monthlyEarnings: monthlyEarningsEth,
      monthlySpent: monthlySpentUsd,
    } satisfies UserStats;
  }, [
    normalizedAddress,
    rentalHistory,
    userAgents.length,
    rentedAgents.length,
    activeRentals.length,
  ]);

  const agentExpenses = useMemo<AgentExpense[]>(() => {
    if (!normalizedAddress) {
      return [];
    }

    const spentEvents = rentalHistory.filter(
      (event) => event.renter === normalizedAddress
    );
    if (spentEvents.length === 0) {
      return [];
    }

    const agentLookup = new Map(
      allAgents.map((agent) => [agent.tokenId, agent])
    );

    const expenseMap = new Map<
      number,
      {
        totalSpentWei: bigint;
        totalDurationSeconds: number;
        rentalsCount: number;
        lastUsed: Date;
      }
    >();

    spentEvents.forEach((event) => {
      const existing = expenseMap.get(event.tokenId) ?? {
        totalSpentWei: 0n,
        totalDurationSeconds: 0,
        rentalsCount: 0,
        lastUsed: event.startedAt,
      };

      const updated = {
        totalSpentWei: existing.totalSpentWei + event.pricePaidWei,
        totalDurationSeconds:
          existing.totalDurationSeconds + event.durationSeconds,
        rentalsCount: existing.rentalsCount + 1,
        lastUsed:
          existing.lastUsed < event.startedAt
            ? event.startedAt
            : existing.lastUsed,
      };

      expenseMap.set(event.tokenId, updated);
    });

    return Array.from(expenseMap.entries())
      .map(([tokenId, data]) => {
        const totalSpentEth = Number(formatEther(data.totalSpentWei));
        const totalSpentUsd = totalSpentEth * ETH_TO_USD;
        const totalHours = data.totalDurationSeconds / 3600;
        const averageCostPerHourUsd =
          totalHours > 0 ? totalSpentUsd / totalHours : 0;
        const agent = agentLookup.get(tokenId);

        return {
          agentId: tokenId,
          agentName: agent?.name ?? `Agent #${tokenId}`,
          totalSpentEth,
          totalSpentUsd,
          totalDurationHours: totalHours,
          rentalsCount: data.rentalsCount,
          lastUsed: data.lastUsed,
          averageCostPerHourUsd,
        } satisfies AgentExpense;
      })
      .sort((a, b) => b.totalSpentUsd - a.totalSpentUsd);
  }, [normalizedAddress, rentalHistory, allAgents]);

  const createdUsageData = useMemo(() => {
    if (!normalizedAddress) {
      return buildUsageSeries([]);
    }
    const events = rentalHistory.filter(
      (event) => event.creator === normalizedAddress
    );
    return buildUsageSeries(events);
  }, [normalizedAddress, rentalHistory]);

  const rentedUsageData = useMemo(() => {
    if (!normalizedAddress) {
      return buildUsageSeries([]);
    }
    const events = rentalHistory.filter(
      (event) => event.renter === normalizedAddress
    );
    return buildUsageSeries(events);
  }, [normalizedAddress, rentalHistory]);

  const createdUsageSummary = useMemo(() => {
    const totalRentals = createdUsageData.reduce(
      (sum, point) => sum + point.rentals,
      0
    );
    const averagePerDay =
      createdUsageData.length > 0 ? totalRentals / createdUsageData.length : 0;
    return {
      totalRentals,
      averagePerDay,
    };
  }, [createdUsageData]);

  const rentedUsageSummary = useMemo(() => {
    const totalRentals = rentedUsageData.reduce(
      (sum, point) => sum + point.rentals,
      0
    );
    const averagePerDay =
      rentedUsageData.length > 0 ? totalRentals / rentedUsageData.length : 0;
    return {
      totalRentals,
      averagePerDay,
    };
  }, [rentedUsageData]);

  useEffect(() => {
    if (!address) return;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const addressLower = address.toLowerCase();

        const [fetchedAgents, rentalEvents] = await Promise.all([
          fetchAgents(),
          fetchRentalHistory(),
        ]);

        setAllAgents(fetchedAgents);
        setRentalHistory(rentalEvents);

        // Filter agents created by user
        const createdByUser = fetchedAgents.filter(
          (agent) => agent.creator.toLowerCase() === addressLower
        );
        setUserAgents(createdByUser);

        const rentalChecks = await Promise.all(
          fetchedAgents.map(async (agent) => {
            try {
              const rental = await fetchActiveRental(agent.tokenId);
              if (rental && rental.renter === addressLower) {
                return { agent, rental };
              }
            } catch (err) {
              console.warn(
                `Failed to check rental for agent ${agent.tokenId}:`,
                err
              );
            }
            return null;
          })
        );

        const activePairs = rentalChecks.filter(
          (item): item is { agent: AgentData; rental: ActiveRental } =>
            item !== null
        );
        setRentedAgents(activePairs.map((item) => item.agent));
        setActiveRentals(activePairs.map((item) => item.rental));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError(
          "Failed to load dashboard data. Please ensure you're connected to the network."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [address]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      toast({
        title: "Connection failed",
        description: "Please ensure MetaMask is installed and unlocked.",
        variant: "destructive",
      });
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-background">
        <HomeHeader />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8">
              <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
              <p className="text-muted-foreground">
                Connect your wallet to view your agent dashboard and manage your
                AI agents.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              size="lg"
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <HomeHeader />
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <HomeHeader />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="text-destructive mb-4">{error}</div>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your AI agents and track your activity
            </p>
          </div>
          <Button asChild>
            <Link href="/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Wallet Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance
                  ? `${Number(formatEther(balance)).toFixed(4)} ETH`
                  : "0.0000 ETH"}
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ $
                {balance
                  ? (Number(formatEther(balance)) * 2500).toFixed(2)
                  : "0.00"}{" "}
                USD
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Earnings
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats.totalEarnings.toFixed(4)} ETH
              </div>
              <p className="text-xs text-green-600">
                +{userStats.monthlyEarnings.toFixed(4)} ETH this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${userStats.totalSpent.toFixed(2)}
              </div>
              <p className="text-xs text-red-600">
                +${userStats.monthlySpent.toFixed(2)} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Rentals
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats.activeRentals}
              </div>
              <p className="text-xs text-muted-foreground">
                {userStats.totalAgentsRented} total rented
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <Card>
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Created Agents Usage</CardTitle>
                <CardDescription>
                  {createdUsageSummary.totalRentals} rentals in the last{" "}
                  {USAGE_WINDOW_DAYS} days
                </CardDescription>
              </div>
              <Badge variant="outline">
                Avg {createdUsageSummary.averagePerDay.toFixed(1)} / day
              </Badge>
            </CardHeader>
            <CardContent>
              <UsageChart data={createdUsageData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Rented Agents Usage</CardTitle>
                <CardDescription>
                  {rentedUsageSummary.totalRentals} rentals in the last{" "}
                  {USAGE_WINDOW_DAYS} days
                </CardDescription>
              </div>
              <Badge variant="outline">
                Avg {rentedUsageSummary.averagePerDay.toFixed(1)} / day
              </Badge>
            </CardHeader>
            <CardContent>
              <UsageChart data={rentedUsageData} />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="my-agents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-agents">
              My Agents ({userStats.totalAgentsCreated})
            </TabsTrigger>
            <TabsTrigger value="rented-agents">
              Rented Agents ({userStats.totalAgentsRented})
            </TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="my-agents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Agents You Created</h2>
              <Button variant="outline" asChild>
                <Link href="/marketplace">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View in Marketplace
                </Link>
              </Button>
            </div>

            {userAgents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No agents created yet
                  </h3>
                  <p className="text-muted-foreground mb-4 text-center">
                    Create your first AI agent and start earning from rentals
                  </p>
                  <Button asChild>
                    <Link href="/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Agent
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userAgents.map((agent) => (
                  <Card
                    key={agent.tokenId}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            {agent.avatar.startsWith("http") ||
                            agent.avatar.startsWith("data:") ? (
                              <AvatarImage
                                src={agent.avatar}
                                alt={agent.name}
                              />
                            ) : (
                              <AvatarFallback>{agent.avatar}</AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {agent.name}
                            </CardTitle>
                            <Badge variant="secondary">{agent.category}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {typeof agent.hourlyRateEth === "number"
                              ? agent.hourlyRateEth.toFixed(4)
                              : "0.0000"}{" "}
                            ETH/h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {typeof agent.totalRentals === "number"
                              ? agent.totalRentals
                              : 0}{" "}
                            rentals
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {agent.shortDescription}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{agent.tools.length} tools</span>
                          <span>
                            ⭐{" "}
                            {typeof agent.rating === "number"
                              ? agent.rating.toFixed(1)
                              : "0.0"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/agent/${agent.tokenId}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rented-agents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Agents You're Renting</h2>
              <Button variant="outline" asChild>
                <Link href="/marketplace">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Browse More Agents
                </Link>
              </Button>
            </div>

            {rentedAgents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No active rentals
                  </h3>
                  <p className="text-muted-foreground mb-4 text-center">
                    Rent AI agents from the marketplace to get started
                  </p>
                  <Button asChild>
                    <Link href="/marketplace">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rentedAgents.map((agent, index) => {
                  const rental = activeRentals[index];
                  const timeRemaining = rental
                    ? Number(
                        rental.expiresAt - BigInt(Math.floor(Date.now() / 1000))
                      )
                    : 0;
                  const hoursRemaining = Math.max(
                    0,
                    Math.floor(timeRemaining / 3600)
                  );
                  const minutesRemaining = Math.max(
                    0,
                    Math.floor((timeRemaining % 3600) / 60)
                  );

                  return (
                    <Card
                      key={agent.tokenId}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              {agent.avatar.startsWith("http") ||
                              agent.avatar.startsWith("data:") ? (
                                <AvatarImage
                                  src={agent.avatar}
                                  alt={agent.name}
                                />
                              ) : (
                                <AvatarFallback>{agent.avatar}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">
                                {agent.name}
                              </CardTitle>
                              <Badge variant="secondary">
                                {agent.category}
                              </Badge>
                            </div>
                          </div>
                          <Badge
                            variant={
                              timeRemaining > 0 ? "default" : "destructive"
                            }
                          >
                            {timeRemaining > 0
                              ? `${hoursRemaining}h ${minutesRemaining}m left`
                              : "Expired"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {agent.shortDescription}
                        </p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{agent.tools.length} tools</span>
                            <span>
                              ⭐{" "}
                              {typeof agent.rating === "number"
                                ? agent.rating.toFixed(1)
                                : "0.0"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/chat/${agent.tokenId}`}>Chat</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">API Usage & Expenses</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {agentExpenses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <PieChart className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-4 text-center">
                    Start using rented agents to see your API usage and costs
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {agentExpenses.map((expense) => (
                  <Card key={expense.agentId}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback>🤖</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{expense.agentName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Last used {expense.lastUsed.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${expense.totalSpentUsd.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ≈ {expense.totalSpentEth.toFixed(4)} ETH
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total time rented
                          </span>
                          <span>
                            {expense.totalDurationHours.toFixed(1)} hours
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-muted-foreground">
                            Avg cost per hour
                          </span>
                          <span>
                            ${expense.averageCostPerHourUsd.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-muted-foreground">
                            Rentals completed
                          </span>
                          <span>{expense.rentalsCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
