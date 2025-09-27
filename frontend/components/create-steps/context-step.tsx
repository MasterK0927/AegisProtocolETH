"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Upload, FileText, Globe } from "lucide-react"
import type { AgentData } from "@/app/create/page"

interface ContextStepProps {
  data: AgentData
  onUpdate: (updates: Partial<AgentData>) => void
  onNext: () => void
}

export function ContextStep({ data, onUpdate, onNext }: ContextStepProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files)
      onUpdate({ files: [...data.files, ...newFiles] })
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      onUpdate({ files: [...data.files, ...newFiles] })
    }
  }

  const removeFile = (index: number) => {
    const newFiles = data.files.filter((_, i) => i !== index)
    onUpdate({ files: newFiles })
  }

  const canProceed = data.context.trim() || data.files.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share anything about your company, role, or work processes</CardTitle>
        <CardDescription>Help your agent understand your unique context and requirements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drag & drop or choose files to upload</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: .csv, .json, .pdf, .xlsx, .xls, .txt, .md, .docx, .pptx
            </p>
            <p className="text-xs text-muted-foreground mb-4">Max 5 files per upload</p>

            <input
              type="file"
              multiple
              accept=".csv,.json,.pdf,.xlsx,.xls,.txt,.md,.docx,.pptx"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline">
              <label htmlFor="file-upload" className="cursor-pointer">
                choose files
              </label>
            </Button>
          </div>

          {/* Uploaded Files */}
          {data.files.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files</Label>
              <div className="space-y-2">
                {data.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-muted-foreground">or</div>

        {/* Alternative Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
            <Globe className="w-6 h-6" />
            <span>Import website</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
            <FileText className="w-6 h-6" />
            <span>Markdown/Text</span>
          </Button>
        </div>

        {/* Text Context */}
        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (Optional)</Label>
          <Textarea
            id="context"
            placeholder="Share any additional information about your processes, requirements, or specific knowledge your agent should have..."
            className="min-h-32"
            value={data.context}
            onChange={(e) => onUpdate({ context: e.target.value })}
          />
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" size="lg" onClick={onNext}>
            Skip this step
          </Button>
          <Button onClick={onNext} disabled={!canProceed} size="lg">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
