import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent, findOrderById, updateOrderStatus } from "../../../_store";
import { getX402Client } from "@/lib/server/x402-client";
import { mapFacilitatorStatus, toPublicOrder } from "../../../helpers";

export const runtime = "nodejs";

const refundSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  amountWei: z
    .string()
    .regex(/^[0-9]+$/, "amountWei must be a decimal string")
    .optional(),
  amountEth: z
    .string()
    .regex(/^[0-9]+(\.[0-9]+)?$/)
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: { orderId?: string } }
) {
  const orderId = context.params.orderId;
  if (!orderId) {
    return NextResponse.json(
      { error: "Missing order identifier" },
      { status: 400 }
    );
  }

  const order = await findOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!order.facilitatorOrderId) {
    return NextResponse.json(
      { error: "Order has no facilitator reference; cannot request refund." },
      { status: 400 }
    );
  }

  if (order.status !== "captured") {
    return NextResponse.json(
      { error: `Order status ${order.status} cannot be refunded.` },
      { status: 409 }
    );
  }

  const client = getX402Client();
  if (!client.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "X402 client is not configured. Set NEXT_PUBLIC_X402_FACILITATOR_ID and X402_FACILITATOR_API_KEY to refund payments.",
      },
      { status: 503 }
    );
  }

  let payload: z.infer<typeof refundSchema> = {};
  try {
    const json = await request.json();
    const parsed = refundSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  await appendEvent(orderId, "facilitator-requested", {
    endpoint: "refundOrder",
    facilitatorOrderId: order.facilitatorOrderId,
    payload,
  });

  try {
    const response = await client.refundOrder(order.facilitatorOrderId, {
      reason: payload.reason,
      amountWei: payload.amountWei,
      amountEth: payload.amountEth,
      metadata: payload.metadata,
    });

    await appendEvent(orderId, "facilitator-response", {
      endpoint: "refundOrder",
      status: response.status,
    });

    const nextStatus = mapFacilitatorStatus(response.status) ?? "refunded";
    const updated = await updateOrderStatus(orderId, nextStatus, {
      facilitatorStatus: response.status,
    });

    return NextResponse.json(
      { order: toPublicOrder(updated ?? order) },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to refund facilitator order";
    await appendEvent(orderId, "error", {
      message,
      stage: "refundOrder",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
