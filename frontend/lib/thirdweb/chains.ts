import { polygonAmoy } from "thirdweb/chains";
import { defineChain } from "thirdweb";

export type ChainEnvironment = "polygon-amoy" | "hardhat";

const DEFAULT_CHAIN_ENV: ChainEnvironment = "polygon-amoy";
const DEFAULT_HARDHAT_RPC = "http://127.0.0.1:8545";

const hardhatRpcUrl =
  process.env.HARDHAT_RPC_URL ??
  process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ??
  DEFAULT_HARDHAT_RPC;

export const hardhatChain = defineChain({
  id: 31337,
  name: "Hardhat Local",
  slug: "hardhat",
  nativeCurrency: {
    name: "Hardhat Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: hardhatRpcUrl,
  testnet: true,
});

export function getChainEnv(): ChainEnvironment {
  const value = process.env.NEXT_PUBLIC_CHAIN_ENV?.toLowerCase();
  if (value === "hardhat") {
    return "hardhat";
  }
  return DEFAULT_CHAIN_ENV;
}

export function getActiveChain() {
  return getChainEnv() === "hardhat" ? hardhatChain : polygonAmoy;
}
