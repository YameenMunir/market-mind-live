"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getThemeColor } from "@/lib/theme";
import { formatPrice } from "@/lib/utils";
import type { EquityPoint } from "@/types";

interface EquityCurveChartProps {
  points: EquityPoint[];
  theme: "dark" | "light";
  currency?: string;
}

export function EquityCurveChart({ points, theme, currency = "USD" }: EquityCurveChartProps) {
  const { brandColor, gridColor, textColor, surfaceColor } = useMemo(
    () => ({
      brandColor: getThemeColor("brand", "#f5a623"),
      gridColor: getThemeColor("border", theme === "dark" ? "#1a2030" : "#eeeeea"),
      textColor: getThemeColor("ink-muted", theme === "dark" ? "#9ca6b6" : "#5b606b"),
      surfaceColor: getThemeColor("surface", theme === "dark" ? "#141822" : "#fafaf8"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme]
  );

  const data = points.map((p) => ({
    date: new Date(p.time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    equity: p.equity,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={brandColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={brandColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="date" stroke={textColor} tick={{ fontSize: 11 }} minTickGap={40} />
        <YAxis
          stroke={textColor}
          tick={{ fontSize: 11 }}
          domain={["auto", "auto"]}
          tickFormatter={(v) => formatPrice(v, currency)}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: surfaceColor,
            border: `1px solid ${gridColor}`,
            borderRadius: 8,
            fontSize: 12,
            color: textColor,
          }}
          formatter={(value: number) => [formatPrice(value, currency), "Equity"]}
        />
        <Area type="monotone" dataKey="equity" stroke={brandColor} strokeWidth={2} fill="url(#equityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
