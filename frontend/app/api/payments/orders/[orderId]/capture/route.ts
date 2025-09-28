import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent, findOrderById, updateOrderStatus } from "../../../_store";
import { getX402Client } from "@/lib/server/x402-client";
import { mapFacilitatorStatus, toPublicOrder } from "../../../helpers";

export const runtime = "nodejs";

const captureSchema = z
  .object({
    idempotencyKey: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .optional();

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
      { error: "Order has no facilitator reference; cannot capture." },
      { status: 400 }
    );
  }

  if (order.status === "captured") {
    return NextResponse.json({ order: toPublicOrder(order) }, { status: 200 });
  }

  if (order.status === "refunded" || order.status === "disputed") {
    return NextResponse.json(
      { error: `Order is ${order.status} and cannot be captured.` },
      { status: 409 }
    );
  }

  const client = getX402Client();
  if (!client.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "X402 client is not configured. Set NEXT_PUBLIC_X402_FACILITATOR_ID and X402_FACILITATOR_API_KEY to capture payments.",
      },
      { status: 503 }
    );
  }

  let payload: { idempotencyKey?: string; metadata?: Record<string, unknown> } =
    {};
  if (request.headers.get("content-length")) {
    try {
      const json = await request.json();
      const parsed = captureSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      payload = parsed.data ?? {};
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON body" },
        { status: 400 }
      );
    }
  }

  await appendEvent(orderId, "facilitator-requested", {
    endpoint: "captureOrder",
    facilitatorOrderId: order.facilitatorOrderId,
    payload,
  });

  try {
    const response = await client.captureOrder(order.facilitatorOrderId);

    await appendEvent(orderId, "facilitator-response", {
      endpoint: "captureOrder",
      status: response.status,
    });

    const nextStatus = mapFacilitatorStatus(response.status) ?? "captured";
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
        : "Failed to capture facilitator order";
    await appendEvent(orderId, "error", {
      message,
      stage: "captureOrder",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
