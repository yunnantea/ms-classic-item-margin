"use client";

import { useState, useEffect, useMemo } from "react";
import type { RecipeWithIngredients, PriceMap, RecipeChoices } from "@/types";
import {
  buildCostTree,
  calculateMargin,
  collectRawMaterials,
} from "@/lib/calculations";
import { buildLookupMaps } from "@/lib/data";
import PriceInputs from "./PriceInputs";
import MarginDisplay from "./MarginDisplay";
import RecipeTree from "./RecipeTree";
import RecipePicker from "./RecipePicker";

const SELL_PRICE_KEY = "crafting_sell_prices";
const RECIPE_CHOICES_KEY = "crafting_recipe_choices";

interface Props {
  recipe: RecipeWithIngredients;
  allRecipes: RecipeWithIngredients[];
  prices: PriceMap;
  onPricesChange: (prices: PriceMap) => void;
  onBack: () => void;
}

export default function Calculator({ recipe, allRecipes, prices, onPricesChange, onBack }: Props) {
  const [sellPrice, setSellPrice] = useState(0);
  const [recipeChoices, setRecipeChoices] = useState<RecipeChoices>({});

  useEffect(() => {
    try {
      const storedSell = localStorage.getItem(`${SELL_PRICE_KEY}_${recipe.id}`);
      if (storedSell) setSellPrice(Number(storedSell));

      const storedChoices = localStorage.getItem(RECIPE_CHOICES_KEY);
      if (storedChoices) setRecipeChoices(JSON.parse(storedChoices));
    } catch {}
  }, [recipe.id]);

  useEffect(() => {
    try { localStorage.setItem(`${SELL_PRICE_KEY}_${recipe.id}`, String(sellPrice)); } catch {}
  }, [recipe.id, sellPrice]);

  useEffect(() => {
    try { localStorage.setItem(RECIPE_CHOICES_KEY, JSON.stringify(recipeChoices)); } catch {}
  }, [recipeChoices]);

  const { recipesByOutputId, ingredientsByRecipeId, itemById } = useMemo(
    () => buildLookupMaps(allRecipes),
    [allRecipes]
  );

  // Find intermediates that have multiple recipes (excluding the top-level item itself)
  const multiRecipeItems = useMemo(() => {
    const result: Array<{ itemId: number; itemName: string; recipes: import("@/types").Recipe[] }> = [];

    function walk(itemId: number, visited = new Set<number>()) {
      if (visited.has(itemId)) return;
      visited.add(itemId);
      const recipes = recipesByOutputId.get(itemId) ?? [];
      if (recipes.length > 1) {
        const name = itemById.get(itemId)?.name ?? `#${itemId}`;
        if (!result.find((x) => x.itemId === itemId)) {
          result.push({ itemId, itemName: name, recipes });
        }
      }
      const chosenRecipe = recipes.find((r) => r.id === recipeChoices[itemId]) ?? recipes[0];
      if (chosenRecipe) {
        for (const ing of ingredientsByRecipeId.get(chosenRecipe.id) ?? []) {
          walk(ing.item_id, visited);
        }
      }
    }

    // Start from the top-level item's ingredients (not the item itself)
    const topRecipes = recipesByOutputId.get(recipe.output_item_id) ?? [];
    const chosenTop = topRecipes.find((r) => r.id === recipeChoices[recipe.output_item_id]) ?? topRecipes[0];
    if (chosenTop) {
      for (const ing of ingredientsByRecipeId.get(chosenTop.id) ?? []) {
        walk(ing.item_id);
      }
    }
    return result;
  }, [recipesByOutputId, ingredientsByRecipeId, itemById, recipeChoices, recipe.output_item_id]);

  const itemNameById = useMemo(
    () => new Map(Array.from(itemById.entries()).map(([id, item]) => [id, item.name])),
    [itemById]
  );

  const outputItem = recipe.output_item!;

  const costTree = useMemo(
    () =>
      buildCostTree(
        outputItem,
        1,
        recipesByOutputId,
        ingredientsByRecipeId,
        itemById,
        prices,
        recipeChoices
      ),
    [outputItem, recipesByOutputId, ingredientsByRecipeId, itemById, prices, recipeChoices]
  );

  const rawMaterials = useMemo(() => collectRawMaterials(costTree), [costTree]);
  const result = useMemo(() => calculateMargin(costTree, sellPrice), [costTree, sellPrice]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {outputItem.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={outputItem.image_url}
              alt=""
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{outputItem.name}</h2>
            <p className="text-sm text-zinc-500">
              {recipe.discipline} · Lv.{recipe.req_skill_level} ·{" "}
              {recipe.meso_cost.toLocaleString()} meso crafting fee
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {multiRecipeItems.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <RecipePicker
                multiRecipeItems={multiRecipeItems}
                ingredientsByRecipeId={ingredientsByRecipeId}
                itemNameById={itemNameById}
                recipeChoices={recipeChoices}
                onChange={setRecipeChoices}
              />
            </div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <PriceInputs
              rawMaterials={rawMaterials}
              prices={prices}
              sellPrice={sellPrice}
              totalCost={result.totalCost}
              onChange={onPricesChange}
              onSellPriceChange={setSellPrice}
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <MarginDisplay result={result} />
          </div>
        </div>

        {/* Right: recipe tree */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Recipe Tree
          </h3>
          <RecipeTree node={costTree} />
        </div>
      </div>
    </div>
  );
}
