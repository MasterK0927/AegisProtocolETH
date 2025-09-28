import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "ethers";
import { z } from "zod";

import {
  appendEvent,
  findOrderById,
  listOrders,
  saveOrder,
  updateOrderStatus,
  type StoredOrder,
} from "../_store";
import { getX402Client } from "@/lib/server/x402-client";
import {
  buildCreatedEvent,
  calculateUsdEstimate,
  mapFacilitatorStatus,
  toPublicOrder,
} from "../helpers";

const DEFAULT_PLATFORM_FEE_BPS = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS ??
    process.env.PLATFORM_FEE_BPS ??
    process.env.NEXT_PUBLIC_RENTAL_PLATFORM_FEE_BPS ??
    250
);

const addressRegex = /^0x[a-fA-F0-9]{40}$/;

const createOrderSchema = z.object({
  agentId: z.number().int().nonnegative(),
  agentName: z.string().trim().min(1).max(120).optional(),
  renterAddress: z.string().regex(addressRegex, "Invalid renter address"),
  hours: z.number().int().min(1).max(168),
  pricePerSecondWei: z
    .string()
    .regex(/^[0-9]+$/, "pricePerSecondWei must be a decimal string"),
  platformFeeBps: z.number().int().min(0).max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
  allowSimulation: z.boolean().optional(),
});

const listOrdersSchema = z.object({
  renter: z.string().regex(addressRegex, "Invalid renter address").optional(),
  agentId: z.coerce.number().int().nonnegative().optional(),
  status: z
    .enum([
      "pending",
      "awaiting_capture",
      "captured",
      "refunded",
      "disputed",
      "failed",
    ])
    .optional(),
});

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = listOrdersSchema.safeParse(query);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const orders = await listOrders({
    renterAddress: parsed.data.renter,
    agentId: parsed.data.agentId,
    status: parsed.data.status,
  });

  return NextResponse.json({
    orders: orders.map(toPublicOrder),
  });
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      agentId,
      agentName,
      renterAddress,
      hours,
      pricePerSecondWei,
      platformFeeBps,
      metadata,
      allowSimulation,
    } = parsed.data;

    const pricePerSecond = BigInt(pricePerSecondWei);
    const durationSeconds = BigInt(hours) * 3600n;
    const subtotalWei = pricePerSecond * durationSeconds;
    const feeBps = platformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS;
    const platformFeeWei = (subtotalWei * BigInt(feeBps)) / 10_000n;
    const totalWei = subtotalWei + platformFeeWei;
    const subtotalEthString = formatEther(subtotalWei);
    const totalEthString = formatEther(totalWei);
    const totalEth = Number(totalEthString);
    const usdEstimate = calculateUsdEstimate(totalEth);

    const orderId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const order: StoredOrder = {
      id: orderId,
      facilitatorOrderId: null,
      agentId,
      agentName,
      renterAddress: renterAddress.toLowerCase(),
      hours,
      subtotalWei: subtotalWei.toString(),
      platformFeeWei: platformFeeWei.toString(),
      totalWei: totalWei.toString(),
      usdEstimate,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      metadata,
      events: [
        buildCreatedEvent(orderId, {
          agentId,
          renterAddress,
          hours,
          subtotalWei: subtotalWei.toString(),
          platformFeeWei: platformFeeWei.toString(),
          totalWei: totalWei.toString(),
          usdEstimate,
        }),
      ],
    };

    await saveOrder(order);
    
    const client = getX402Client();

    if (!client.isConfigured()) {
      if (!allowSimulation) {
        await appendEvent(orderId, "error", {
          message:
            "X402 client is not configured. Set NEXT_PUBLIC_X402_FACILITATOR_ID and X402_FACILITATOR_API_KEY to enable live payments.",
        });
        return NextResponse.json(
          {
            error:
              "x402 facilitator credentials are missing. Enable simulation or configure environment variables.",
            order: toPublicOrder(order),
          },
          { status: 503 }
        );
      }

      await appendEvent(orderId, "facilitator-response", {
        message: "Operating in simulation mode; no live x402 order created.",
      });

      return NextResponse.json(
        {
          order: toPublicOrder(order),
          simulation: true,
        },
        { status: 201 }
      );
    }

    await appendEvent(orderId, "facilitator-requested", {
      endpoint: "createOrder",
      amountWei: order.totalWei,
      amountEth: totalEthString,
      renterAddress,
      agentId,
      hours,
    });

    try {
      const facilitatorOrder = await client.createOrder({
        amount: totalEthString,
        renterAddress,
        metadata: {
          agentId,
          agentName,
          hours,
          subtotalWei: order.subtotalWei,
          subtotalEth: subtotalEthString,
          platformFeeWei: order.platformFeeWei,
          platformFeeEth: formatEther(platformFeeWei),
          totalWei: order.totalWei,
          totalEth: totalEthString,
          usdEstimate: order.usdEstimate,
        },
      });

      await appendEvent(orderId, "facilitator-response", {
        endpoint: "createOrder",
        status: facilitatorOrder.status,
        checkoutUrl: facilitatorOrder.checkoutUrl,
      });

      const updated = await findOrderById(orderId);
      if (updated) {
        updated.facilitatorOrderId = facilitatorOrder.orderId;
        updated.status =
          mapFacilitatorStatus(facilitatorOrder.status) ?? "awaiting_capture";
        updated.updatedAt = new Date().toISOString();
        await saveOrder(updated);
        return NextResponse.json(
          {
            order: toPublicOrder(updated),
            checkoutUrl: facilitatorOrder.checkoutUrl,
          },
          { status: 201 }
        );
      }

      const fallback = await findOrderById(orderId);
      return NextResponse.json(
        {
          order: fallback ? toPublicOrder(fallback) : toPublicOrder(order),
        },
        { status: 201 }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create x402 order";
      await appendEvent(orderId, "error", {
        message,
        stage: "createOrder",
      });
      await updateOrderStatus(orderId, "failed", { reason: message });
      return NextResponse.json(
        {
          error: message,
          order: toPublicOrder((await findOrderById(orderId)) ?? order),
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
