"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  captureOrder,
  createCheckoutOrder,
  disputeOrder,
  listOrders,
  mergeOrders,
  refundOrder,
} from "@/lib/payments";
import {
  CreateCheckoutOrderPayload,
  CreateCheckoutOrderResult,
  ListOrdersParams,
  PaymentOrder,
  PaymentsApiError,
  CaptureOrderPayload,
  DisputeOrderPayload,
  RefundOrderPayload,
} from "@/lib/payments/types";

type UsePaymentsFilters = Omit<ListOrdersParams, "signal">;

type UsePaymentsOptions = UsePaymentsFilters & {
  autoRefresh?: boolean;
  pollIntervalMs?: number;
};

type UsePaymentsState = {
  orders: PaymentOrder[];
  isLoading: boolean;
  error: Error | null;
  filters: UsePaymentsFilters;
  createOrder: (
    payload: CreateCheckoutOrderPayload,
    options?: { signal?: AbortSignal }
  ) => Promise<CreateCheckoutOrderResult>;
  capture: (
    orderId: string,
    payload?: CaptureOrderPayload,
    options?: { signal?: AbortSignal }
  ) => Promise<PaymentOrder>;
  refund: (
    orderId: string,
    payload: RefundOrderPayload,
    options?: { signal?: AbortSignal }
  ) => Promise<PaymentOrder>;
  dispute: (
    orderId: string,
    payload: DisputeOrderPayload,
    options?: { signal?: AbortSignal }
  ) => Promise<PaymentOrder>;
  refresh: (
    overrideFilters?: UsePaymentsFilters
  ) => Promise<PaymentOrder[] | null>;
  setFilters: (
    updates: Partial<UsePaymentsFilters>
  ) => Promise<PaymentOrder[] | null>;
};

function normalizeFilters(filters: UsePaymentsFilters): UsePaymentsFilters {
  const normalized: UsePaymentsFilters = { ...filters };
  if (normalized.renter) {
    normalized.renter = normalized.renter.toLowerCase();
  }
  return normalized;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function usePayments(
  options: UsePaymentsOptions = {}
): UsePaymentsState {
  const {
    autoRefresh = true,
    pollIntervalMs = 0,
    renter,
    agentId,
    status,
  } = options;

  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<UsePaymentsFilters>(() =>
    normalizeFilters({ renter, agentId, status })
  );

  const abortRef = useRef<AbortController | null>(null);
  const filtersRef = useRef<UsePaymentsFilters>(filters);

  const runFetch = useCallback(
    async (
      activeFilters: UsePaymentsFilters
    ): Promise<PaymentOrder[] | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const { orders: fetched } = await listOrders({
          ...activeFilters,
          signal: controller.signal,
        });
        setOrders(fetched);
        setError(null);
        return fetched;
      } catch (err) {
        if (isAbortError(err)) {
          return null;
        }
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(
    async (overrideFilters?: UsePaymentsFilters) => {
      const nextFilters = normalizeFilters(
        overrideFilters
          ? { ...filtersRef.current, ...overrideFilters }
          : filtersRef.current
      );
      filtersRef.current = nextFilters;
      setFiltersState(nextFilters);
      return runFetch(nextFilters);
    },
    [runFetch]
  );

  const setFilters = useCallback(
    (updates: Partial<UsePaymentsFilters>) => {
      return refresh({ ...filtersRef.current, ...updates });
    },
    [refresh]
  );

  const pollInterval = pollIntervalMs;
  const shouldAutoRefresh = autoRefresh;

  useEffect(() => {
    if (!shouldAutoRefresh) {
      return;
    }
    refresh().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldAutoRefresh || pollInterval <= 0) {
      return undefined;
    }

    const handle = setInterval(() => {
      refresh().catch((err) => {
        if (!(err instanceof PaymentsApiError)) {
          console.error("Failed to refresh payments list", err);
        }
      });
    }, pollInterval);

    return () => {
      clearInterval(handle);
    };
  }, [pollInterval, refresh, shouldAutoRefresh]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const next = normalizeFilters({ renter, agentId, status });
    const hasChanges =
      filtersRef.current.renter !== next.renter ||
      filtersRef.current.agentId !== next.agentId ||
      filtersRef.current.status !== next.status;

    if (!hasChanges) {
      return;
    }

    filtersRef.current = next;
    setFiltersState(next);
    refresh(next).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, renter, status]);

  const createOrder = useCallback<UsePaymentsState["createOrder"]>(
    async (payload, options) => {
      const result = await createCheckoutOrder(payload, options);
      setOrders((previous) => mergeOrders(previous, [result.order]));
      return result;
    },
    []
  );

  const capture = useCallback<UsePaymentsState["capture"]>(
    async (orderId, payload, options) => {
      const order = await captureOrder(orderId, payload, options);
      setOrders((previous) => mergeOrders(previous, [order]));
      return order;
    },
    []
  );

  const refund = useCallback<UsePaymentsState["refund"]>(
    async (orderId, payload, options) => {
      const order = await refundOrder(orderId, payload, options);
      setOrders((previous) => mergeOrders(previous, [order]));
      return order;
    },
    []
  );

  const dispute = useCallback<UsePaymentsState["dispute"]>(
    async (orderId, payload, options) => {
      const order = await disputeOrder(orderId, payload, options);
      setOrders((previous) => mergeOrders(previous, [order]));
      return order;
    },
    []
  );

  const enhancedOrders = useMemo(() => orders, [orders]);

  return {
    orders: enhancedOrders,
    isLoading,
    error,
    filters,
    createOrder,
    capture,
    refund,
    dispute,
    refresh,
    setFilters,
  } satisfies UsePaymentsState;
}
