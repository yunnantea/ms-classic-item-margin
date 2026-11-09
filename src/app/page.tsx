"use client";

import { useEffect, useState, useMemo } from "react";
import type { RecipeWithIngredients, PriceMap } from "@/types";
import { fetchAllRecipes, findAllRawMaterials } from "@/lib/data";
import ItemSearch from "@/components/ItemSearch";
import Calculator from "@/components/Calculator";
import RawMaterialPrices from "@/components/RawMaterialPrices";

const STORAGE_KEY = "crafting_prices";
type Tab = "calculator" | "prices";

export default function Home() {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RecipeWithIngredients | null>(null);
  const [tab, setTab] = useState<Tab>("calculator");
  const [prices, setPrices] = useState<PriceMap>({});

  // Load prices from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrices(JSON.parse(stored));
    } catch {}
  }, []);

  // Auto-save prices to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
    } catch {}
  }, [prices]);

  useEffect(() => {
    fetchAllRecipes()
      .then(setRecipes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rawMaterials = useMemo(() => findAllRawMaterials(recipes), [recipes]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            MS Classic <span className="text-amber-400">Crafting Margin</span>
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Calculate crafting costs and profit margins
          </p>
        </div>

        {/* Tabs — only show when not in calculator view */}
        {!selected && (
          <div className="flex gap-1 mb-6 border-b border-zinc-800">
            {(["calculator", "prices"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "text-amber-400 border-amber-400"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                {t === "calculator" ? "Calculator" : "Raw Material Prices"}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-zinc-500 text-sm">Loading recipes...</div>
        )}

        {error && (
          <div className="text-red-400 text-sm bg-red-950/30 border border-red-800/50 rounded-lg p-4">
            Failed to load data: {error}
            <br />
            <span className="text-zinc-500">
              Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
            </span>
          </div>
        )}

        {!loading && !error && (
          <>
            {selected ? (
              <Calculator
                recipe={selected}
                allRecipes={recipes}
                prices={prices}
                onPricesChange={setPrices}
                onBack={() => setSelected(null)}
              />
            ) : tab === "calculator" ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-base font-semibold text-zinc-300 mb-4">
                  Select an item to calculate
                </h2>
                <ItemSearch recipes={recipes} onSelect={setSelected} />
              </div>
            ) : (
              <RawMaterialPrices
                rawMaterials={rawMaterials}
                prices={prices}
                onPricesChange={setPrices}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
