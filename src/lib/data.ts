import { supabase } from "./supabase";
import type { Item, Recipe, RecipeIngredient, RecipeWithIngredients } from "@/types";

/** Paginate a table fetch past the server-side row cap (default 1000). */
async function fetchPaged<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetcher: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const rows: T[] = [];
  let start = 0;
  while (true) {
    const { data, error } = await fetcher(start, start + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    start += PAGE;
  }
  return rows;
}

/** Fetch all data needed for the calculator, paginating past the server row cap. */
export async function fetchAllRecipes(): Promise<RecipeWithIngredients[]> {
  const [recipes, ingredients, items] = await Promise.all([
    fetchPaged<Recipe>((from, to) =>
      supabase.from("recipes").select("*").order("discipline").range(from, to)
    ),
    fetchPaged<RecipeIngredient>((from, to) =>
      supabase.from("recipe_ingredients").select("*").order("id").range(from, to)
    ),
    fetchPaged<Item>((from, to) =>
      supabase.from("items").select("*").range(from, to)
    ),
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));

  const ingByRecipeId = new Map<number, RecipeIngredient[]>();
  for (const ing of ingredients) {
    const list = ingByRecipeId.get(ing.recipe_id) ?? [];
    list.push({ ...ing, item: itemById.get(ing.item_id) });
    ingByRecipeId.set(ing.recipe_id, list);
  }

  return recipes.map((r) => ({
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
