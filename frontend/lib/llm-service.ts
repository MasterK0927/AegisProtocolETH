"use client";

import type { AgentData } from "@/lib/agents";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class LLMService {
  private apiKeys: Record<string, string>;

  constructor(apiKeys: Record<string, string>) {
    this.apiKeys = apiKeys;
  }

  async callLLM(
    messages: LLMMessage[],
    config: LLMConfig,
    agent: AgentData
  ): Promise<LLMResponse> {
    const { provider, model, temperature = 0.7, maxTokens = 2000 } = config;

    // Get the appropriate API key for the provider
    const apiKey = this.getApiKeyForProvider(provider);
    if (!apiKey) {
      throw new Error(`No API key provided for ${provider}`);
    }

    switch (provider) {
      case "openai":
        return this.callOpenAI(
          messages,
          { model, temperature, maxTokens },
          apiKey,
          agent
        );
      case "anthropic":
        return this.callAnthropic(
          messages,
          { model, temperature, maxTokens },
          apiKey,
          agent
        );
      case "google":
        return this.callGoogle(
          messages,
          { model, temperature, maxTokens },
          apiKey,
          agent
        );
      case "mistral":
        return this.callMistral(
          messages,
          { model, temperature, maxTokens },
          apiKey,
          agent
        );
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private getApiKeyForProvider(provider: string): string | undefined {
    // Map provider names to API key storage keys
    const keyMap: Record<string, string> = {
      openai: "openai",
      anthropic: "anthropic",
      google: "google",
      mistral: "mistral",
    };

    return this.apiKeys[keyMap[provider]];
  }

  private async callOpenAI(
    messages: LLMMessage[],
    config: { model: string; temperature: number; maxTokens: number },
    apiKey: string,
    agent: AgentData
  ): Promise<LLMResponse> {
    const systemMessage = this.buildSystemMessage(agent);
    const allMessages = [systemMessage, ...messages];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: allMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `OpenAI API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "No response generated",
      usage: data.usage,
    };
  }

  private async callAnthropic(
    messages: LLMMessage[],
    config: { model: string; temperature: number; maxTokens: number },
    apiKey: string,
    agent: AgentData
  ): Promise<LLMResponse> {
    const systemMessage = this.buildSystemMessage(agent);

    // Filter out system messages and add system prompt separately
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: systemMessage.content,
        messages: userMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Anthropic API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || "No response generated",
      usage: data.usage,
    };
  }

  private async callGoogle(
    messages: LLMMessage[],
    config: { model: string; temperature: number; maxTokens: number },
    apiKey: string,
    agent: AgentData
  ): Promise<LLMResponse> {
    const systemMessage = this.buildSystemMessage(agent);

    // Convert messages to Gemini format
    const contents = [systemMessage, ...messages].map((m) => ({
      parts: [{ text: m.content }],
      role: m.role === "assistant" ? "model" : "user",
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Google API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content:
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response generated",
      usage: data.usageMetadata,
    };
  }

  private async callMistral(
    messages: LLMMessage[],
    config: { model: string; temperature: number; maxTokens: number },
    apiKey: string,
    agent: AgentData
  ): Promise<LLMResponse> {
    const systemMessage = this.buildSystemMessage(agent);
    const allMessages = [systemMessage, ...messages];

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: allMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        `Mistral API error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "No response generated",
      usage: data.usage,
    };
  }

  private buildSystemMessage(agent: AgentData): LLMMessage {
    const toolsList =
      agent.tools.length > 0
        ? `\nAvailable tools: ${agent.tools.join(", ")}`
        : "";

    const capabilitiesList =
      agent.capabilities.length > 0
        ? `\nCapabilities: ${agent.capabilities.join(", ")}`
        : "";

    const contextInfo = agent.metadata?.aegis?.context
      ? `\nAdditional context: ${agent.metadata.aegis.context}`
      : "";

    return {
      role: "system",
      content: `You are ${
        agent.name
      }, an AI agent specialized in ${agent.category.toLowerCase()}. 

${agent.description}

${agent.shortDescription}${toolsList}${capabilitiesList}${contextInfo}

You are currently being rented by a user who is paying for this interaction. Be helpful, professional, and make good use of your capabilities to assist them effectively.`,
    };
  }
}

// Utility function to create LLM service instance
export function createLLMService(apiKeys: Record<string, string>): LLMService {
  return new LLMService(apiKeys);
}
