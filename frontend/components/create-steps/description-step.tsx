"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight } from "lucide-react"
import type { AgentData } from "@/app/create/page"

const categories = [
  "Writing",
  "Research & Analysis",
  "Customer Support",
  "Data Analysis",
  "Content Creation",
  "Programming",
  "Marketing",
  "Education",
  "Finance",
  "Other",
]

const outputTypes = [
  "Analyze data",
  "Generate content",
  "Generate leads",
  "Generate reports",
  "App actions",
  "Send messages",
  "Write content",
  "Other",
]

interface DescriptionStepProps {
  data: AgentData
  onUpdate: (updates: Partial<AgentData>) => void
  onNext: () => void
}

export function DescriptionStep({ data, onUpdate, onNext }: DescriptionStepProps) {
  const handleOutputToggle = (output: string) => {
    const newOutputs = data.outputs.includes(output)
      ? data.outputs.filter((o) => o !== output)
      : [...data.outputs, output]
    onUpdate({ outputs: newOutputs })
  }

  const canProceed =
    data.name.trim() &&
    data.description.trim() &&
    data.shortDescription.trim() &&
    data.category &&
    data.outputs.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Describe what you need your agent to do</CardTitle>
        <CardDescription>Be specific about the agent's role and responsibilities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Agent Name</Label>
          <Input
            id="name"
            placeholder="e.g., Research Assistant Pro"
            value={data.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortDescription">Short Description (for marketplace)</Label>
          <Input
            id="shortDescription"
            placeholder="e.g., Advanced research with academic databases"
            value={data.shortDescription}
            onChange={(e) => onUpdate({ shortDescription: e.target.value })}
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            This will be shown on marketplace cards. Keep it concise and descriptive.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description</Label>
          <Textarea
            id="description"
            placeholder="What job should I handle for you? Be as specific as you'd be with any new hire to set me up for success."
            className="min-h-32"
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>

        {/* Category */}
        <div className="space-y-3">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={data.category === category ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdate({ category })}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Output Types */}
        <div className="space-y-3">
          <Label>What output do you need?</Label>
          <div className="flex flex-wrap gap-2">
            {outputTypes.map((output) => (
              <Button
                key={output}
                variant={data.outputs.includes(output) ? "default" : "outline"}
                size="sm"
                onClick={() => handleOutputToggle(output)}
              >
                {output}
              </Button>
            ))}
          </div>
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
