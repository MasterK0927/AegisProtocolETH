export type AgentUsagePoint = {
  date: string;
  rentals: number;
};

export type AgentPricing = {
  /** Money-compatible price string passed to x402 settlePayment */
  priceMoney: string;
  /** Human readable label shown across the UI */
  displayLabel: string;
  /** Optional ceiling for wrapFetchWithPayment (wei encoded as decimal string) */
  maxPaymentValueWei?: string;
};

export type AgentCapabilities = {
  tools: string[];
  capabilities: string[];
};

export type AgentLLMConfig = {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export type AgentData = {
  /** Stable identifier surfaced in routing */
  tokenId: number;
  /** URL-safe slug */
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  avatar: string;
  rating?: number;
  reviews?: number;
  totalSessions?: number;
  activeSessions?: number;
  trending?: boolean;
  usageDelta?: string;
  usageData: AgentUsagePoint[];
  pricing: AgentPricing;
  llmConfig: AgentLLMConfig;
  systemPrompt: string;
} & AgentCapabilities;

type AgentRecord = AgentData & {
  metadata?: {
    context?: string;
  };
};

const TODAY = new Date();

function daysAgo(days: number) {
  const date = new Date(TODAY);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function usageSeries(seed: number): AgentUsagePoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const fluctuation = Math.sin((seed + index) * 1.3) * 4;
    const rentals = Math.max(1, Math.round(seed * 6 + fluctuation));
    return {
      date: daysAgo(6 - index),
      rentals,
    };
  });
}

const AGENT_CATALOG: AgentRecord[] = [
  {
    tokenId: 1,
    slug: "growth-analyst",
    name: "Growth Analyst AI",
    shortDescription:
      "Diagnoses funnel friction and recommends next growth moves.",
    description:
      "Growth Analyst AI ingests performance dashboards, campaign data, and qualitative feedback to surface the exact bottlenecks slowing your product adoption.",
    category: "Analytics",
    avatar: "📈",
    rating: 4.8,
    reviews: 128,
    totalSessions: 2680,
    activeSessions: 14,
    trending: true,
    usageDelta: "+18%",
    tools: ["Google Analytics API", "Mixpanel API", "Airtable API"],
    capabilities: [
      "Attribution analysis",
      "Activation drop-off clustering",
      "Cohort health monitoring",
      "Growth experiment design",
    ],
    usageData: usageSeries(4.2),
    pricing: {
      priceMoney: "$0.08",
      displayLabel: "≈0.16 MATIC per request",
      maxPaymentValueWei: "320000000000000000",
    },
    llmConfig: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.6,
      maxTokens: 1400,
    },
    systemPrompt:
      "You are Growth Analyst AI, an analytics partner who pinpoints growth opportunities, analyses funnel metrics, and recommends experiments grounded in product usage data.",
    metadata: {
      context:
        "You have access to anonymized funnel metrics, survey snippets, and marketing performance benchmarks across SaaS companies between Seed and Series C stages.",
    },
  },
  {
    tokenId: 2,
    slug: "go-to-market-strategist",
    name: "Go-To-Market Strategist",
    shortDescription:
      "Builds positioning, messaging, and launch plans in minutes.",
    description:
      "The Go-To-Market Strategist agent blends competitive intelligence with persona research to deliver ready-to-ship launch kits for revenue teams.",
    category: "Marketing",
    avatar: "🚀",
    rating: 4.9,
    reviews: 97,
    totalSessions: 1984,
    activeSessions: 9,
    trending: true,
    usageDelta: "+24%",
    tools: ["Web Scraper", "LinkedIn API", "Notion API"],
    capabilities: [
      "Persona narrative creation",
      "Competitor teardown",
      "Messaging matrix synthesis",
      "Launch playbook drafting",
    ],
    usageData: usageSeries(3.6),
    pricing: {
      priceMoney: "$0.06",
      displayLabel: "≈0.12 MATIC per request",
      maxPaymentValueWei: "240000000000000000",
    },
    llmConfig: {
      provider: "openai",
      model: "gpt-4.1-mini",
      temperature: 0.7,
      maxTokens: 1600,
    },
    systemPrompt:
      "You are a launch-focused strategist who synthesizes qualitative research, competitor intel, and CRM excerpts to craft crisp positioning for B2B SaaS teams.",
    metadata: {
      context:
        "Persona templates cover HR tech, PLG productivity suites, and developer tooling. Competitor data refreshed weekly from public sources.",
    },
  },
  {
    tokenId: 3,
    slug: "sales-researcher",
    name: "Enterprise Sales Researcher",
    shortDescription:
      "Preps tailored call briefs with live account intelligence.",
    description:
      "Enterprise Sales Researcher scans earnings calls, 10-K filings, and leadership interviews to arm reps with the intel they need to win the next meeting.",
    category: "Sales",
    avatar: "🕵️",
    rating: 4.7,
    reviews: 84,
    totalSessions: 1540,
    activeSessions: 11,
    trending: false,
    usageDelta: "+9%",
    tools: ["Web Scraper", "Google Search API", "LinkedIn API"],
    capabilities: [
      "Executive persona briefing",
      "Recent initiative summary",
      "Buying committee map",
      "Discovery question drafting",
    ],
    usageData: usageSeries(3.2),
    pricing: {
      priceMoney: "$0.07",
      displayLabel: "≈0.14 MATIC per request",
      maxPaymentValueWei: "280000000000000000",
    },
    llmConfig: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.55,
      maxTokens: 1200,
    },
    systemPrompt:
      "You are an enterprise sales desk researcher who assembles actionable account dossiers, highlighting stakeholder priorities and timely conversation hooks.",
    metadata: {
      context:
        "Data sources include SEC filings, investor letters, job postings, and curated industry newsletters across software, fintech, and manufacturing.",
    },
  },
  {
    tokenId: 4,
    slug: "risk-compliance-advisor",
    name: "Risk & Compliance Advisor",
    shortDescription:
      "Summarizes policy updates and maps them to control owners.",
    description:
      "Risk & Compliance Advisor parses regulatory releases, SOC findings, and vendor questionnaires to deliver concise compliance updates for ops teams.",
    category: "Operations",
    avatar: "🛡️",
    rating: 4.6,
    reviews: 61,
    totalSessions: 1120,
    activeSessions: 7,
    trending: false,
    usageDelta: "+6%",
    tools: ["PDF Text Extractor", "Notion API", "Google Drive API"],
    capabilities: [
      "Control coverage analysis",
      "Regulation change briefing",
      "Risk register drafting",
      "Control owner reminders",
    ],
    usageData: usageSeries(2.8),
    pricing: {
      priceMoney: "$0.05",
      displayLabel: "≈0.10 MATIC per request",
      maxPaymentValueWei: "220000000000000000",
    },
    llmConfig: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.4,
      maxTokens: 1000,
    },
    systemPrompt:
      "You digest compliance evidence, highlight risks that need attention, and propose next steps mapped to owners and audit requirements.",
    metadata: {
      context:
        "You have policy excerpts from SOC 2 Type II audits, ISO 27001 mappings, and quarterly regulatory watchlists for fintech and healthcare.",
    },
  },
];

function cloneAgent(agent: AgentRecord | undefined): AgentData | null {
  if (!agent) {
    return null;
  }

  const { metadata, ...rest } = agent;
  return JSON.parse(JSON.stringify(rest)) as AgentData;
}

export async function fetchAgents(): Promise<AgentData[]> {
  return AGENT_CATALOG.map((agent) => cloneAgent(agent)).filter(
    (agent): agent is AgentData => agent !== null
  );
}

export async function fetchAgent(tokenId: number): Promise<AgentData | null> {
  const agent = AGENT_CATALOG.find((item) => item.tokenId === tokenId);
  return cloneAgent(agent);
}

export async function fetchAgentBySlug(
  slug: string
): Promise<AgentData | null> {
  const agent = AGENT_CATALOG.find((item) => item.slug === slug);
  return cloneAgent(agent);
}
