export interface Item {
  id: number;
  name: string;
  category: string | null;
  image_url: string | null;
}

export interface Recipe {
  id: number;
  discipline: string;
  discipline_skill_id: number | null;
  output_item_id: number;
  output_count: number;
  req_skill_level: number | null;
  craft_exp: number | null;
  meso_cost: number;
  // joined
  output_item?: Item;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  item_id: number;
  count: number;
  // joined
  item?: Item;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

// Resolved tree node — either a raw material leaf or a crafted intermediate
export type CostNode =
  | {
      type: "raw";
      item: Item;
      quantity: number; // total quantity needed
      unitPrice: number; // user-entered price per unit
      totalCost: number;
    }
  | {
      type: "crafted";
      item: Item;
      quantity: number; // total quantity needed
      recipe: Recipe;
      craftsNeeded: number; // ceil(quantity / output_count)
      craftingFee: number; // craftsNeeded * meso_cost
      children: CostNode[];
      totalCost: number; // craftingFee + sum of children costs
    };

export interface CraftingCostResult {
  tree: CostNode;
  totalRawMaterialCost: number;
  totalCraftingFees: number;
  totalCost: number;
  revenue: number;
  margin: number;
  marginPct: number;
}

// Map of item_id → user-entered price
export type PriceMap = Record<number, number>;

// Map of item_id → chosen recipe_id (for items with multiple recipes)
// If not set, defaults to the first recipe found
export type RecipeChoices = Record<number, number>;
