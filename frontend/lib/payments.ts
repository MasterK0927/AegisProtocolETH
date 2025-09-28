"use client";

import { formatEther } from "ethers";

import {
  CaptureOrderPayload,
  CreateCheckoutOrderPayload,
  CreateCheckoutOrderResult,
  DisputeOrderPayload,
  ListOrdersParams,
  ListOrdersResponse,
  PaymentOrder,
  PaymentsApiError,
  PaymentsApiErrorPayload,
  RefundOrderPayload,
} from "@/lib/payments/types";

const ORDERS_ENDPOINT = "/api/payments/orders";

export const ETH_TO_USD_RATE = Number(
  process.env.NEXT_PUBLIC_ETH_USD_RATE ?? process.env.ETH_USD_RATE ?? 2500
);

export const DEFAULT_PLATFORM_FEE_BPS = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS ??
    process.env.PLATFORM_FEE_BPS ??
    process.env.NEXT_PUBLIC_RENTAL_PLATFORM_FEE_BPS ??
    250
);

type RequestOptions = {
  signal?: AbortSignal;
};

async function parseJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    if ((error as Error).name === "SyntaxError") {
      return undefined;
    }
    throw error;
  }
}

async function throwApiError(response: Response): Promise<never> {
  const data = (await parseJson(response)) as
    | PaymentsApiErrorPayload
    | undefined;
  const message =
    (typeof data?.error === "string" && data.error.length > 0
      ? data.error
      : response.statusText) || "Unexpected payments API error";
  throw new PaymentsApiError(message, response.status, data);
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  return (await response.json()) as T;
}

function buildQuery(params: Omit<ListOrdersParams, "signal">) {
  const search = new URLSearchParams();
  if (params.renter) {
    search.set("renter", params.renter);
  }
  if (typeof params.agentId === "number") {
    search.set("agentId", String(params.agentId));
  }
  if (params.status) {
    search.set("status", params.status);
  }
  const queryString = search.toString();
  return queryString ? `${ORDERS_ENDPOINT}?${queryString}` : ORDERS_ENDPOINT;
}

export function calculateUsdEstimate(totalEth: number) {
  if (!Number.isFinite(totalEth)) {
    return 0;
  }
  return Number(totalEth * ETH_TO_USD_RATE);
}

export function weiToEth(wei: string | bigint) {
  const value = typeof wei === "bigint" ? wei : BigInt(wei);
  return Number(formatEther(value));
}

export async function createCheckoutOrder(
  payload: CreateCheckoutOrderPayload,
  options?: RequestOptions
): Promise<CreateCheckoutOrderResult> {
  return request<CreateCheckoutOrderResult>(ORDERS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
    signal: options?.signal,
  });
}

export async function listOrders(
  params: ListOrdersParams = {}
): Promise<ListOrdersResponse> {
  const { signal, ...query } = params;
  const url = buildQuery(query);
  return request<ListOrdersResponse>(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });
}

export async function captureOrder(
  orderId: string,
  payload?: CaptureOrderPayload,
  options?: RequestOptions
): Promise<PaymentOrder> {
  const data = await request<{ order: PaymentOrder }>(
    `${ORDERS_ENDPOINT}/${orderId}/capture`,
    {
      method: "POST",
      body: payload ? JSON.stringify(payload) : undefined,
      signal: options?.signal,
    }
  );
  return data.order;
}

export async function refundOrder(
  orderId: string,
  payload: RefundOrderPayload,
  options?: RequestOptions
): Promise<PaymentOrder> {
  const data = await request<{ order: PaymentOrder }>(
    `${ORDERS_ENDPOINT}/${orderId}/refund`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options?.signal,
    }
  );
  return data.order;
}

export async function disputeOrder(
  orderId: string,
  payload: DisputeOrderPayload,
  options?: RequestOptions
): Promise<PaymentOrder> {
  const data = await request<{ order: PaymentOrder }>(
    `${ORDERS_ENDPOINT}/${orderId}/dispute`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options?.signal,
    }
  );
  return data.order;
}

export function extractCheckoutUrl(result: CreateCheckoutOrderResult) {
  return result.checkoutUrl ?? null;
}

export function isSimulation(result: CreateCheckoutOrderResult) {
  return Boolean(result.simulation);
}

export function mergeOrders(
  existing: PaymentOrder[],
  incoming: PaymentOrder[]
) {
  const map = new Map<string, PaymentOrder>();
  existing.forEach((order) => map.set(order.id, order));
  incoming.forEach((order) => map.set(order.id, order));
  return Array.from(map.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}
