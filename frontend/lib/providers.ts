import { JsonRpcProvider } from "ethers";

import { getActiveChain, getChainEnv, hardhatChain } from "@/lib/thirdweb/chains";

function resolveRpcUrl() {
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    return process.env.NEXT_PUBLIC_RPC_URL;
  }

  const chain = getActiveChain();
  const { rpc } = chain;

  if (Array.isArray(rpc) && rpc.length > 0) {
    return rpc[0];
  }

  if (typeof rpc === "string" && rpc.length > 0) {
    return rpc;
  }

  if (getChainEnv() === "hardhat") {
    const hardhatRpc = hardhatChain.rpc;
    if (typeof hardhatRpc === "string" && hardhatRpc.length > 0) {
      return hardhatRpc;
    }
    if (Array.isArray(hardhatRpc) && hardhatRpc.length > 0) {
      return hardhatRpc[0];
    }
  }

  throw new Error(
    "Unable to determine RPC URL. Set NEXT_PUBLIC_RPC_URL or verify chain configuration."
  );
}

let readOnlyProvider: JsonRpcProvider | null = null;

export function getReadOnlyProvider() {
  if (!readOnlyProvider) {
    readOnlyProvider = new JsonRpcProvider(resolveRpcUrl());
  }

  return readOnlyProvider;
}
