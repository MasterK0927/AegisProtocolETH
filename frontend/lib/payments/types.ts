"use client";

export type PaymentStatus =
  | "pending"
  | "awaiting_capture"
  | "captured"
  | "refunded"
  | "disputed"
  | "failed";

export type PaymentEventType =
  | "created"
  | "facilitator-requested"
  | "facilitator-response"
  | "status-changed"
  | "error";

export type PaymentEvent = {
  id: string;
  orderId: string;
  type: PaymentEventType;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type PaymentTotals = {
  subtotalWei: string;
  platformFeeWei: string;
  totalWei: string;
  subtotalEth: number;
  platformFeeEth: number;
  totalEth: number;
  usdEstimate: number;
};

export type PaymentOrder = {
  id: string;
  facilitatorOrderId: string | null;
  agentId: number;
  agentName?: string;
  renterAddress: string;
  hours: number;
  totals: PaymentTotals;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  events: PaymentEvent[];
};

export type PaymentsApiErrorPayload = {
  error?: string;
  details?: unknown;
  [key: string]: unknown;
};

export class PaymentsApiError extends Error {
  status: number;
  data?: PaymentsApiErrorPayload;

  constructor(message: string, status: number, data?: PaymentsApiErrorPayload) {
    super(message);
    this.name = "PaymentsApiError";
    this.status = status;
    this.data = data;
  }
}

export type CreateCheckoutOrderPayload = {
  agentId: number;
  agentName?: string;
  renterAddress: string;
  hours: number;
  pricePerSecondWei: string;
  platformFeeBps?: number;
  metadata?: Record<string, unknown>;
  allowSimulation?: boolean;
};

export type CreateCheckoutOrderResult = {
  order: PaymentOrder;
  checkoutUrl?: string;
  simulation?: boolean;
};

export type ListOrdersParams = {
  renter?: string;
  agentId?: number;
  status?: PaymentStatus;
  signal?: AbortSignal;
};

export type CaptureOrderPayload = {
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type RefundOrderPayload = {
  reason?: string;
  amountWei?: string;
  amountEth?: string;
  metadata?: Record<string, unknown>;
};

export type DisputeOrderPayload = {
  reason: string;
  evidenceUrl?: string;
  metadata?: Record<string, unknown>;
};

export type ListOrdersResponse = {
  orders: PaymentOrder[];
};
