export type ContractName = never;

export const SUPPORTED_CHAIN_IDS: number[] = [];

export function getContractConfig(): never {
  throw new Error("On-chain contracts have been removed from the frontend.");
}
