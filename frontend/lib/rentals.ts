"use client";

import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  JsonRpcSigner,
  parseEther,
  type EventLog,
  type Result,
} from "ethers";

import { getContractConfig } from "@/lib/contracts";
import { getReadOnlyProvider } from "@/lib/providers";

type ProviderLike = BrowserProvider | JsonRpcProvider;

type BaseOptions = {
  chainId: number;
};

type ReadOptions = BaseOptions & {
  provider?: ProviderLike;
};

type WriteOptions = BaseOptions & {
  signer: JsonRpcSigner;
};

type FetchRentalOptions = {
  provider?: ProviderLike;
  chainId?: number;
};

export type ActiveRental = {
  renter: string;
  expiresAt: bigint;
};

export type RentalHistoryEvent = {
  tokenId: number;
  renter: string;
  creator: string;
  pricePaidWei: bigint;
  expiresAt: bigint;
  durationSeconds: number;
  startedAt: Date;
  transactionHash: string;
  blockNumber: number;
};

function resolveProvider(provider?: ProviderLike) {
  if (provider) {
    return provider;
  }
  return getReadOnlyProvider();
}

export async function rentAgent(
  tokenId: number,
  hours: number,
  { signer, chainId }: WriteOptions
) {
  const { address, abi } = getContractConfig(chainId, "RentalContract");
  const contract = new Contract(address, abi, signer);

  const durationSeconds = BigInt(Math.max(hours, 1)) * 3600n;
  const pricePerSecond: bigint = await contract.rentalPrices(tokenId);
  if (pricePerSecond === 0n) {
    throw new Error("This agent is not available for rent");
  }

  const totalCost = pricePerSecond * durationSeconds;
  const tx = await contract.rent(tokenId, Number(durationSeconds), {
    value: totalCost,
  });
  const receipt = await tx.wait();
  return { receipt, totalCost };
}

export async function fetchActiveRental(
  tokenId: number,
  options?: FetchRentalOptions
): Promise<ActiveRental | null> {
  const provider = resolveProvider(options?.provider);
  const network = await provider.getNetwork();
  const chainId = options?.chainId ?? Number(network.chainId);

  const { address, abi } = getContractConfig(chainId, "RentalContract");
  const contract = new Contract(address, abi, provider);
  const rental = await contract.activeRentals(tokenId);

  const renter = (rental.renter ?? rental[0] ?? "") as string;
  const expiresAtRaw = rental.expiresAt ?? rental[1] ?? 0;
  const expiresAt = BigInt(expiresAtRaw);

  if (
    !renter ||
    renter === "0x0000000000000000000000000000000000000000" ||
    expiresAt === 0n
  ) {
    return null;
  }

  return {
    renter: renter.toLowerCase(),
    expiresAt,
  };
}

type FetchRentalHistoryOptions = {
  provider?: ProviderLike;
  chainId?: number;
  fromBlock?: bigint;
  toBlock?: bigint | "latest";
};

export async function fetchRentalHistory(
  options?: FetchRentalHistoryOptions
): Promise<RentalHistoryEvent[]> {
  const provider = resolveProvider(options?.provider);
  const network = await provider.getNetwork();
  const chainId = options?.chainId ?? Number(network.chainId);

  const { address: rentalAddress, abi: rentalAbi } = getContractConfig(
    chainId,
    "RentalContract"
  );
  const rentalContract = new Contract(rentalAddress, rentalAbi, provider);

  const { address: agentAddress, abi: agentAbi } = getContractConfig(
    chainId,
    "AgentNFT"
  );
  const agentContract = new Contract(agentAddress, agentAbi, provider);

  const filter = rentalContract.filters.RentalStarted();
  const events = await rentalContract.queryFilter(
    filter,
    options?.fromBlock ?? 0n,
    options?.toBlock ?? "latest"
  );

  const blockTimestampCache = new Map<number, number>();
  const creatorCache = new Map<number, string>();

  const history = await Promise.all(
    events.map(async (event) => {
      if (!("args" in event)) {
        return null;
      }

      const eventLog = event as EventLog;
      const eventArgs = eventLog.args as Result;

      const tokenIdRaw = eventArgs[0];
      const renterRaw = eventArgs[1];
      const expiresAtRaw = eventArgs[2];
      const priceRaw = eventArgs[3];

      const tokenId = Number(tokenIdRaw ?? 0);
      const renter =
        renterRaw != null ? renterRaw.toString().toLowerCase() : "";
      const expiresAt = BigInt(expiresAtRaw ?? 0);
      const pricePaidWei = BigInt(priceRaw ?? 0);

      const blockNumber = eventLog.blockNumber;
      const cachedTimestamp = blockTimestampCache.get(blockNumber);
      let blockTimestamp = cachedTimestamp;

      if (blockTimestamp == null) {
        const block = await provider.getBlock(blockNumber);
        blockTimestamp = block?.timestamp ?? 0;
        blockTimestampCache.set(blockNumber, blockTimestamp);
      }

      const duration = expiresAt - BigInt(blockTimestamp ?? 0);
      const durationSeconds = duration > 0n ? Number(duration) : 0;
      const startedAt = new Date((blockTimestamp ?? 0) * 1000);

      let creator = creatorCache.get(tokenId);
      if (!creator) {
        try {
          const owner = await agentContract.ownerOf(tokenId);
          const normalizedOwner = owner.toString().toLowerCase();
          creator = normalizedOwner;
          creatorCache.set(tokenId, normalizedOwner);
        } catch (error) {
          console.warn(`Failed to resolve owner for agent ${tokenId}`, error);
          creator = "";
        }
      }

      return {
        tokenId,
        renter,
        creator: creator ?? "",
        pricePaidWei,
        expiresAt,
        durationSeconds,
        startedAt,
        transactionHash: eventLog.transactionHash,
        blockNumber,
      } satisfies RentalHistoryEvent;
    })
  );

  return history.filter((item): item is RentalHistoryEvent => item !== null);
}

export async function isRentalActive(
  tokenId: number,
  renter: string,
  options: ReadOptions
) {
  const provider = resolveProvider(options.provider);
  const { address, abi } = getContractConfig(options.chainId, "RentalContract");
  const contract = new Contract(address, abi, provider);
  return contract.isRentalActive(tokenId, renter);
}

export async function getCreditBalance(address: string, options: ReadOptions) {
  const provider = resolveProvider(options.provider);
  const { address: contractAddress, abi } = getContractConfig(
    options.chainId,
    "X402CreditContract"
  );
  const contract = new Contract(contractAddress, abi, provider);
  const balance: bigint = await contract.creditBalances(address);
  return balance;
}

export async function purchaseCredits(
  amountEth: string,
  { signer, chainId }: WriteOptions
) {
  const { address, abi } = getContractConfig(chainId, "X402CreditContract");
  const contract = new Contract(address, abi, signer);
  const payment = parseEther(amountEth);
  const tx = await contract.purchaseCredits({ value: payment });
  return tx.wait();
}
