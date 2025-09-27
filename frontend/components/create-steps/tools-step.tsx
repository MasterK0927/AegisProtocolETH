"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowRight } from "lucide-react"
import type { AgentData } from "@/app/create/page"

const toolCategories = [
  "Trending",
  "All tools",
  "Communications",
  "CRM",
  "Calendar",
  "Data scraper",
  "Analytics",
  "File Processing",
]

const availableTools = [
  { name: "Analyze CSV Data", icon: "📊", category: "Analytics", logo: "/csv-analytics-icon.jpg" },
  {
    name: "Extract Company Insights from Website",
    icon: "🏢",
    category: "Data scraper",
    logo: "/company-insights-icon.jpg",
  },
  { name: "Extract Data from PDF", icon: "📄", category: "File Processing", logo: "/pdf-icon.png" },
  { name: "Extract Webpage Content", icon: "🔧", category: "Data scraper", logo: "/web-scraper-icon.png" },
  { name: "Extract and Summarize LinkedIn Profile", icon: "💼", category: "CRM", logo: "/linkedin-icon.png" },
  {
    name: "Extract and Summarize Website Content",
    icon: "🌐",
    category: "Data scraper",
    logo: "/website-content-icon.jpg",
  },
  { name: "Generate Image", icon: "🎨", category: "All tools", logo: "/image-generation-icon.jpg" },
  { name: "Get Company Profile from LinkedIn", icon: "💼", category: "CRM", logo: "/linkedin-company-icon.jpg" },
  { name: "Get Email Content from Gmail", icon: "📧", category: "Communications", logo: "/gmail-icon.png" },
  { name: "Get Personal Profile from LinkedIn", icon: "👤", category: "CRM", logo: "/linkedin-profile-icon.jpg" },
  { name: "Get Recent Posts from LinkedIn", icon: "📱", category: "Communications", logo: "/linkedin-posts-icon.jpg" },
  {
    name: "Google Search, Scrape and Summarise",
    icon: "🔍",
    category: "Data scraper",
    logo: "/google-search-icon.png",
  },
]

interface ToolsStepProps {
  data: AgentData
  onUpdate: (updates: Partial<AgentData>) => void
  onNext: () => void
}

export function ToolsStep({ data, onUpdate, onNext }: ToolsStepProps) {
  const [selectedCategory, setSelectedCategory] = useState("Trending")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTools = availableTools.filter((tool) => {
    const matchesCategory =
      selectedCategory === "All tools" || selectedCategory === "Trending" || tool.category === selectedCategory
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleToolToggle = (toolName: string) => {
    const newTools = data.tools.includes(toolName)
      ? data.tools.filter((t) => t !== toolName)
      : [...data.tools, toolName]
    onUpdate({ tools: newTools })
  }

  const canProceed = data.tools.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tools enable your agent to perform tasks inside the apps you use daily</CardTitle>
        <CardDescription>Select the tools and integrations your agent will need</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search for 1000+ tools..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {toolCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Selected Tools */}
        {data.tools.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Selected Tools ({data.tools.length})</h3>
            <div className="flex flex-wrap gap-2">
              {data.tools.map((tool) => (
                <Badge key={tool} variant="default" className="px-3 py-1">
                  {tool}
                  <button onClick={() => handleToolToggle(tool)} className="ml-2 hover:text-destructive">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredTools.map((tool) => (
            <Card
              key={tool.name}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                data.tools.includes(tool.name) ? "ring-2 ring-primary bg-primary/5" : ""
              }`}
              onClick={() => handleToolToggle(tool.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={tool.logo || "/placeholder.svg"}
                      alt={`${tool.name} logo`}
                      className="w-8 h-8 rounded object-cover"
                      onError={(e) => {
                        // Fallback to emoji if image fails to load
                        e.currentTarget.style.display = "none"
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = "block"
                      }}
                    />
                    <span className="text-2xl hidden">{tool.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                    <p className="text-xs text-muted-foreground">{tool.category}</p>
                  </div>
                  {data.tools.includes(tool.name) && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={onNext} disabled={!canProceed} size="lg">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
