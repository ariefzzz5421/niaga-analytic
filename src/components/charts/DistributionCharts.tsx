"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { compactIdr, fullIdr, fullNumber, percent, truncate } from "@/lib/format";
import type { Bucket } from "@/lib/types";

import { ChartFrame, SingleLineTick, TooltipCard } from "./ChartFrame";

/** Revenue split across price bands — where the money actually comes from. */
export function PriceBandChart({ buckets }: { buckets: Bucket[] }) {
  const total = buckets.reduce((s, b) => s + b.revenue, 0) || 1;
  const data = buckets.map((b) => ({ ...b, share: b.revenue / total }));

  const rows = data.map((b) => [b.label, fullIdr(b.revenue), String(b.count), percent(b.share, 1)]);

  return (
    <ChartFrame
      title="Revenue by price band"
      subtitle="Which price points carry the store, versus how many listings sit there."
      columns={["Band", "Revenue", "Listings", "Share"]}
      rows={rows}
      height={260}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid strokeDasharray="0" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis
            tickFormatter={(v: number) => compactIdr(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={86}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0].payload as (typeof data)[number];
              return (
                <TooltipCard
                  label={`Price band ${label}`}
                  rows={[
                    { key: "Revenue", value: fullIdr(b.revenue), color: "var(--series-1)" },
                    { key: "Listings", value: String(b.count) },
                    { key: "Units", value: fullNumber(b.units) },
                    { key: "Share", value: percent(b.share, 1) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="revenue"
            radius={[4, 4, 0, 0]}
            fill="var(--series-1)"
            maxBarSize={64}
            stroke="var(--surface-1)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="count"
              position="top"
              // The count is the second measure — labelling it here avoids the
              // dual-axis trap while keeping both numbers on one chart.
              formatter={(v: React.ReactNode) => `${v} SKU`}
              style={{ fill: "var(--text-muted)", fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Revenue by category, capped and folded into "Lainnya" upstream. */
export function CategoryChart({ buckets }: { buckets: Bucket[] }) {
  const total = buckets.reduce((s, b) => s + b.revenue, 0) || 1;
  const data = buckets.map((b) => ({
    ...b,
    short: truncate(b.label, 24),
    share: b.revenue / total,
  }));

  const rows = data.map((b) => [b.label, fullIdr(b.revenue), String(b.count), percent(b.share, 1)]);

  return (
    <ChartFrame
      title="Revenue by category"
      subtitle="Where the catalogue's earning power is concentrated."
      columns={["Category", "Revenue", "Listings", "Share"]}
      rows={rows}
      height={Math.max(240, data.length * 32 + 40)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barCategoryGap={6}>
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
            dataKey="short"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={<SingleLineTick />}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = payload[0].payload as (typeof data)[number];
              return (
                <TooltipCard
                  label={b.label}
                  rows={[
                    { key: "Revenue", value: fullIdr(b.revenue), color: "var(--series-3)" },
                    { key: "Listings", value: String(b.count) },
                    { key: "Units", value: fullNumber(b.units) },
                    { key: "Share", value: percent(b.share, 1) },
                  ]}
                />
              );
            }}
          />
          {/* Bar length already carries magnitude — a second encoding on fill
              would be redundant, so this stays one flat hue. */}
          <Bar
            dataKey="revenue"
            radius={[0, 4, 4, 0]}
            fill="var(--series-3)"
            maxBarSize={22}
            stroke="var(--surface-1)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="share"
              position="right"
              formatter={(v: React.ReactNode) => percent(Number(v), 0)}
              style={{ fill: "var(--text-secondary)", fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
