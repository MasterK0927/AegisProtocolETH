import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { appendEvent, findOrderById, updateOrderStatus } from "../../../_store";
import { getX402Client } from "@/lib/server/x402-client";
import { mapFacilitatorStatus, toPublicOrder } from "../../../helpers";

export const runtime = "nodejs";

const disputeSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  evidenceUrl: z.string().url().optional(),
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
      { error: "Order has no facilitator reference; cannot dispute." },
      { status: 400 }
    );
  }

  if (order.status === "refunded") {
    return NextResponse.json(
      { error: "Refunded orders cannot be disputed." },
      { status: 409 }
    );
  }

  const client = getX402Client();
  if (!client.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "X402 client is not configured. Set NEXT_PUBLIC_X402_FACILITATOR_ID and X402_FACILITATOR_API_KEY to dispute payments.",
      },
      { status: 503 }
    );
  }

  let payload: z.infer<typeof disputeSchema>;
  try {
    const json = await request.json();
    const parsed = disputeSchema.safeParse(json);
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
    endpoint: "disputeOrder",
    facilitatorOrderId: order.facilitatorOrderId,
    payload,
  });

  try {
    const response = await client.disputeOrder(
      order.facilitatorOrderId,
      payload
    );

    await appendEvent(orderId, "facilitator-response", {
      endpoint: "disputeOrder",
      status: response.status,
    });

    const nextStatus = mapFacilitatorStatus(response.status) ?? "disputed";
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
        : "Failed to dispute facilitator order";
    await appendEvent(orderId, "error", {
      message,
      stage: "disputeOrder",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
