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
import { BrowserProvider, JsonRpcSigner } from "ethers";
import type { Eip1193Provider } from "ethers";

import { SUPPORTED_CHAIN_IDS } from "@/lib/contracts";

type Web3ContextValue = {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  balance: bigint | null;
  isConnecting: boolean;
  connect: () => Promise<{
    signer: JsonRpcSigner;
    address: string;
    chainId: number;
  }>;
  disconnect: () => Promise<void>;
};

const Web3Context = createContext<Web3ContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: unknown[]) => void
      ) => void;
    };
  }
}

export default function Web3Provider({ children }: Props) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const resetState = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setBalance(null);
    setIsConnecting(false);
  }, []);

  const handleAccountsChanged = useCallback(
    async (accountsInput: unknown) => {
      if (!Array.isArray(accountsInput) || accountsInput.length === 0) {
        resetState();
        return;
      }

      const accounts = accountsInput.filter(
        (value): value is string => typeof value === "string"
      );
      if (accounts.length === 0) {
        resetState();
        return;
      }

      try {
        const browserProvider = new BrowserProvider(window.ethereum!, "any");
        const currentSigner = await browserProvider.getSigner();
        const network = await browserProvider.getNetwork();

        const account = accounts[0];
        const currentBalance = await browserProvider.getBalance(account);

        setProvider(browserProvider);
        setSigner(currentSigner);
        setAddress(account);
        setChainId(Number(network.chainId));
        setBalance(currentBalance);
      } catch (error) {
        console.error("Failed to refresh signer after account change", error);
        resetState();
      }
    },
    [resetState]
  );

  const handleChainChanged = useCallback(async () => {
    if (!window.ethereum) {
      return;
    }

    try {
      const browserProvider = new BrowserProvider(window.ethereum, "any");
      const network = await browserProvider.getNetwork();
      const accounts = await browserProvider.send("eth_accounts", []);

      if (!SUPPORTED_CHAIN_IDS.includes(Number(network.chainId))) {
        console.warn("Connected to unsupported chain", network.chainId);
      }

      if (accounts.length === 0) {
        resetState();
        return;
      }

      const currentSigner = await browserProvider.getSigner();
      const account = accounts[0];
      const currentBalance = await browserProvider.getBalance(account);

      setProvider(browserProvider);
      setSigner(currentSigner);
      setAddress(account);
      setChainId(Number(network.chainId));
      setBalance(currentBalance);
    } catch (error) {
      console.error("Failed to refresh signer after chain change", error);
      resetState();
    }
  }, [resetState]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not available in this browser");
    }

    setIsConnecting(true);

    try {
      const browserProvider = new BrowserProvider(window.ethereum, "any");
      await browserProvider.send("eth_requestAccounts", []);
      const currentSigner = await browserProvider.getSigner();
      const currentAddress = await currentSigner.getAddress();
      const currentBalance = await browserProvider.getBalance(currentAddress);
      const network = await browserProvider.getNetwork();

      if (!SUPPORTED_CHAIN_IDS.includes(Number(network.chainId))) {
        console.warn("Connected to unsupported chain", network.chainId);
      }

      setProvider(browserProvider);
      setSigner(currentSigner);
      setAddress(currentAddress);
      setChainId(Number(network.chainId));
      setBalance(currentBalance);

      return {
        signer: currentSigner,
        address: currentAddress,
        chainId: Number(network.chainId),
      };
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (typeof window === "undefined") {
      resetState();
      return;
    }

    const { ethereum } = window;

    if (!ethereum) {
      resetState();
      return;
    }

    const removeListener =
      typeof ethereum.removeListener === "function"
        ? ethereum.removeListener.bind(ethereum)
        : null;
    const addListener =
      typeof ethereum.on === "function" ? ethereum.on.bind(ethereum) : null;

    if (removeListener) {
      removeListener("accountsChanged", handleAccountsChanged);
      removeListener("chainChanged", handleChainChanged);
    }

    try {
      if (typeof ethereum.request === "function") {
        await ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (error) {
      const code =
        typeof error === "object" && error !== null
          ? (error as { code?: number }).code
          : undefined;

      if (code === -32601) {
        console.info(
          "wallet_revokePermissions not supported by provider; falling back to local disconnect"
        );
      } else {
        console.error("Failed to revoke wallet permissions", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to disconnect wallet");
      }
    } finally {
      resetState();

      if (addListener) {
        addListener("accountsChanged", handleAccountsChanged);
        addListener("chainChanged", handleChainChanged);
      }
    }
  }, [handleAccountsChanged, handleChainChanged, resetState]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      return;
    }

    const browserProvider = new BrowserProvider(window.ethereum, "any");

    browserProvider
      .send("eth_accounts", [])
      .then(async (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          return;
        }
        const currentSigner = await browserProvider.getSigner();
        const currentAddress = await currentSigner.getAddress();
        const network = await browserProvider.getNetwork();
        const currentBalance = await browserProvider.getBalance(currentAddress);

        setProvider(browserProvider);
        setSigner(currentSigner);
        setAddress(currentAddress);
        setChainId(Number(network.chainId));
        setBalance(currentBalance);
      })
      .catch((error) => {
        console.error("Failed to initialize provider", error);
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      return;
    }

    window.ethereum?.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum?.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const value = useMemo<Web3ContextValue>(
    () => ({
      provider,
      signer,
      address,
      chainId,
      balance,
      isConnecting,
      connect,
      disconnect,
    }),
    [
      provider,
      signer,
      address,
      chainId,
      balance,
      isConnecting,
      connect,
      disconnect,
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
