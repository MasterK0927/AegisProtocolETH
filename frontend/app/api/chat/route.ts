import { NextResponse } from "next/server";
import { z } from "zod";

import { generateChatCompletion } from "@/lib/server/llm-service";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "Message content is required"),
});

const requestSchema = z.object({
  agent: z
    .object({
      name: z.string().optional(),
      category: z.string().optional(),
      shortDescription: z.string().optional(),
      description: z.string().optional(),
      instructions: z.string().optional(),
      capabilities: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
    })
    .optional(),
  messages: z.array(messageSchema).min(1, "At least one message is required"),
  credentials: z.object({
    provider: z.string().min(1, "LLM provider is required"),
    apiKey: z.string().min(1, "LLM API key is required"),
    model: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
  }),
});

type ChatRequest = z.infer<typeof requestSchema>;

type Persona = NonNullable<ChatRequest["agent"]>;

function buildSystemPrompt(persona?: Persona) {
  if (!persona) {
    return undefined;
  }

  const segments: string[] = [];

  if (persona.name) {
    const category = persona.category ? ` ${persona.category}` : "";
    segments.push(
      `You are ${persona.name}, an${category ? "" : " intelligent"}${
        category ? ` ${category.toLowerCase()}` : ""
      } agent on the Aegis Protocol platform.`
    );
  }

  const summary =
    persona.description?.trim() || persona.shortDescription?.trim();
  if (summary) {
    segments.push(summary);
  }

  if (persona.capabilities?.length) {
    segments.push(
      `Core capabilities: ${persona.capabilities
        .map((capability) => capability.trim())
        .join(", ")}.`
    );
  }

  if (persona.tools?.length) {
    segments.push(
      `Available external tools: ${persona.tools
        .map((tool) => tool.trim())
        .join(
          ", "
        )}. Only reference a tool if it is relevant and you have the necessary credentials.`
    );
  }

  if (persona.instructions?.trim()) {
    segments.push(persona.instructions.trim());
  }

  segments.push(
    "Be concise, helpful, and transparent about any limitations or missing real-world access. Never fabricate tool usage or external data you cannot actually retrieve."
  );

  return segments.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const systemPrompt = buildSystemPrompt(parsed.agent);
    const messages = systemPrompt
      ? ([
          {
            role: "system" as const,
            content: systemPrompt,
          },
          ...parsed.messages,
        ] as ChatRequest["messages"])
      : parsed.messages;

    const response = await generateChatCompletion({
      provider: parsed.credentials.provider,
      apiKey: parsed.credentials.apiKey,
      model: parsed.credentials.model,
      temperature: parsed.credentials.temperature,
      maxTokens: parsed.credentials.maxTokens,
      messages,
    });

    return NextResponse.json({
      reply: response.reply,
      provider: response.provider,
      model: response.model,
    });
  } catch (error) {
    console.error("Failed to generate chat completion", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
