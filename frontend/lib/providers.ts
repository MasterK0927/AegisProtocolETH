import { JsonRpcProvider } from "ethers";

const DEFAULT_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

let readOnlyProvider: JsonRpcProvider | null = null;

export function getReadOnlyProvider() {
  if (!readOnlyProvider) {
    readOnlyProvider = new JsonRpcProvider(DEFAULT_RPC_URL);
  }

  return readOnlyProvider;
}
