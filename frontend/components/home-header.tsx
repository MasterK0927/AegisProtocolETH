"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";

type HomeHeaderProps = {
  variant?: "default" | "landing";
};

export default function HomeHeader({ variant = "default" }: HomeHeaderProps) {
  const { address, connect, disconnect, isConnecting } = useWeb3();
  const { toast } = useToast();

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Wallet connection failed", error);
      toast({
        title: "Unable to connect",
        description:
          error instanceof Error
            ? error.message
            : "Please ensure MetaMask is installed and unlocked.",
        variant: "destructive",
      });
    }
  }, [connect, toast]);

  const handleDisconnect = useCallback(() => {
    void disconnect()
      .then(() => {
        toast({
          title: "Wallet disconnected",
          description: "You can reconnect at any time to continue.",
        });
      })
      .catch((error) => {
        console.error("Wallet disconnect failed", error);
        toast({
          title: "Unable to disconnect",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while disconnecting your wallet.",
          variant: "destructive",
        });
      });
  }, [disconnect, toast]);

  const walletLabel = useMemo(() => {
    if (!address) {
      return "Connect Wallet";
    }
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4",
          variant === "landing"
            ? "landing-header"
            : "bg-background/40 backdrop-blur-lg"
        )}
      >
        <Link
          href="/"
          className={cn(
            "flex items-center space-x-2",
            variant === "landing" && "landing-header__brand"
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <span
            className={cn(
              "text-xl font-bold text-foreground",
              variant === "landing" && "landing-header__brand-text"
            )}
          >
            Aegis Protocol
          </span>
        </Link>

        <div className="flex items-center space-x-6">
          <Link
            href="/marketplace"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Marketplace
          </Link>
          <Link
            href="/create"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Create
          </Link>
          {!address ? (
            <Button
              variant="outline"
              size="sm"
              className={cn(variant === "landing" && "landing-header__cta")}
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting…" : walletLabel}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(variant === "landing" && "landing-header__cta")}
                >
                  {walletLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Wallet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void navigator.clipboard?.writeText(address);
                    toast({
                      title: "Address copied",
                      description: "Wallet address copied to clipboard.",
                    });
                  }}
                >
                  Copy address
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </nav>
      <div className="h-20" aria-hidden />
    </>
  );
}
