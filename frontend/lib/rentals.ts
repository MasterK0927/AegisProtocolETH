"use client";

import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  JsonRpcSigner,
  parseEther,
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
