"use client";

import type { Recipe, RecipeChoices, RecipeIngredient } from "@/types";

interface Props {
  /** Items that have more than one recipe available */
  multiRecipeItems: Array<{
    itemId: number;
    itemName: string;
    recipes: Recipe[];
  }>;
  ingredientsByRecipeId: Map<number, RecipeIngredient[]>;
  itemNameById: Map<number, string>;
  recipeChoices: RecipeChoices;
  onChange: (choices: RecipeChoices) => void;
}

export default function RecipePicker({
  multiRecipeItems,
  ingredientsByRecipeId,
  itemNameById,
  recipeChoices,
  onChange,
}: Props) {
  if (multiRecipeItems.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        Recipe Selection
      </h3>
      <p className="text-xs text-zinc-500">
        These intermediates can be crafted multiple ways. Pick which recipe to use.
      </p>
      {multiRecipeItems.map(({ itemId, itemName, recipes }) => {
        const chosenId = recipeChoices[itemId] ?? recipes[0].id;
        return (
          <div key={itemId} className="space-y-1.5">
            <p className="text-sm font-medium text-zinc-300">{itemName}</p>
            <div className="space-y-1">
              {recipes.map((r) => {
                const ings = ingredientsByRecipeId.get(r.id) ?? [];
                const ingText = ings
                  .map((i) => `${itemNameById.get(i.item_id) ?? `#${i.item_id}`} ×${i.count}`)
                  .join(", ");
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      chosenId === r.id
                        ? "border-amber-500/60 bg-amber-950/20"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`recipe-${itemId}`}
                      checked={chosenId === r.id}
                      onChange={() => onChange({ ...recipeChoices, [itemId]: r.id })}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div className="text-xs leading-relaxed">
                      <span className="text-zinc-400">{r.discipline}</span>
                      <span className="text-zinc-600 mx-1">·</span>
                      <span className="text-zinc-300">{ingText}</span>
                      <span className="text-zinc-600 mx-1">→</span>
                      <span className="text-zinc-300">{r.output_count}×</span>
                      {r.meso_cost > 0 && (
                        <span className="text-zinc-500 ml-1">
                          (+{r.meso_cost.toLocaleString()} meso fee)
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
