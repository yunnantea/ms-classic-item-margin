import type {
  CostNode,
  CraftingCostResult,
  Item,
  PriceMap,
  Recipe,
  RecipeChoices,
  RecipeIngredient,
} from "@/types";

const SALES_TAX = 0.03;

/**
 * Recursively build the cost tree for a given item.
 * - If the item has a recipe, it's a crafted node.
 * - Otherwise it's a raw material leaf.
 * - recipeChoices: when an item has multiple recipes, picks the user-selected one.
 */
export function buildCostTree(
  item: Item,
  quantity: number,
  recipesByOutputId: Map<number, Recipe[]>,
  ingredientsByRecipeId: Map<number, RecipeIngredient[]>,
  itemById: Map<number, Item>,
  prices: PriceMap,
  recipeChoices: RecipeChoices = {},
  visited = new Set<number>()
): CostNode {
  const recipes = recipesByOutputId.get(item.id) ?? [];

  // Raw material leaf — no recipe or already in the chain
  if (recipes.length === 0 || visited.has(item.id)) {
    const unitPrice = prices[item.id] ?? 0;
    return {
      type: "raw",
      item,
      quantity,
      unitPrice,
      totalCost: quantity * unitPrice,
    };
  }

  // Pick the user-chosen recipe, or default to first
  const chosenId = recipeChoices[item.id];
  const recipe = recipes.find((r) => r.id === chosenId) ?? recipes[0];

  const nextVisited = new Set(visited).add(item.id);
  const craftsNeeded = Math.ceil(quantity / recipe.output_count);
  const craftingFee = craftsNeeded * recipe.meso_cost;

  const rawIngredients = ingredientsByRecipeId.get(recipe.id) ?? [];
  const children: CostNode[] = rawIngredients.map((ing) => {
    const childItem = itemById.get(ing.item_id) ?? {
      id: ing.item_id,
      name: `Unknown #${ing.item_id}`,
      category: null,
      image_url: null,
    };
    return buildCostTree(
      childItem,
      ing.count * craftsNeeded,
      recipesByOutputId,
      ingredientsByRecipeId,
      itemById,
      prices,
      recipeChoices,
      nextVisited
    );
  });

  const childrenCost = children.reduce((sum, c) => sum + c.totalCost, 0);

  return {
    type: "crafted",
    item,
    quantity,
    recipe,
    craftsNeeded,
    craftingFee,
    children,
    totalCost: craftingFee + childrenCost,
  };
}

/** Flatten the tree to collect all raw material leaves (deduplicated). */
export function collectRawMaterials(
  node: CostNode
): Map<number, { item: Item; quantity: number }> {
  const result = new Map<number, { item: Item; quantity: number }>();

  function walk(n: CostNode) {
    if (n.type === "raw") {
      const existing = result.get(n.item.id);
      if (existing) {
        existing.quantity += n.quantity;
      } else {
        result.set(n.item.id, { item: n.item, quantity: n.quantity });
      }
    } else {
      for (const child of n.children) walk(child);
    }
  }

  walk(node);
  return result;
}

/** Sum all crafting fees across the entire tree. */
function sumCraftingFees(node: CostNode): number {
  if (node.type === "raw") return 0;
  return (
    node.craftingFee +
    node.children.reduce((sum, c) => sum + sumCraftingFees(c), 0)
  );
}

/** Sum all raw material costs across the entire tree. */
function sumRawMaterialCost(node: CostNode): number {
  if (node.type === "raw") return node.totalCost;
  return node.children.reduce((sum, c) => sum + sumRawMaterialCost(c), 0);
}

/** Calculate the full margin result given the cost tree and sell price. */
export function calculateMargin(
  tree: CostNode,
  sellPrice: number
): CraftingCostResult {
  const totalRawMaterialCost = sumRawMaterialCost(tree);
  const totalCraftingFees = sumCraftingFees(tree);
  const totalCost = totalRawMaterialCost + totalCraftingFees;
  const revenue = sellPrice * (1 - SALES_TAX);
  const margin = revenue - totalCost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

  return {
    tree,
    totalRawMaterialCost,
    totalCraftingFees,
    totalCost,
    revenue,
    margin,
    marginPct,
  };
}

/** Format a number as meso (e.g. 1,234,567). */
export function formatMeso(value: number): string {
  return Math.round(value).toLocaleString();
}
