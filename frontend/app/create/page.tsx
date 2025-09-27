"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import HomeHeader from "@/components/home-header";
import { DescriptionStep } from "@/components/create-steps/description-step";
import { LLMStep } from "@/components/create-steps/llm-step";
import { ContextStep } from "@/components/create-steps/context-step";
import { ToolsStep } from "@/components/create-steps/tools-step";
import { ReviewStep } from "@/components/create-steps/review-step";

const steps = [
  {
    id: 1,
    title: "Describe your agent's job",
    description: "Define what your agent should do",
  },
  {
    id: 2,
    title: "Configure AI Model",
    description: "Select LLM provider and model",
  },
  {
    id: 3,
    title: "What should your agent know?",
    description: "Add context and knowledge",
  },
  {
    id: 4,
    title: "What tools will your agent need?",
    description: "Select capabilities and integrations",
  },
  { id: 5, title: "Review and deploy", description: "Finalize your agent" },
];

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentData {
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  outputs: string[];
  context: string;
  files: File[];
  tools: string[];
  hourlyRate: number;
  llmConfig: LLMConfig;
}

export default function CreateAgentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [agentData, setAgentData] = useState<AgentData>({
    name: "",
    description: "",
    shortDescription: "",
    category: "",
    outputs: [],
    context: "",
    files: [],
    tools: [],
    hourlyRate: 0.05,
    llmConfig: {
      provider: "",
      model: "",
      apiKey: "",
      temperature: 0.7,
      maxTokens: 2000,
    },
  });

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateAgentData = (updates: Partial<AgentData>) => {
    setAgentData((prev) => ({ ...prev, ...updates }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <DescriptionStep
            data={agentData}
            onUpdate={updateAgentData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <LLMStep
            data={agentData}
            onUpdate={updateAgentData}
            onNext={handleNext}
          />
        );
      case 3:
        return (
          <ContextStep
            data={agentData}
            onUpdate={updateAgentData}
            onNext={handleNext}
          />
        );
      case 4:
        return (
          <ToolsStep
            data={agentData}
            onUpdate={updateAgentData}
            onNext={handleNext}
          />
        );
      case 5:
        return <ReviewStep data={agentData} onUpdate={updateAgentData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/marketplace">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>

            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {steps[currentStep - 1].title}
              </h1>
              <p className="text-muted-foreground text-lg">
                {steps[currentStep - 1].description}
              </p>
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>
                  Step {currentStep} of {steps.length}
                </span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Character Illustration */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto bg-muted rounded-2xl flex items-center justify-center overflow-hidden">
                      <img
                        src="/images/agent-character.png"
                        alt="Agent Character"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground italic">
                        {currentStep === 1 &&
                          "What job should I handle for you? Be as specific as you'd be with any new hire to set me up for success."}
                        {currentStep === 2 &&
                          "I need a brain to think with! Choose the AI model that will power my intelligence and provide your API key."}
                        {currentStep === 3 &&
                          "I'm smart, but more context always helps! Help me understand your unique processes and requirements."}
                        {currentStep === 4 &&
                          "Just like you need the right tools for your job, so do I. Connect me to the apps you use daily so I can perform tasks for you."}
                        {currentStep === 5 &&
                          "Ready to deploy! Let's review everything and get your agent live on the marketplace."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">{renderStep()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
