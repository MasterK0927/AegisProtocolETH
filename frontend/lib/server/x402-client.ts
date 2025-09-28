const DEFAULT_GATEWAY_URL =
  process.env.X402_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_X402_GATEWAY_URL ??
  "https://amoy.api.x402.xyz";

const DEFAULT_CREATE_PATH =
  process.env.X402_CREATE_PATH ?? "/v1/facilitator/orders";
const DEFAULT_CAPTURE_PATH =
  process.env.X402_CAPTURE_PATH ?? "/v1/facilitator/orders/{orderId}/capture";
const DEFAULT_REFUND_PATH =
  process.env.X402_REFUND_PATH ?? "/v1/facilitator/orders/{orderId}/refund";
const DEFAULT_DISPUTE_PATH =
  process.env.X402_DISPUTE_PATH ?? "/v1/facilitator/orders/{orderId}/dispute";
const DEFAULT_GET_PATH =
  process.env.X402_GET_PATH ?? "/v1/facilitator/orders/{orderId}";

export type X402ClientConfig = {
  gatewayUrl?: string;
  facilitatorId?: string;
  apiKey?: string;
};

export type X402CreateOrderInput = {
  amount: string;
  asset?: string;
  metadata?: Record<string, unknown>;
  renterAddress: string;
};

export type X402CreateOrderResponse = {
  orderId: string;
  status?: string;
  checkoutUrl?: string;
  raw?: unknown;
};

export type X402GenericResponse = {
  orderId: string;
  status?: string;
  raw?: unknown;
};

export class X402Client {
  private readonly gatewayUrl: string;
  private readonly facilitatorId?: string;
  private readonly apiKey?: string;

  constructor(config?: X402ClientConfig) {
    this.gatewayUrl = (config?.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(
      /\/$/,
      ""
    );
    this.facilitatorId =
      config?.facilitatorId ?? process.env.NEXT_PUBLIC_X402_FACILITATOR_ID;
    this.apiKey = config?.apiKey ?? process.env.X402_FACILITATOR_API_KEY;
  }

  isConfigured() {
    return Boolean(this.facilitatorId && this.apiKey);
  }

  private get headers() {
    const base: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      base.Authorization = `Bearer ${this.apiKey}`;
    }

    if (this.facilitatorId) {
      base["x-facilitator-id"] = this.facilitatorId;
    }

    return base;
  }

  private resolvePath(pathTemplate: string, orderId?: string) {
    return pathTemplate.replace("{orderId}", orderId ?? "");
  }

  private async request<T>(
    path: string,
    init: RequestInit & { method: "GET" | "POST" }
  ): Promise<T> {
    const url = `${this.gatewayUrl}${path}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...(init.headers ?? {}),
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
          ? String((body as Record<string, unknown>).message)
          : `Unexpected ${response.status} response from x402`;
      throw new Error(message);
    }

    return body as T;
  }

  async createOrder(
    input: X402CreateOrderInput
  ): Promise<X402CreateOrderResponse> {
    const payload = {
      amount: input.amount,
      asset: input.asset ?? "MATIC",
      renterAddress: input.renterAddress,
      metadata: {
        ...(input.metadata ?? {}),
        facilitatorId: this.facilitatorId,
      },
    } satisfies Record<string, unknown>;

    const path = this.resolvePath(DEFAULT_CREATE_PATH);
    const raw = await this.request<unknown>(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (
      typeof raw === "object" &&
      raw !== null &&
      "orderId" in raw &&
      typeof (raw as Record<string, unknown>).orderId === "string"
    ) {
      const body = raw as Record<string, unknown>;
      return {
        orderId: body.orderId as string,
        status: typeof body.status === "string" ? body.status : undefined,
        checkoutUrl:
          typeof body.checkoutUrl === "string" ? body.checkoutUrl : undefined,
        raw,
      } satisfies X402CreateOrderResponse;
    }

    throw new Error("x402 create order response missing orderId");
  }

  async captureOrder(orderId: string) {
    const path = this.resolvePath(DEFAULT_CAPTURE_PATH, orderId);
    const raw = await this.request<unknown>(path, {
      method: "POST",
      body: JSON.stringify({ orderId }),
    });

    return {
      orderId,
      status:
        typeof raw === "object" && raw !== null && "status" in raw
          ? String((raw as Record<string, unknown>).status)
          : undefined,
      raw,
    } satisfies X402GenericResponse;
  }

  async refundOrder(orderId: string, payload?: Record<string, unknown>) {
    const path = this.resolvePath(DEFAULT_REFUND_PATH, orderId);
    const raw = await this.request<unknown>(path, {
      method: "POST",
      body: JSON.stringify({ orderId, ...(payload ?? {}) }),
    });

    return {
      orderId,
      status:
        typeof raw === "object" && raw !== null && "status" in raw
          ? String((raw as Record<string, unknown>).status)
          : undefined,
      raw,
    } satisfies X402GenericResponse;
  }

  async disputeOrder(orderId: string, payload?: Record<string, unknown>) {
    const path = this.resolvePath(DEFAULT_DISPUTE_PATH, orderId);
    const raw = await this.request<unknown>(path, {
      method: "POST",
      body: JSON.stringify({ orderId, ...(payload ?? {}) }),
    });

    return {
      orderId,
      status:
        typeof raw === "object" && raw !== null && "status" in raw
          ? String((raw as Record<string, unknown>).status)
          : undefined,
      raw,
    } satisfies X402GenericResponse;
  }

  async fetchOrder(orderId: string) {
    const path = this.resolvePath(DEFAULT_GET_PATH, orderId);
    return this.request<unknown>(path, {
      method: "GET",
    });
  }
}

export function getX402Client(config?: X402ClientConfig) {
  return new X402Client(config);
}
