"use client";

import { format } from "date-fns";
import { FileText, Loader2, Receipt, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/hooks/use-pos-cart";
import type {
  PaymentEvent,
  PaymentOrder,
  PaymentStatus,
} from "@/lib/payments/types";

const STATUS_LABELS: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  awaiting_capture: {
    label: "Awaiting capture",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  captured: {
    label: "Captured",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  refunded: {
    label: "Refunded",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  },
  disputed: {
    label: "Disputed",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

type TransactionTimelineProps = {
  orders: PaymentOrder[];
  isLoading?: boolean;
  onRefresh?: () => Promise<PaymentOrder[] | null>;
};

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${format(date, "MMM d yyyy • HH:mm")} UTC`;
}

function EventRow({ event }: { event: PaymentEvent }) {
  return (
    <div className="relative pl-6">
      <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-muted-foreground" />
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="capitalize">{event.type.replace(/-/g, " ")}</span>
          <span className="text-muted-foreground">
            {formatTimestamp(event.createdAt)}
          </span>
        </div>
        {event.payload ? (
          <pre className="max-h-28 overflow-auto rounded-md bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  isLoading,
  onRefresh,
}: {
  isLoading?: boolean;
  onRefresh?: () => Promise<PaymentOrder[] | null>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Receipt className="h-8 w-8" />
        )}
        <p className="text-sm">No payments recorded yet for this agent.</p>
        {onRefresh ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRefresh()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function TransactionTimeline({
  orders,
  isLoading,
  onRefresh,
}: TransactionTimelineProps) {
  if (!orders || orders.length === 0) {
    return <EmptyState isLoading={isLoading} onRefresh={onRefresh} />;
  }

  const sorted = [...orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <ScrollArea className="h-64 w-full rounded-md border">
      <div className="space-y-4 p-4">
        {sorted.map((order) => {
          const statusMeta = STATUS_LABELS[order.status];
          const icon =
            order.status === "refunded" || order.status === "failed" ? (
              <ShieldAlert className="h-4 w-4 text-red-500" />
            ) : (
              <FileText className="h-4 w-4 text-primary" />
            );
          return (
            <Card key={order.id} className="border-muted">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {icon}
                  <CardTitle className="text-sm">
                    Order {order.id.slice(0, 8)}…
                  </CardTitle>
                </div>
                <Badge
                  className={cn(
                    "border text-xs capitalize",
                    statusMeta.className
                  )}
                >
                  {statusMeta.label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span>Total</span>
                  <span className="font-medium">
                    {order.totals.totalEth.toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>≈ {formatUsd(order.totals.usdEstimate)}</span>
                  <span>{formatTimestamp(order.createdAt)}</span>
                </div>
                <Separator />
                <div className="space-y-3">
                  {order.events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
