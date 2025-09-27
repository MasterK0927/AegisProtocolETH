"use client";

import { useWeb3Context } from "@/components/web3-provider";

export function useWeb3() {
  return useWeb3Context();
}
