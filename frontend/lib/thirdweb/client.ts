"use client";

import { createThirdwebClient, type ThirdwebClient } from "thirdweb";

let cachedClient: ThirdwebClient | null = null;

export function getBrowserThirdwebClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable is required"
    );
  }

  cachedClient = createThirdwebClient({
    clientId,
  });

  return cachedClient;
}
