"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { compactIdr, compactNumber, fullIdr, fullNumber, monthLabel } from "@/lib/format";
import type { TimePoint } from "@/lib/types";

import { ChartFrame, TooltipCard } from "./ChartFrame";

export function RevenueTrend({ data }: { data: TimePoint[] }) {
  const rows = data.map((p) => [monthLabel(p.month), fullIdr(p.revenue), fullNumber(p.units)]);

  return (
    <ChartFrame
      title="Estimated monthly revenue"
      subtitle="Lifetime revenue distributed across the months each listing has been live."
      footnote="Modelled, not reported. Marketplaces publish only a lifetime sold counter — the monthly split is inferred from listing age."
      columns={["Month", "Revenue", "Units"]}
      rows={rows}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.34} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(v: number) => compactIdr(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={86}
          />
          <Tooltip
            cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as TimePoint;
              return (
                <TooltipCard
                  label={monthLabel(String(label))}
                  rows={[
                    { key: "Revenue", value: fullIdr(point.revenue), color: "var(--series-1)" },
                    { key: "Units", value: compactNumber(point.units) },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#revenue-fill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-1)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
