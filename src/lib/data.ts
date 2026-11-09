import { supabase } from "./supabase";
import type { Item, Recipe, RecipeIngredient, RecipeWithIngredients } from "@/types";

/** Fetch all data needed for the calculator in 3 flat queries (no joins). */
export async function fetchAllRecipes(): Promise<RecipeWithIngredients[]> {
  const [recipesRes, ingredientsRes, itemsRes] = await Promise.all([
    supabase.from("recipes").select("*").order("discipline").limit(5000).returns<Recipe[]>(),
    supabase.from("recipe_ingredients").select("*").limit(10000).returns<RecipeIngredient[]>(),
    supabase.from("items").select("*").limit(5000).returns<Item[]>(),
  ]);

  if (recipesRes.error) throw recipesRes.error;
  if (ingredientsRes.error) throw ingredientsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const itemById = new Map(itemsRes.data.map((i) => [i.id, i]));

  const ingByRecipeId = new Map<number, RecipeIngredient[]>();
  for (const ing of ingredientsRes.data) {
    const list = ingByRecipeId.get(ing.recipe_id) ?? [];
    list.push({ ...ing, item: itemById.get(ing.item_id) });
    ingByRecipeId.set(ing.recipe_id, list);
  }

  return recipesRes.data.map((r) => ({
    ...r,
    output_item: itemById.get(r.output_item_id),
    ingredients: ingByRecipeId.get(r.id) ?? [],
  }));
}

/**
 * Find all raw materials: items used as ingredients that are never
 * the output of any recipe (i.e. true leaf nodes across all recipes).
 */
export function findAllRawMaterials(recipes: RecipeWithIngredients[]) {
  const outputIds = new Set(recipes.map((r) => r.output_item_id));
  const rawById = new Map<number, Item>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (!outputIds.has(ing.item_id) && ing.item) {
        rawById.set(ing.item_id, ing.item);
      }
    }
  }

  return Array.from(rawById.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Build lookup maps needed by the calculator from all recipes. */
export function buildLookupMaps(recipes: RecipeWithIngredients[]) {
  // Multiple recipes can produce the same item (e.g. different disciplines)
  const recipesByOutputId = new Map<number, Recipe[]>();
  const ingredientsByRecipeId = new Map<number, RecipeIngredient[]>();
  const itemById = new Map<number, Item>();

  for (const recipe of recipes) {
    const existing = recipesByOutputId.get(recipe.output_item_id) ?? [];
    existing.push(recipe);
    recipesByOutputId.set(recipe.output_item_id, existing);

    ingredientsByRecipeId.set(recipe.id, recipe.ingredients);

    if (recipe.output_item) itemById.set(recipe.output_item.id, recipe.output_item);
    for (const ing of recipe.ingredients) {
      if (ing.item) itemById.set(ing.item.id, ing.item);
    }
  }

  return { recipesByOutputId, ingredientsByRecipeId, itemById };
}
