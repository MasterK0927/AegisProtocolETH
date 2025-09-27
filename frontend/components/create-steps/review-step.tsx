"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Rocket } from "lucide-react"
import type { AgentData } from "@/app/create/page"

interface ReviewStepProps {
  data: AgentData
  onUpdate: (updates: Partial<AgentData>) => void
}

export function ReviewStep({ data, onUpdate }: ReviewStepProps) {
  const handleDeploy = () => {
    // In real app, this would deploy to blockchain and create the agent
    alert(`Agent "${data.name}" deployed successfully! Redirecting to marketplace...`)
    window.location.href = "/marketplace"
  }

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
            <p className="text-sm text-muted-foreground mt-2">{data.description}</p>
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

      {/* Context & Knowledge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Context & Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.context && (
            <div>
              <Label className="text-sm font-medium">Additional Context</Label>
              <p className="text-sm text-muted-foreground mt-1">{data.context}</p>
            </div>
          )}

          {data.files.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Uploaded Files ({data.files.length})</Label>
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
          <CardTitle className="text-lg">Tools & Capabilities ({data.tools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.tools.map((tool) => (
              <Badge key={tool} variant="outline">
                {tool}
              </Badge>
            ))}
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
                onChange={(e) => onUpdate({ hourlyRate: Number.parseFloat(e.target.value) || 0.05 })}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Platform fee: 2.5%</div>
              <div>You earn: {(data.hourlyRate * 0.975).toFixed(4)} ETH/hour</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deploy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ready to Deploy</CardTitle>
          <CardDescription>Your agent will be deployed to the blockchain and listed on the marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">What happens next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Agent deployed to blockchain (requires wallet signature)</li>
                <li>• Listed on Aegis Protocol marketplace</li>
                <li>• Available for rental by other users</li>
                <li>• You earn ETH from each rental</li>
              </ul>
            </div>

            <Button onClick={handleDeploy} size="lg" className="w-full">
              <Rocket className="w-4 h-4 mr-2" />
              Deploy Agent to Marketplace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
