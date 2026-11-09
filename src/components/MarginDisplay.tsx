"use client";

import type { CraftingCostResult } from "@/types";
import { formatMeso } from "@/lib/calculations";

interface Props {
  result: CraftingCostResult;
}

export default function MarginDisplay({ result }: Props) {
  const { totalRawMaterialCost, totalCraftingFees, totalCost, revenue, margin, marginPct } = result;
  const isProfit = margin >= 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        Cost Breakdown
      </h3>

      <div className="space-y-1.5 text-sm">
        <Row label="Raw materials" value={totalRawMaterialCost} />
        <Row label="Crafting fees" value={totalCraftingFees} />
        <div className="border-t border-zinc-700 pt-1.5">
          <Row label="Total cost" value={totalCost} bold />
        </div>
        <Row label="Revenue (after 3% tax)" value={revenue} />
      </div>

      <div
        className={`mt-4 rounded-lg p-4 border ${
          isProfit
            ? "bg-emerald-950/40 border-emerald-700/50"
            : "bg-red-950/40 border-red-700/50"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-zinc-300">Margin</span>
          <span
            className={`text-2xl font-bold ${
              isProfit ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isProfit ? "+" : ""}
            {formatMeso(margin)}
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xs text-zinc-500">% of revenue</span>
          <span
            className={`text-sm font-semibold ${
              isProfit ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {isProfit ? "+" : ""}
            {marginPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={`text-zinc-400 ${bold ? "font-semibold text-zinc-300" : ""}`}>
        {label}
      </span>
      <span className={`text-white tabular-nums ${bold ? "font-semibold" : ""}`}>
        {formatMeso(value)}
      </span>
    </div>
  );
}
