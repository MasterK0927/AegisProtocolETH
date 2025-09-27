"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, TrendingUp, Clock, Users, Zap, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { RentalModal } from "@/components/rental-modal"
import { UsageChart } from "@/components/usage-chart"

// Mock data - in real app this would come from API
const agentData = {
  1: {
    id: 1,
    name: "Research Assistant Pro",
    description:
      "Advanced research agent with access to academic databases and web scraping capabilities. This agent can help you gather information from multiple sources, analyze research papers, and provide comprehensive summaries.",
    creator: "0x1234...5678",
    creatorName: "Dr. Sarah Chen",
    rating: 4.9,
    reviews: 234,
    hourlyRate: 0.05,
    category: "Research",
    avatar: "🔬",
    totalRentals: 1247,
    activeRentals: 23,
    capabilities: [
      "Academic database access",
      "Web scraping",
      "Data analysis",
      "Report generation",
      "Citation formatting",
    ],
    tools: [
      { name: "Google Scholar API", icon: "🎓" },
      { name: "PubMed Access", icon: "🏥" },
      { name: "Web Scraper", icon: "🕷️" },
      { name: "PDF Parser", icon: "📄" },
      { name: "Citation Manager", icon: "📚" },
    ],
    usageData: [
      { date: "2024-01-01", rentals: 45 },
      { date: "2024-01-02", rentals: 52 },
      { date: "2024-01-03", rentals: 38 },
      { date: "2024-01-04", rentals: 61 },
      { date: "2024-01-05", rentals: 47 },
      { date: "2024-01-06", rentals: 55 },
      { date: "2024-01-07", rentals: 63 },
    ],
  },
}

export default function AgentPage({ params }: { params: { id: string } }) {
  const [showRentalModal, setShowRentalModal] = useState(false)
  const agent = agentData[Number.parseInt(params.id) as keyof typeof agentData]

  if (!agent) {
    return <div>Agent not found</div>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">Æ</span>
            </div>
            <span className="text-xl font-bold text-foreground">Aegis Protocol</span>
          </Link>
        </div>

        <div className="flex items-center space-x-6">
          <Link href="/marketplace" className="text-foreground font-medium">
            Marketplace
          </Link>
          <Link href="/create" className="text-muted-foreground hover:text-foreground transition-colors">
            Create
          </Link>
          <Button variant="outline" size="sm">
            Connect Wallet
          </Button>
        </div>
      </nav>

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
                  <div className="text-6xl">{agent.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-3xl">{agent.name}</CardTitle>
                      <Badge variant="secondary">{agent.category}</Badge>
                    </div>
                    <CardDescription className="text-base mb-4">{agent.description}</CardDescription>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">SC</AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">Created by {agent.creatorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{agent.rating}</span>
                        <span className="text-muted-foreground">({agent.reviews} reviews)</span>
                      </div>
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
                      Downloads last month
                    </CardTitle>
                    <div className="text-2xl font-bold text-primary mt-1">4,752</div>
                  </div>
                  <div className="w-32 h-16">
                    <UsageChart data={agent.usageData} compact />
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
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
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
                  {agent.tools.map((tool, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="text-2xl">{tool.icon}</div>
                      <span className="text-sm font-medium">{tool.name}</span>
                    </div>
                  ))}
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
                  <div className="text-4xl font-bold text-foreground">{agent.hourlyRate}</div>
                  <div className="text-muted-foreground">ETH per hour</div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Minimum rental:</span>
                    <span className="font-medium">1 hour</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Response time:</span>
                    <span className="font-medium">&lt; 30 seconds</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Availability:</span>
                    <span className="font-medium text-green-500">24/7</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={() => setShowRentalModal(true)}>
                  <Clock className="w-4 h-4 mr-2" />
                  Rent Now
                </Button>

                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{agent.activeRentals} people are using this agent</span>
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
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{agent.creatorName}</div>
                    <div className="text-sm text-muted-foreground">{agent.creator}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI researcher and developer with 10+ years of experience in machine learning and natural language
                  processing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <RentalModal isOpen={showRentalModal} onClose={() => setShowRentalModal(false)} agent={agent} />
    </div>
  )
}
