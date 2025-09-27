import { NextRequest, NextResponse } from "next/server";
import { settlePayment } from "thirdweb/x402";

import { fetchAgent } from "@/lib/agents";
import {
  getPaymentChain,
  getThirdwebFacilitator,
} from "@/lib/thirdweb/facilitator";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { agent: string } }
) {
  const agentId = Number.parseInt(params.agent, 10);
  if (Number.isNaN(agentId)) {
    return NextResponse.json({ error: "Invalid agent id." }, { status: 400 });
  }

  const agent = await fetchAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !("messages" in body)) {
    return NextResponse.json(
      { error: "Missing messages array." },
      { status: 400 }
    );
  }

  const messages = (body as { messages: ChatMessage[] }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided." },
      { status: 400 }
    );
  }

  const facilitator = getThirdwebFacilitator();

  const paymentResult = await settlePayment({
    resourceUrl: request.url,
    method: "POST",
    paymentData: request.headers.get("x-payment"),
    payTo: facilitator.address as `0x${string}`,
    network: getPaymentChain(),
    price: agent.pricing.priceMoney,
    facilitator,
    routeConfig: {
      description: `Paid chat session with ${agent.name}`,
      mimeType: "application/json",
      maxTimeoutSeconds: 120,
    },
  });

  if (paymentResult.status !== 200) {
    return NextResponse.json(paymentResult.responseBody, {
      status: paymentResult.status,
      headers: paymentResult.responseHeaders,
    });
  }

  if (agent.llmConfig.provider !== "openai") {
    return NextResponse.json(
      {
        error: `LLM provider ${agent.llmConfig.provider} is not supported yet.`,
      },
      { status: 501 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  const llmMessages = [
    {
      role: "system",
      content: agent.systemPrompt,
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: agent.llmConfig.model,
      messages: llmMessages,
      temperature: agent.llmConfig.temperature ?? 0.7,
      max_tokens: agent.llmConfig.maxTokens ?? 1200,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    return NextResponse.json(
      {
        error:
          errorPayload?.error?.message ??
          `OpenAI request failed with status ${response.status}`,
      },
      {
        status: 500,
        headers: paymentResult.responseHeaders,
      }
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const assistantContent =
    data.choices?.[0]?.message?.content ??
    "I'm sorry, but I couldn't generate a response just now.";

  const nextResponse = NextResponse.json(
    {
      message: {
        role: "assistant",
        content: assistantContent,
      },
    },
    {
      status: 200,
    }
  );

  Object.entries(paymentResult.responseHeaders).forEach(([key, value]) => {
    nextResponse.headers.set(key, value);
  });

  return nextResponse;
}
