"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, RefreshCw, Sparkles, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  estimateCreditsNeeded,
  formatUsd,
  usePosCart,
} from "@/hooks/use-pos-cart";
import {
  CreateCheckoutOrderPayload,
  CreateCheckoutOrderResult,
  PaymentOrder,
} from "@/lib/payments/types";
import type { AgentData } from "@/lib/agents";

import { TransactionTimeline } from "./transaction-timeline";

const HOURS_MAX = 72;

function resolveAvatar(agent: AgentData) {
  if (agent.avatar.startsWith("http") || agent.avatar.startsWith("data:")) {
    return agent.avatar;
  }
  return null;
}

type CheckoutDrawerProps = {
  agent: AgentData | null;
  renterAddress?: string | null;
  orders: PaymentOrder[];
  isLoadingOrders: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (
    payload: CreateCheckoutOrderPayload
  ) => Promise<CreateCheckoutOrderResult>;
  onRefreshOrders?: () => Promise<PaymentOrder[] | null>;
};

type ErrorState = {
  message: string;
  details?: unknown;
} | null;

export function CheckoutDrawer({
  agent,
  renterAddress,
  orders,
  isLoadingOrders,
  open,
  onOpenChange,
  onCreateOrder,
  onRefreshOrders,
}: CheckoutDrawerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] =
    useState<CreateCheckoutOrderResult | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [hoursInput, setHoursInput] = useState("3");

  const cart = usePosCart(
    agent
      ? [
          {
            agentId: agent.tokenId,
            agentName: agent.name,
            hours: 3,
            pricePerSecondWei: agent.pricePerSecondWei,
            hourlyRateEth: agent.hourlyRateEth,
            avatar: agent.avatar,
          },
        ]
      : []
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!agent) {
      cart.clear();
      return;
    }
    cart.addOrUpdateItem({
      agentId: agent.tokenId,
      agentName: agent.name,
      hours: Math.max(1, Number.parseInt(hoursInput, 10) || 3),
      pricePerSecondWei: agent.pricePerSecondWei,
      hourlyRateEth: agent.hourlyRateEth,
      avatar: agent.avatar,
    });
  }, [agent, cart, hoursInput, open]);

  useEffect(() => {
    if (!open) {
      setLastResult(null);
      setErrorState(null);
    }
  }, [open]);

  const primaryItem = cart.items[0];

  const hours = useMemo(() => {
    if (primaryItem?.hours) {
      return primaryItem.hours;
    }
    const parsed = Number.parseInt(hoursInput, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }, [primaryItem, hoursInput]);

  useEffect(() => {
    if (!primaryItem) {
      return;
    }
    setHoursInput(String(primaryItem.hours));
  }, [primaryItem]);

  const creditsNeeded = useMemo(
    () => estimateCreditsNeeded(cart.totals.totalEth),
    [cart.totals.totalEth]
  );

  const handleHoursSlider = (value: number[]) => {
    const next = value[0];
    setHoursInput(String(next));
    if (primaryItem) {
      cart.setItemHours(primaryItem.agentId, next);
    }
  };

  const handleHoursInput = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/[^0-9]/g, "");
    setHoursInput(sanitized);
    const nextValue = Math.min(
      Math.max(Number.parseInt(sanitized || "0", 10), 1),
      HOURS_MAX
    );
    if (primaryItem) {
      cart.setItemHours(primaryItem.agentId, nextValue);
    }
  };

  const handleSubmit = async () => {
    if (!agent || !primaryItem) {
      toast({
        title: "No agent selected",
        description: "Choose an agent before creating a checkout order.",
        variant: "destructive",
      });
      return;
    }

    if (!renterAddress) {
      toast({
        title: "Connect your wallet",
        description:
          "A connected wallet address is required to create an order.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setErrorState(null);
    try {
      const payload: CreateCheckoutOrderPayload = {
        agentId: agent.tokenId,
        agentName: agent.name,
        renterAddress,
        hours: primaryItem.hours,
        pricePerSecondWei: agent.pricePerSecondWei.toString(),
        metadata: {
          source: "chat-pos-drawer",
          avatar: agent.avatar,
          creditsNeeded,
        },
      };
      const result = await onCreateOrder(payload);
      setLastResult(result);
      cart.setItemHours(agent.tokenId, payload.hours);
      toast({
        title: "Checkout order created",
        description: result.checkoutUrl
          ? "Opening x402 checkout in a new tab."
          : "Simulation order created locally.",
      });
      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create checkout order.";
      setErrorState({ message });
      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarUrl = agent ? resolveAvatar(agent) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Agent checkout</SheetTitle>
          <SheetDescription>
            Build a point-of-sale order for this agent and send the renter to
            the x402 facilitator checkout.
          </SheetDescription>
        </SheetHeader>

        {agent ? (
          <div className="space-y-6 px-4">
            <Card className="border-muted">
              <CardHeader className="flex flex-row items-center gap-3">
                {avatarUrl ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                    <Image
                      src={avatarUrl}
                      alt={agent.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                    {agent.avatar}
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Hourly rate {agent.hourlyRateEth.toFixed(4)} ETH
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-hours">
                    Rental duration (hours)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      max={HOURS_MAX}
                      min={1}
                      step={1}
                      value={[hours]}
                      onValueChange={handleHoursSlider}
                    />
                    <Input
                      id="checkout-hours"
                      className="w-16 text-center"
                      value={hoursInput}
                      onChange={handleHoursInput}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Each rental hour represents {60} minutes of agent
                    availability and tooling access.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{cart.totals.subtotalEth.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Platform fee</span>
                    <span>{cart.totals.platformFeeEth.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>{cart.totals.totalEth.toFixed(4)} ETH</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatUsd(cart.totals.usdEstimate)} • Estimated
                    facilitator credits needed: {creditsNeeded}
                  </p>
                </div>
              </CardContent>
            </Card>

            {lastResult ? (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-600">
                <p className="font-medium">Latest checkout</p>
                <p>
                  Order {lastResult.order.id.slice(0, 8)}… created successfully.
                </p>
                {lastResult.checkoutUrl ? (
                  <Button
                    variant="link"
                    className="h-auto px-0 text-emerald-600"
                    onClick={() =>
                      window.open(
                        lastResult.checkoutUrl as string,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Reopen checkout link
                  </Button>
                ) : (
                  <p>Simulation mode: no facilitator URL returned.</p>
                )}
              </div>
            ) : null}

            {errorState ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                <p className="font-medium">Checkout error</p>
                <p>{errorState.message}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="px-4">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8" />
                <p>Select an agent to start building a checkout order.</p>
              </CardContent>
            </Card>
          </div>
        )}

        <SheetFooter className="space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={!agent || !primaryItem || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            Create checkout order
          </Button>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Need to sync payments?</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => onRefreshOrders?.()}
              disabled={isSubmitting}
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Sync history
            </Button>
          </div>
          <TransactionTimeline
            orders={orders}
            isLoading={isLoadingOrders}
            onRefresh={onRefreshOrders}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
