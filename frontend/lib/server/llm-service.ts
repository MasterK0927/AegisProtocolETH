export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMRequest = {
  provider: string;
  model?: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  messages: ChatCompletionMessage[];
};

export type LLMResponse = {
  reply: string;
  provider: string;
  model: string;
  raw?: unknown;
};

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 800;

function normalizeMessages(messages: ChatCompletionMessage[]) {
  const systemParts: string[] = [];
  const conversation: ChatCompletionMessage[] = [];

  messages.forEach((message) => {
    if (message.role === "system") {
      if (message.content.trim()) {
        systemParts.push(message.content.trim());
      }
      return;
    }

    conversation.push({
      role: message.role,
      content: message.content,
    });
  });

  return {
    systemPrompt: systemParts.join("\n\n").trim() || undefined,
    conversation,
  } as const;
}

async function callOpenAI(request: LLMRequest): Promise<LLMResponse> {
  const model = request.model ?? "gpt-4o";
  const { systemPrompt, conversation } = normalizeMessages(request.messages);
  const payloadMessages = conversation;

  if (systemPrompt) {
    payloadMessages.unshift({
      role: "system",
      content: systemPrompt,
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: payloadMessages,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${errorBody.slice(0, 500)}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { role?: string; content?: string } }>;
  };

  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("OpenAI response did not include a completion message");
  }

  return {
    reply,
    provider: "openai",
    model,
    raw: data,
  } satisfies LLMResponse;
}

async function callAnthropic(request: LLMRequest): Promise<LLMResponse> {
  const model = request.model ?? "claude-3-5-sonnet-20241022";
  const { systemPrompt, conversation } = normalizeMessages(request.messages);

  const messages = conversation.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: [
      {
        type: "text",
        text: message.content,
      },
    ],
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": request.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: request.temperature ?? DEFAULT_TEMPERATURE,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Anthropic request failed (${response.status}): ${errorBody.slice(
        0,
        500
      )}`
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };

  const reply = data.content?.[0]?.text;
  if (!reply) {
    throw new Error("Anthropic response did not include a completion");
  }

  return {
    reply,
    provider: "anthropic",
    model,
    raw: data,
  } satisfies LLMResponse;
}

export async function generateChatCompletion(
  request: LLMRequest
): Promise<LLMResponse> {
  const provider = request.provider.toLowerCase();

  if (!request.apiKey.trim()) {
    throw new Error("LLM API key is required");
  }

  switch (provider) {
    case "openai":
      return callOpenAI(request);
    case "anthropic":
      return callAnthropic(request);
    default:
      throw new Error(`LLM provider '${provider}' is not supported yet`);
  }
}
