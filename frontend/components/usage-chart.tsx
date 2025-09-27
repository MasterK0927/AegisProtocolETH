"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface UsageChartProps {
  data: Array<{
    date: string
    rentals: number
  }>
  compact?: boolean
}

export function UsageChart({ data, compact = false }: UsageChartProps) {
  return (
    <div className={compact ? "h-16 w-full" : "h-64 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {!compact && (
            <>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { weekday: "short" })}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value) => [`${value} rentals`, "Usage"]}
              />
            </>
          )}
          <Line
            type="monotone"
            dataKey="rentals"
            stroke="hsl(var(--primary))"
            strokeWidth={compact ? 1.5 : 2}
            dot={compact ? false : { fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            activeDot={compact ? false : { r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
