"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BrowserProvider, type Eip1193Provider, type Signer } from "ethers";
import type { Chain } from "thirdweb/chains";
import { createWallet, type Wallet } from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

import { getBrowserThirdwebClient } from "@/lib/thirdweb/client";
import { getActiveChain } from "@/lib/thirdweb/chains";

type Web3ContextValue = {
  wallet: Wallet | null;
  address: string | null;
  chain: Chain | null;
  chainId: number | null;
  signer: Signer | null;
  isConnecting: boolean;
  connect: () => Promise<{
    address: string | null;
    chainId: number | null;
    signer: Signer | null;
  }>;
  disconnect: () => Promise<void>;
  getPaymentFetcher: (
    maxValueWei?: bigint
  ) => (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const Web3Context = createContext<Web3ContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export default function Web3Provider({ children }: Props) {
  const isBrowser = typeof window !== "undefined";
  const [address, setAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [signer, setSigner] = useState<Signer | null>(null);

  const wallet = useMemo(() => createWallet("io.metamask"), []);
  const activeChain = useMemo(() => getActiveChain(), []);
  const thirdwebClient = useMemo(
    () => (isBrowser ? getBrowserThirdwebClient() : null),
    [isBrowser]
  );

  const resolveSigner = useCallback(async (): Promise<Signer | null> => {
    if (!isBrowser || typeof window === "undefined") {
      setSigner(null);
      return null;
    }

    const ethereumWindow = window as typeof window & {
      ethereum?: Eip1193Provider;
    };
    if (!ethereumWindow.ethereum) {
      setSigner(null);
      return null;
    }

    try {
      const provider = new BrowserProvider(ethereumWindow.ethereum);
      const signerInstance = await provider.getSigner();
      setSigner(signerInstance);
      return signerInstance;
    } catch (error) {
      console.warn("Failed to resolve signer", error);
      setSigner(null);
      return null;
    }
  }, [isBrowser]);

  const resetState = useCallback(() => {
    setAddress(null);
    setChain(null);
    setChainId(null);
    setSigner(null);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    const unsubscribeAccount = wallet.subscribe("accountChanged", (account) => {
      setAddress(account?.address ?? null);
      void resolveSigner();
    });
    const unsubscribeChain = wallet.subscribe("chainChanged", (nextChain) => {
      setChain(nextChain ?? null);
      setChainId(nextChain?.id ?? null);
      void resolveSigner();
    });
    const unsubscribeDisconnect = wallet.subscribe("disconnect", () => {
      resetState();
    });

    return () => {
      unsubscribeAccount?.();
      unsubscribeChain?.();
      unsubscribeDisconnect?.();
    };
  }, [wallet, resetState, resolveSigner]);

  useEffect(() => {
    if (!thirdwebClient) {
      return;
    }

    wallet
      .autoConnect({ client: thirdwebClient })
      .then(async (account) => {
        setAddress(account.address);
        const currentChain = wallet.getChain();
        if (!currentChain || currentChain.id !== activeChain.id) {
          try {
            await wallet.switchChain(activeChain);
            setChain(activeChain);
            setChainId(activeChain.id);
          } catch (error) {
            console.warn("Auto connect chain switch failed", error);
            setChain(currentChain ?? null);
            setChainId(currentChain?.id ?? null);
          }
        } else {
          setChain(currentChain);
          setChainId(currentChain.id);
        }

        await resolveSigner();
      })
      .catch(() => {
        // Silent failure is fine when no previous session exists
      });
  }, [wallet, activeChain, thirdwebClient, resolveSigner]);

  const connect = useCallback(async () => {
    if (!thirdwebClient) {
      throw new Error("Wallet connection is only available in the browser");
    }

    setIsConnecting(true);
    try {
      const account = await wallet.connect({ client: thirdwebClient });
      setAddress(account.address);

      try {
        await wallet.switchChain(activeChain);
        setChain(activeChain);
        setChainId(activeChain.id);
      } catch (error) {
        console.warn("Wallet chain switch failed", error);
        const fallbackChain = wallet.getChain() ?? null;
        setChain(fallbackChain);
        setChainId(fallbackChain?.id ?? null);
      }

      const signerInstance = await resolveSigner();
      const currentChainId = wallet.getChain()?.id ?? null;

      return {
        address: account.address,
        chainId: currentChainId,
        signer: signerInstance,
      };
    } finally {
      setIsConnecting(false);
    }
  }, [wallet, activeChain, thirdwebClient, resolveSigner]);

  const disconnect = useCallback(async () => {
    await wallet.disconnect();
    resetState();
  }, [wallet, resetState]);

  const getPaymentFetcher = useCallback(
    (maxValueWei?: bigint) => {
      if (!thirdwebClient) {
        throw new Error("Payments unavailable during server-side rendering");
      }

      if (!wallet.getAccount()) {
        throw new Error("Wallet must be connected to initiate a paid request");
      }

      return wrapFetchWithPayment(
        globalThis.fetch.bind(globalThis),
        thirdwebClient,
        wallet,
        maxValueWei
      );
    },
    [wallet, thirdwebClient]
  );

  const value = useMemo<Web3ContextValue>(
    () => ({
      wallet,
      address,
      chain,
      chainId,
      signer,
      isConnecting,
      connect,
      disconnect,
      getPaymentFetcher,
    }),
    [
      wallet,
      address,
      chain,
      chainId,
      signer,
      isConnecting,
      connect,
      disconnect,
      getPaymentFetcher,
    ]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3Context() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3Context must be used within a Web3Provider");
  }

  return context;
}
