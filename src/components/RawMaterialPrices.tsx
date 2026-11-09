"use client";

import { useMemo } from "react";
import type { Item, PriceMap } from "@/types";

interface Props {
  rawMaterials: Item[];
  prices: PriceMap;
  onPricesChange: (prices: PriceMap) => void;
}

const CATEGORY_ORDER = ["Ore", "Gem", "Flower", "Seed", "Leaf", "Etc", "Other"];

function guessCategory(item: Item): string {
  const name = item.name.toLowerCase();
  if (name.includes("ore")) return "Ore";
  if (
    name.includes("garnet") || name.includes("aquamarine") ||
    name.includes("emerald") || name.includes("topaz") ||
    name.includes("sapphire") || name.includes("opal") ||
    name.includes("amethyst") || name.includes("diamond") ||
    name.includes("crystal")
  ) return "Gem";
  if (name.includes("flower")) return "Flower";
  if (name.includes("seed") || name.includes("seedling")) return "Seed";
  if (name.includes("leaf")) return "Leaf";
  if (item.category) return item.category;
  return "Other";
}

export default function RawMaterialPrices({ rawMaterials, prices, onPricesChange }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of rawMaterials) {
      const cat = guessCategory(item);
      const list = map.get(cat) ?? [];
      list.push(item);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [rawMaterials]);

  const filledCount = rawMaterials.filter((m) => (prices[m.id] ?? 0) > 0).length;

  function handleChange(itemId: number, value: string) {
    const num = parseInt(value, 10);
    onPricesChange({ ...prices, [itemId]: isNaN(num) ? 0 : num });
  }

  function handleClear() {
    onPricesChange({});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {filledCount} / {rawMaterials.length} prices set · auto-saved
        </p>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
        >
          Clear all
        </button>
      </div>

      {grouped.map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                  idx < items.length - 1 ? "border-b border-zinc-800" : ""
                }`}
              >
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
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="—"
                    value={prices[item.id] || ""}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                    className="w-36 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white text-right focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-zinc-500 w-8">meso</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
