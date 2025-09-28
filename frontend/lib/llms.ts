export type LLMModelOption = {
  id: string;
  name: string;
  description: string;
};

export type LLMProviderConfig = {
  id: string;
  name: string;
  logo: string;
  apiKeyUrl: string;
  models: LLMModelOption[];
};

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "🤖",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "Most capable model" },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "Fast and efficient",
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "High performance",
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Cost effective",
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "🧠",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        description: "Most intelligent model",
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        description: "Fast and lightweight",
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "Most powerful model",
      },
    ],
  },
  {
    id: "google",
    name: "Google",
    logo: "🔍",
    apiKeyUrl: "https://makersuite.google.com/app/apikey",
    models: [
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "Advanced reasoning",
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        description: "Fast responses",
      },
      {
        id: "gemini-pro",
        name: "Gemini Pro",
        description: "Balanced performance",
      },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    logo: "🌪️",
    apiKeyUrl: "https://console.mistral.ai/api-keys/",
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        description: "Most capable",
      },
      {
        id: "mistral-medium-latest",
        name: "Mistral Medium",
        description: "Balanced",
      },
      {
        id: "mistral-small-latest",
        name: "Mistral Small",
        description: "Efficient",
      },
    ],
  },
];

export function getLLMProvider(providerId: string | undefined | null) {
  if (!providerId) {
    return undefined;
  }
  return LLM_PROVIDERS.find((provider) => provider.id === providerId);
}
