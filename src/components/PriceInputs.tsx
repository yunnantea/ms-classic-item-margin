"use client";

import { useState } from "react";
import type { Item, PriceMap } from "@/types";
import { formatMeso } from "@/lib/calculations";

const SALES_TAX = 0.03;

interface Props {
  rawMaterials: Map<number, { item: Item; quantity: number }>;
  prices: PriceMap;
  sellPrice: number;
  totalCost: number;
  onChange: (prices: PriceMap) => void;
  onSellPriceChange: (price: number) => void;
}

type SellMode = "price" | "margin";

export default function PriceInputs({
  rawMaterials,
  prices,
  sellPrice,
  totalCost,
  onChange,
  onSellPriceChange,
}: Props) {
  const [sellMode, setSellMode] = useState<SellMode>("price");
  const [targetMargin, setTargetMargin] = useState<number | "">("");

  const materials = Array.from(rawMaterials.values()).sort((a, b) =>
    a.item.name.localeCompare(b.item.name)
  );

  // Derived values for the sell section
  const currentMarginPct =
    sellPrice > 0
      ? ((sellPrice * (1 - SALES_TAX) - totalCost) / (sellPrice * (1 - SALES_TAX))) * 100
      : null;

  const requiredSellPrice =
    typeof targetMargin === "number" && targetMargin < 100 && totalCost > 0
      ? Math.ceil(totalCost / ((1 - targetMargin / 100) * (1 - SALES_TAX)))
      : null;

  function handleTargetMarginChange(value: string) {
    const num = parseFloat(value);
    if (value === "" || value === "-") {
      setTargetMargin("");
      return;
    }
    setTargetMargin(isNaN(num) ? "" : num);
    if (!isNaN(num) && num < 100 && totalCost > 0) {
      const price = Math.ceil(totalCost / ((1 - num / 100) * (1 - SALES_TAX)));
      onSellPriceChange(price);
    }
  }

  return (
    <div className="space-y-4">
      {/* Raw material prices */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Raw Material Prices
        </h3>
        <div className="space-y-2">
          {materials.map(({ item, quantity }) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-6 h-6 object-contain flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <span className="text-sm text-white">{item.name}</span>
                <span className="text-xs text-zinc-500">×{quantity.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={prices[item.id] || ""}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    onChange({ ...prices, [item.id]: isNaN(num) ? 0 : num });
                  }}
                  className="w-36 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white text-right focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-zinc-500 w-8">meso</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sell price section */}
      <div className="border-t border-zinc-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
            Sell Price
          </h3>
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs">
            {(["price", "margin"] as SellMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setSellMode(m)}
                className={`px-3 py-1 transition-colors ${
                  sellMode === m
                    ? "bg-amber-500 text-black font-medium"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {m === "price" ? "List price" : "Target margin"}
              </button>
            ))}
          </div>
        </div>

        {sellMode === "price" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-300">Listed price</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={sellPrice || ""}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    onSellPriceChange(isNaN(num) ? 0 : num);
                  }}
                  className="w-36 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white text-right focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-zinc-500 w-8">meso</span>
              </div>
            </div>
            {currentMarginPct !== null && (
              <p className={`text-xs text-right ${currentMarginPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                → {currentMarginPct >= 0 ? "+" : ""}{currentMarginPct.toFixed(1)}% margin after tax
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-300">Target margin</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step={0.1}
                  placeholder="0"
                  value={targetMargin}
                  onChange={(e) => handleTargetMarginChange(e.target.value)}
                  className="w-36 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white text-right focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-zinc-500 w-8">%</span>
              </div>
            </div>
            {requiredSellPrice !== null ? (
              <p className="text-xs text-right text-amber-400">
                → List at {formatMeso(requiredSellPrice)} meso
              </p>
            ) : totalCost === 0 ? (
              <p className="text-xs text-right text-zinc-600">Enter raw material prices first</p>
            ) : null}
          </div>
        )}
        <p className="text-xs text-zinc-600">3% sales tax applied automatically</p>
      </div>
    </div>
  );
}
