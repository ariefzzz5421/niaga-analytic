"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { compactIdr, fullIdr, fullNumber, percent, truncate } from "@/lib/format";
import type { ProductMetrics } from "@/lib/types";

import { ChartFrame, SingleLineTick, TooltipCard } from "./ChartFrame";

/**
 * Horizontal bars ranked by estimated revenue. Magnitude against a category
 * axis of product names, so a single sequential hue carries the value and
 * the name does the identifying — no per-bar colour cycling.
 */
export function TopProducts({ products, limit = 10 }: { products: ProductMetrics[]; limit?: number }) {
  const top = products.slice(0, limit).map((p) => ({
    id: p.id,
    // Short enough that Recharts renders each tick on one line at the
    // axis width below; the full name lives in the tooltip and table.
    label: truncate(p.name, 26),
    fullName: p.name,
    revenue: p.revenue,
    sold: p.sold,
    price: p.price,
    share: p.revenueShare,
  }));

  const max = top[0]?.revenue ?? 1;

  const rows = top.map((p) => [
    p.fullName,
    fullIdr(p.revenue),
    fullNumber(p.sold),
    percent(p.share, 1),
  ]);

  return (
    <ChartFrame
      title={`Top ${top.length} listings by estimated revenue`}
      subtitle="Price multiplied by the platform's lifetime sold counter."
      columns={["Listing", "Revenue", "Units", "Share"]}
      rows={rows}
      height={Math.max(280, top.length * 34 + 40)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 4 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => compactIdr(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={200}
            tickLine={false}
            axisLine={false}
            tick={<SingleLineTick />}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof top)[number];
              return (
                <TooltipCard
                  label={p.fullName}
                  rows={[
                    { key: "Revenue", value: fullIdr(p.revenue), color: "var(--series-1)" },
                    { key: "Units sold", value: fullNumber(p.sold) },
                    { key: "Price", value: fullIdr(p.price) },
                    { key: "Share of store", value: percent(p.share, 1) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {top.map((p) => (
              // One hue, stepped by magnitude — the ramp reinforces the ranking
              // instead of implying eight unrelated categories. The dark end
              // stops at step 550; anything darker drops under 2:1 on this surface.
              <Cell
                key={p.id}
                fill={p.revenue / max > 0.66 ? "var(--seq-250)" : p.revenue / max > 0.33 ? "var(--seq-400)" : "var(--seq-550)"}
                stroke="var(--surface-1)"
                strokeWidth={2}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
