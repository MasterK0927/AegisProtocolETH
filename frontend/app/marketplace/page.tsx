import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Star, TrendingUp } from "lucide-react"
import Link from "next/link"

const categories = [
  "All Categories",
  "Writing",
  "Research",
  "Data Analysis",
  "Customer Support",
  "Content Creation",
  "Programming",
  "Marketing",
]

const agents = [
  {
    id: 1,
    name: "Research Assistant Pro",
    shortDescription: "Advanced research with academic databases",
    description: "Advanced research agent with access to academic databases and web scraping capabilities.",
    creator: "0x1234...5678",
    rating: 4.9,
    reviews: 234,
    hourlyRate: 0.05,
    category: "Research",
    avatar: "🔬",
    trending: true,
    usage: "+45% this week",
    tools: ["Web Search", "PDF Analysis", "Data Export"],
  },
  {
    id: 2,
    name: "Content Writer Elite",
    shortDescription: "Professional content creation specialist",
    description: "Professional content creation agent specializing in blog posts, articles, and marketing copy.",
    creator: "0x8765...4321",
    rating: 4.8,
    reviews: 189,
    hourlyRate: 0.08,
    category: "Writing",
    avatar: "✍️",
    trending: false,
    usage: "+12% this week",
    tools: ["Grammar Check", "SEO Optimization", "Plagiarism Check"],
  },
  {
    id: 3,
    name: "Data Analyst Bot",
    shortDescription: "Powerful data analysis with Python & SQL",
    description: "Powerful data analysis agent with Python, R, and SQL capabilities for complex datasets.",
    creator: "0x9876...1234",
    rating: 4.7,
    reviews: 156,
    hourlyRate: 0.12,
    category: "Data Analysis",
    avatar: "📊",
    trending: true,
    usage: "+67% this week",
    tools: ["Python", "SQL", "Data Visualization"],
  },
  {
    id: 4,
    name: "Customer Support AI",
    shortDescription: "24/7 multilingual customer support",
    description: "24/7 customer support agent with multilingual capabilities and CRM integration.",
    creator: "0x5432...8765",
    rating: 4.6,
    reviews: 298,
    hourlyRate: 0.04,
    category: "Customer Support",
    avatar: "🎧",
    trending: false,
    usage: "+8% this week",
    tools: ["Live Chat", "Email Support", "CRM Integration"],
  },
]

export default function MarketplacePage() {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">AI Agent Marketplace</h1>
          <p className="text-muted-foreground text-lg">Discover and rent powerful AI agents for your projects</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search agents..." className="pl-10 h-12 text-lg" />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === "All Categories" ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Trending Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Trending This Week</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="text-3xl mb-2">{agent.avatar}</div>
                    {agent.trending && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Trending
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription className="text-sm">{agent.shortDescription}</CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">By {agent.creator}</span>
                    <Badge variant="outline">{agent.category}</Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{agent.rating}</span>
                    <span className="text-muted-foreground">({agent.reviews})</span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-medium">Available Tools:</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.tools.slice(0, 3).map((tool) => (
                        <Badge key={tool} variant="outline" className="text-xs px-2 py-0.5">
                          {tool}
                        </Badge>
                      ))}
                      {agent.tools.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          +{agent.tools.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>{agent.usage}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-2xl font-bold text-foreground">{agent.hourlyRate}</span>
                      <span className="text-sm text-muted-foreground ml-1">ETH/hr</span>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/agent/${agent.id}`}>Explore</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
