"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowRight, ExternalLink, Info } from "lucide-react"
import type { AgentData } from "@/app/create/page"
import { realTools, toolCategories, getToolsByCategory, getRequiredApiKeys } from "@/lib/real-tools"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ToolsStepProps {
  data: AgentData
  onUpdate: (updates: Partial<AgentData>) => void
  onNext: () => void
}

export function ToolsStep({ data, onUpdate, onNext }: ToolsStepProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Tools")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTools = getToolsByCategory(selectedCategory).filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleToolToggle = (toolId: string) => {
    const newTools = data.tools.includes(toolId)
      ? data.tools.filter((t) => t !== toolId)
      : [...data.tools, toolId]
    onUpdate({ tools: newTools })
  }

  const canProceed = data.tools.length > 0
  const requiredApiKeys = getRequiredApiKeys(data.tools)

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
              {data.tools.map((toolId) => {
                const tool = realTools.find(t => t.id === toolId)
                return (
                  <Badge key={toolId} variant="default" className="px-3 py-1">
                    {tool?.name || toolId}
                    <button onClick={() => handleToolToggle(toolId)} className="ml-2 hover:text-destructive">
                      ×
                    </button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* API Key Requirements */}
        {requiredApiKeys.length > 0 && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="font-medium">API Keys Required</h3>
            </div>
            <div className="space-y-2">
              {requiredApiKeys.map((req) => (
                <div key={req.provider} className="text-sm">
                  <span className="font-medium">{req.provider}:</span>{" "}
                  <a
                    href={req.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Get API key <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="text-xs text-muted-foreground ml-2">
                    Required for: {req.tools.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {filteredTools.map((tool) => (
            <TooltipProvider key={tool.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      data.tools.includes(tool.id) ? "ring-2 ring-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleToolToggle(tool.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <span className="text-2xl">{tool.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                            {tool.type === 'api' && (
                              <Badge variant="outline" className="text-xs">API</Badge>
                            )}
                            {tool.type === 'mcp' && (
                              <Badge variant="outline" className="text-xs">MCP</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{tool.category}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                          {tool.pricing && (
                            <p className="text-xs text-green-600 mt-1">{tool.pricing}</p>
                          )}
                        </div>
                        {data.tools.includes(tool.id) && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-sm">{tool.description}</p>
                    {tool.pricing && (
                      <p className="text-sm text-green-600">{tool.pricing}</p>
                    )}
                    {tool.rateLimit && (
                      <p className="text-sm text-orange-600">Rate limit: {tool.rateLimit}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
