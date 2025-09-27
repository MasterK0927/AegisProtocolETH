import { createThirdwebClient, type ThirdwebClient } from "thirdweb";
import { facilitator, type ThirdwebX402Facilitator } from "thirdweb/x402";

import { getActiveChain } from "@/lib/thirdweb/chains";

let cachedClient: ThirdwebClient | null = null;
let cachedFacilitator: ThirdwebX402Facilitator | null = null;

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

export function getThirdwebClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const secretKey = requireEnv(
    process.env.THIRDWEB_SECRET_KEY,
    "THIRDWEB_SECRET_KEY"
  );

  cachedClient = createThirdwebClient({
    secretKey,
  });

  return cachedClient;
}

export function getThirdwebFacilitator() {
  if (cachedFacilitator) {
    return cachedFacilitator;
  }

  const serverWalletAddress = requireEnv(
    process.env.THIRDWEB_SERVER_WALLET_ADDRESS,
    "THIRDWEB_SERVER_WALLET_ADDRESS"
  );

  const baseUrl = process.env.THIRDWEB_FACILITATOR_BASE_URL;

  cachedFacilitator = facilitator({
    client: getThirdwebClient(),
    serverWalletAddress,
    ...(baseUrl ? { baseUrl } : {}),
  });

  return cachedFacilitator;
}

export function getPaymentChain() {
  return getActiveChain();
}
