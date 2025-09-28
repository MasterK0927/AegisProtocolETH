import { promises as fs } from "fs";
import path from "path";

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

export type StoredOrder = {
  id: string;
  facilitatorOrderId?: string | null;
  agentId: number;
  agentName?: string;
  renterAddress: string;
  hours: number;
  subtotalWei: string;
  platformFeeWei: string;
  totalWei: string;
  usdEstimate: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  events: PaymentEvent[];
};

const DATA_FILE = path.join(process.cwd(), ".next/cache/x402-orders.json");

let cachedOrders: StoredOrder[] | null = null;
let loadPromise: Promise<void> | null = null;

async function ensureLoaded() {
  if (cachedOrders) {
    return;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        cachedOrders = JSON.parse(raw) as StoredOrder[];
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          cachedOrders = [];
        } else {
          throw error;
        }
      }
    })();
  }

  await loadPromise;
  cachedOrders ??= [];
}

async function persist() {
  if (!cachedOrders) {
    return;
  }

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(cachedOrders, null, 2), "utf8");
}

export async function listOrders(filter?: {
  renterAddress?: string;
  agentId?: number;
  status?: PaymentStatus;
}): Promise<StoredOrder[]> {
  await ensureLoaded();

  if (!cachedOrders) {
    return [];
  }

  const renter = filter?.renterAddress?.toLowerCase();
  const agentId = filter?.agentId;
  const status = filter?.status;

  return cachedOrders.filter((order) => {
    const matchesRenter = renter
      ? order.renterAddress.toLowerCase() === renter
      : true;
    const matchesAgent = agentId != null ? order.agentId === agentId : true;
    const matchesStatus = status ? order.status === status : true;
    return matchesRenter && matchesAgent && matchesStatus;
  });
}

export async function findOrderById(
  orderId: string
): Promise<StoredOrder | null> {
  await ensureLoaded();
  if (!cachedOrders) {
    return null;
  }

  return cachedOrders.find((order) => order.id === orderId) ?? null;
}

export async function saveOrder(order: StoredOrder): Promise<StoredOrder> {
  await ensureLoaded();
  if (!cachedOrders) {
    cachedOrders = [];
  }

  const index = cachedOrders.findIndex((existing) => existing.id === order.id);
  if (index >= 0) {
    cachedOrders[index] = order;
  } else {
    cachedOrders.push(order);
  }

  await persist();
  return order;
}

export async function appendEvent(
  orderId: string,
  type: PaymentEventType,
  payload?: Record<string, unknown>
): Promise<PaymentEvent | null> {
  const order = await findOrderById(orderId);
  if (!order) {
    return null;
  }

  const event: PaymentEvent = {
    id: crypto.randomUUID(),
    orderId,
    type,
    createdAt: new Date().toISOString(),
    payload,
  };

  order.events.push(event);
  order.updatedAt = event.createdAt;
  await saveOrder(order);
  return event;
}

export async function updateOrderStatus(
  orderId: string,
  status: PaymentStatus,
  payload?: Record<string, unknown>
): Promise<StoredOrder | null> {
  const order = await findOrderById(orderId);
  if (!order) {
    return null;
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  await appendEvent(orderId, "status-changed", {
    status,
    ...(payload ?? {}),
  });
  await saveOrder(order);
  return order;
}
