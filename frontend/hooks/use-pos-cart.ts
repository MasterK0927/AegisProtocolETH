"use client";

import { useCallback, useMemo, useState } from "react";
import { formatEther } from "ethers";

import {
  DEFAULT_PLATFORM_FEE_BPS,
  ETH_TO_USD_RATE,
  calculateUsdEstimate,
} from "@/lib/payments";

const SECONDS_PER_HOUR = 3600n;

export type PosCartItem = {
  agentId: number;
  agentName: string;
  hours: number;
  pricePerSecondWei: bigint;
  hourlyRateEth?: number;
  avatar?: string;
  metadata?: Record<string, unknown>;
};

export type PosCartTotals = {
  subtotalWei: bigint;
  platformFeeWei: bigint;
  totalWei: bigint;
  subtotalEth: number;
  platformFeeEth: number;
  totalEth: number;
  usdEstimate: number;
};

export type UsePosCartState = {
  items: PosCartItem[];
  totals: PosCartTotals;
  platformFeeBps: number;
  isEmpty: boolean;
  lastUpdatedAt: number;
  addOrUpdateItem: (item: PosCartItem) => void;
  setItemHours: (agentId: number, hours: number) => void;
  removeItem: (agentId: number) => void;
  clear: () => void;
  setPlatformFeeBps: (bps: number) => void;
};

function ensureBigInt(value: bigint | string | number): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Invalid numeric value for wei conversion");
    }
    return BigInt(Math.round(value));
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return 0n;
  }
  return BigInt(trimmed);
}

function normalizeHours(hours: number) {
  if (!Number.isFinite(hours) || Number.isNaN(hours)) {
    return 0;
  }
  if (hours <= 0) {
    return 0;
  }
  return Math.min(Math.round(hours), 168);
}

function computeTotals(
  items: PosCartItem[],
  platformFeeBps: number
): PosCartTotals {
  let subtotalWei = 0n;

  items.forEach((item) => {
    const hours = normalizeHours(item.hours);
    if (hours <= 0) {
      return;
    }
    const durationSeconds = BigInt(hours) * SECONDS_PER_HOUR;
    subtotalWei += ensureBigInt(item.pricePerSecondWei) * durationSeconds;
  });

  const platformFeeWei =
    (subtotalWei * BigInt(Math.max(platformFeeBps, 0))) / 10_000n;
  const totalWei = subtotalWei + platformFeeWei;

  const subtotalEth = Number(formatEther(subtotalWei));
  const platformFeeEth = Number(formatEther(platformFeeWei));
  const totalEth = Number(formatEther(totalWei));
  const usdEstimate = calculateUsdEstimate(totalEth);

  return {
    subtotalWei,
    platformFeeWei,
    totalWei,
    subtotalEth,
    platformFeeEth,
    totalEth,
    usdEstimate,
  } satisfies PosCartTotals;
}

export function usePosCart(initialItems: PosCartItem[] = []): UsePosCartState {
  const [items, setItems] = useState<PosCartItem[]>(() =>
    initialItems.map((item) => ({
      ...item,
      pricePerSecondWei: ensureBigInt(item.pricePerSecondWei),
      hours: normalizeHours(item.hours),
    }))
  );
  const [platformFeeBps, setPlatformFeeBpsState] = useState<number>(
    Number.isFinite(DEFAULT_PLATFORM_FEE_BPS) ? DEFAULT_PLATFORM_FEE_BPS : 250
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());

  const addOrUpdateItem = useCallback((item: PosCartItem) => {
    setItems((previous) => {
      const normalized: PosCartItem = {
        ...item,
        pricePerSecondWei: ensureBigInt(item.pricePerSecondWei),
        hours: normalizeHours(item.hours),
      };

      const index = previous.findIndex(
        (existing) => existing.agentId === normalized.agentId
      );
      if (index === -1) {
        return [...previous, normalized];
      }

      const next = previous.slice();
      next[index] = {
        ...previous[index],
        ...normalized,
      };
      return next;
    });
    setLastUpdatedAt(Date.now());
  }, []);

  const setItemHours = useCallback((agentId: number, hours: number) => {
    setItems((previous) => {
      const index = previous.findIndex((item) => item.agentId === agentId);
      if (index === -1) {
        return previous;
      }

      const next = previous.slice();
      next[index] = {
        ...previous[index],
        hours: normalizeHours(hours),
      };
      return next;
    });
    setLastUpdatedAt(Date.now());
  }, []);

  const removeItem = useCallback((agentId: number) => {
    setItems((previous) => previous.filter((item) => item.agentId !== agentId));
    setLastUpdatedAt(Date.now());
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setLastUpdatedAt(Date.now());
  }, []);

  const setPlatformFeeBps = useCallback((bps: number) => {
    setPlatformFeeBpsState(Math.max(0, Math.min(Math.trunc(bps), 5000)));
    setLastUpdatedAt(Date.now());
  }, []);

  const totals = useMemo(
    () => computeTotals(items, platformFeeBps),
    [items, platformFeeBps]
  );

  return {
    items,
    totals,
    platformFeeBps,
    isEmpty: items.length === 0,
    lastUpdatedAt,
    addOrUpdateItem,
    setItemHours,
    removeItem,
    clear,
    setPlatformFeeBps,
  } satisfies UsePosCartState;
}

export function formatUsd(amount: number) {
  if (!Number.isFinite(amount)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function estimateCreditsNeeded(totalEth: number) {
  if (!Number.isFinite(totalEth) || totalEth <= 0) {
    return 0;
  }
  // Assuming 1 credit equals $1 equivalent until facilitator exposes rates.
  const usd = totalEth * ETH_TO_USD_RATE;
  return Math.max(0, Math.ceil(usd));
}
