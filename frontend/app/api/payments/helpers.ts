import { formatEther } from "ethers";

import type { PaymentEvent, PaymentStatus, StoredOrder } from "./_store";

export const ETH_TO_USD_RATE = Number(
  process.env.NEXT_PUBLIC_ETH_USD_RATE ?? process.env.ETH_USD_RATE ?? 2500
);

export function calculateUsdEstimate(totalEth: number) {
  return Number.isFinite(totalEth) ? Number(totalEth * ETH_TO_USD_RATE) : 0;
}

export function mapFacilitatorStatus(
  status?: string
): PaymentStatus | undefined {
  if (!status) {
    return undefined;
  }

  const normalized = status.toLowerCase();
  switch (normalized) {
    case "pending":
      return "pending";
    case "awaiting_capture":
    case "requires_capture":
      return "awaiting_capture";
    case "captured":
    case "settled":
    case "completed":
      return "captured";
    case "refunded":
    case "reversed":
      return "refunded";
    case "disputed":
      return "disputed";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      return undefined;
  }
}

export function toPublicOrder(order: StoredOrder) {
  const subtotalEth = Number(formatEther(order.subtotalWei));
  const platformFeeEth = Number(formatEther(order.platformFeeWei));
  const totalEth = Number(formatEther(order.totalWei));

  return {
    id: order.id,
    facilitatorOrderId: order.facilitatorOrderId ?? null,
    agentId: order.agentId,
    agentName: order.agentName,
    renterAddress: order.renterAddress,
    hours: order.hours,
    totals: {
      subtotalWei: order.subtotalWei,
      platformFeeWei: order.platformFeeWei,
      totalWei: order.totalWei,
      subtotalEth,
      platformFeeEth,
      totalEth,
      usdEstimate: order.usdEstimate,
    },
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    metadata: order.metadata ?? {},
    events: order.events.map((event: PaymentEvent) => ({ ...event })),
  } satisfies Record<string, unknown>;
}

export function buildCreatedEvent(
  orderId: string,
  payload: Record<string, unknown>
): PaymentEvent {
  return {
    id: crypto.randomUUID(),
    orderId,
    type: "created",
    createdAt: new Date().toISOString(),
    payload,
  } satisfies PaymentEvent;
}
