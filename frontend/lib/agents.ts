"use client";

import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
} from "ethers";
import type { EventLog, Result } from "ethers";

import { getContractConfig, type ContractName } from "@/lib/contracts";
import { getReadOnlyProvider } from "@/lib/providers";

const LIGHTHOUSE_GATEWAY = "https://gateway.lighthouse.storage/ipfs/";

export type AgentUsagePoint = {
  date: string;
  rentals: number;
};

export type AegisMetadata = {
  name?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  category?: unknown;
  avatar?: unknown;
  creatorName?: unknown;
  rating?: unknown;
  reviews?: unknown;
  totalRentals?: unknown;
  activeRentals?: unknown;
  tools?: unknown;
  capabilities?: unknown;
  usageData?: AgentUsagePoint[];
  hourlyRate?: unknown;
  trending?: unknown;
  usageDelta?: unknown;
  attachments?: unknown;
};

export type AgentMetadata = {
  name?: string;
  description?: string;
  image?: string;
  creator?: string;
  attributes?: Array<{ trait_type?: string; value?: unknown }>;
  aegis?: AegisMetadata;
  [key: string]: unknown;
};

export type AgentAttachment = {
  name: string;
  path: string;
  uri: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type AgentData = {
  tokenId: number;
  tokenUri: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  avatar: string;
  hourlyRateEth: number;
  pricePerSecondWei: bigint;
  creator: string;
  creatorName?: string;
  rating?: number;
  reviews?: number;
  totalRentals?: number;
  activeRentals?: number;
  tools: string[];
  capabilities: string[];
  usageData: AgentUsagePoint[];
  metadata?: AgentMetadata;
  attachments: AgentAttachment[];
};

type ProviderLike = BrowserProvider | JsonRpcProvider;

type FetchAgentsOptions = {
  provider?: ProviderLike;
  chainId?: number;
};

function resolveProvider(provider?: ProviderLike) {
  if (provider) {
    return provider;
  }
  return getReadOnlyProvider();
}

function normalizeUrl(uri: string) {
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "");
    return `${LIGHTHOUSE_GATEWAY}${path}`;
  }
  return uri;
}

function getBaseTokenUri(tokenUri: string) {
  if (!tokenUri) {
    return tokenUri;
  }

  const normalized = tokenUri.endsWith("/")
    ? tokenUri
    : tokenUri.replace(/metadata\.json$/i, "");

  if (normalized.endsWith("/")) {
    return normalized;
  }

  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) {
    return normalized;
  }

  return normalized.slice(0, lastSlash + 1);
}

declare const Buffer:
  | {
      from(
        data: string,
        encoding: string
      ): { toString: (encoding: string) => string };
    }
  | undefined;

function decodeDataUri(uri: string) {
  const commaIndex = uri.indexOf(",");
  const encoded = commaIndex >= 0 ? uri.slice(commaIndex + 1) : uri;

  if (typeof atob === "function") {
    return atob(encoded);
  }

  if (Buffer) {
    return Buffer.from(encoded, "base64").toString("utf8");
  }

  throw new Error("No base64 decoder available in this environment");
}

async function loadMetadata(
  tokenUri: string
): Promise<AgentMetadata | undefined> {
  if (!tokenUri) {
    return undefined;
  }

  if (tokenUri.startsWith("data:application/json")) {
    const jsonString = decodeDataUri(tokenUri);
    return JSON.parse(jsonString);
  }

  const response = await fetch(normalizeUrl(tokenUri));
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from ${tokenUri}`);
  }
  return (await response.json()) as AgentMetadata;
}

function extractAttribute(metadata: AgentMetadata | undefined, trait: string) {
  const attributes = metadata?.attributes;
  if (!Array.isArray(attributes)) {
    return undefined;
  }

  const match = attributes.find(
    (attr) => (attr?.trait_type ?? "").toLowerCase() === trait.toLowerCase()
  );
  return match?.value;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return undefined;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string");
  }
  return [];
}

function toStringValue(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return undefined;
}

function buildAgentData(
  tokenId: number,
  creator: string,
  pricePerSecond: bigint,
  tokenUri: string,
  metadata: AgentMetadata | undefined
): AgentData {
  const aegis = (metadata?.aegis ?? {}) as AegisMetadata;
  const defaultName = `Agent #${tokenId}`;
  const categoryFromAttributes = extractAttribute(metadata, "category");
  const totalRentalsFromAttributes = extractAttribute(metadata, "totalRentals");
  const activeRentalsFromAttributes = extractAttribute(
    metadata,
    "activeRentals"
  );
  const ratingAttr = extractAttribute(metadata, "rating");
  const reviewsAttr = extractAttribute(metadata, "reviews");

  const pricePerHourEth =
    pricePerSecond > 0n
      ? Number.parseFloat(formatEther(pricePerSecond * 3600n))
      : toNumber(aegis.hourlyRate) ?? 0;

  const name = toStringValue(aegis.name) ?? metadata?.name ?? defaultName;
  const shortDescription =
    toStringValue(aegis.shortDescription) ?? metadata?.description ?? "";
  const longDescription =
    toStringValue(aegis.description) ?? metadata?.description ?? "";
  const category =
    toStringValue(aegis.category) ??
    toStringValue(categoryFromAttributes) ??
    "General";
  let avatar = toStringValue(aegis.avatar) ?? metadata?.image;
  const creatorName = toStringValue(aegis.creatorName) ?? metadata?.creator;
  const totalRentalsValue = toNumber(
    aegis.totalRentals ?? totalRentalsFromAttributes
  );
  const activeRentalsValue = toNumber(
    aegis.activeRentals ?? activeRentalsFromAttributes
  );

  const attachmentsRaw = Array.isArray(aegis.attachments)
    ? (aegis.attachments as Array<Record<string, unknown>>)
    : [];
  const baseUri = getBaseTokenUri(tokenUri);
  const attachments = attachmentsRaw.reduce<AgentAttachment[]>(
    (collection, attachment) => {
      const path = toStringValue(attachment.path ?? attachment.uri);
      if (!path) {
        return collection;
      }

      const name =
        toStringValue(attachment.name) ?? path.split("/").pop() ?? "Attachment";
      const mimeType = toStringValue(attachment.mimeType ?? attachment.type);
      const sizeValue = toNumber(attachment.size);
      const attachmentUri = baseUri ? `${baseUri}${path}` : path;

      collection.push({
        name,
        path,
        uri: attachmentUri,
        url: normalizeUrl(attachmentUri),
        mimeType,
        size: sizeValue,
      });

      return collection;
    },
    []
  );

  if (!avatar) {
    const imageAttachment = attachments.find((attachment) =>
      attachment.mimeType?.startsWith("image/")
    );
    avatar = imageAttachment?.url;
  }

  avatar ??= "🤖";

  return {
    tokenId,
    tokenUri,
    name,
    shortDescription,
    description: longDescription,
    category,
    avatar,
    hourlyRateEth: pricePerHourEth,
    pricePerSecondWei: pricePerSecond,
    creator,
    creatorName,
    rating: toNumber(aegis.rating ?? ratingAttr),
    reviews: toNumber(aegis.reviews ?? reviewsAttr),
    totalRentals: totalRentalsValue,
    activeRentals: activeRentalsValue,
    tools: toArray(aegis.tools),
    capabilities: toArray(aegis.capabilities),
    usageData: Array.isArray(aegis.usageData) ? aegis.usageData : [],
    metadata,
    attachments,
  };
}

async function getContract(
  chainId: number,
  name: ContractName,
  provider: ProviderLike
) {
  const { address, abi } = getContractConfig(chainId, name);
  return new Contract(address, abi, provider);
}

export async function fetchAgents(
  options?: FetchAgentsOptions
): Promise<AgentData[]> {
  const provider = resolveProvider(options?.provider);
  const network = await provider.getNetwork();
  const chainId = options?.chainId ?? Number(network.chainId);

  const agentContract = await getContract(chainId, "AgentNFT", provider);
  const rentalContract = await getContract(chainId, "RentalContract", provider);

  const eventFilter = agentContract.filters.AgentMinted();

  // It's inefficient to query all events from the genesis block.
  // This is a placeholder for the block number when the contract was deployed.
  // For a production app, this should be retrieved from the deployment artifacts.
  const deployBlock = 0; // Replace with actual deployment block number if known
  const events = await agentContract.queryFilter(eventFilter, deployBlock);

  const agents = await Promise.all(
    events.map(async (event) => {
      if (!("args" in event)) {
        return null;
      }

      const eventLog = event as EventLog;
      const eventArgs = eventLog.args as Result;
      const tokenIdRaw = eventArgs[0];
      const creatorRaw = eventArgs[1];

      const tokenId = Number(tokenIdRaw ?? 0);
      const creator = creatorRaw != null ? creatorRaw.toString() : "";
      const tokenUri = await agentContract.tokenURI(tokenId);
      const metadata = await loadMetadata(tokenUri);
      const pricePerSecond: bigint = await rentalContract.rentalPrices(tokenId);

      return buildAgentData(
        tokenId,
        creator,
        pricePerSecond,
        tokenUri,
        metadata
      );
    })
  );

  return agents
    .filter((agent): agent is AgentData => agent !== null)
    .sort((a, b) => a.tokenId - b.tokenId);
}

export async function fetchAgent(
  tokenId: number,
  options?: FetchAgentsOptions
): Promise<AgentData | null> {
  const provider = resolveProvider(options?.provider);
  const network = await provider.getNetwork();
  const chainId = options?.chainId ?? Number(network.chainId);

  const agentContract = await getContract(chainId, "AgentNFT", provider);
  const rentalContract = await getContract(chainId, "RentalContract", provider);

  try {
    const tokenUri = await agentContract.tokenURI(tokenId);
    const metadata = await loadMetadata(tokenUri);
    const pricePerSecond: bigint = await rentalContract.rentalPrices(tokenId);
    const creator = await agentContract.ownerOf(tokenId);

    return buildAgentData(tokenId, creator, pricePerSecond, tokenUri, metadata);
  } catch (error) {
    console.error(`Failed to load agent ${tokenId}`, error);
    return null;
  }
}
