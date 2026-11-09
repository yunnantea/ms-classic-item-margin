/**
 * Seed script: fetches recipes + items from OSMS Data Explorer API
 * and populates Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const API_BASE = "https://osmsdataexplorer.com/data/api/v1";
const IMAGE_BASE = "https://osmsdataexplorer.com/data/current/images/items";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are required"
  );
  process.exit(1);
}

const isServiceKey = SUPABASE_SERVICE_KEY.includes("service_role") ||
  process.env.SUPABASE_SERVICE_KEY !== undefined;
console.log(`Using ${isServiceKey ? "service" : "anon"} key`);
console.log(`URL: ${SUPABASE_URL.slice(0, 30)}... (${SUPABASE_URL.length} chars)`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

interface ApiItem {
  id: number;
  name: string;
  category?: string;
}

interface ApiIngredient {
  item_id: number;
  count: number;
}

interface ApiRecipe {
  id: number;
  discipline: string;
  discipline_skill_id: number;
  output_item_id: number;
  output_count: number;
  req_skill_level: number;
  craft_exp: number;
  meso_cost: number;
  ingredients: ApiIngredient[];
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}/${path}`;
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function insert<T extends object>(table: string, rows: T[]) {
  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw Object.assign(error, { table, batchSize: batch.length });
  }
}

async function seed() {
  // Verify connectivity via raw fetch
  const testUrl = `${SUPABASE_URL}/rest/v1/items?select=id&limit=1`;
  const testRes = await fetch(testUrl, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const testBody = await testRes.text();
  console.log(`Ping status: ${testRes.status}, body: ${testBody.slice(0, 200)}`);
  if (!testRes.ok) {
    console.error("Cannot reach Supabase REST API");
    process.exit(1);
  }
  console.log("Supabase connection OK");

  const [apiItems, apiRecipes] = await Promise.all([
    fetchJson<ApiItem[]>("items.json"),
    fetchJson<ApiRecipe[]>("recipes.json"),
  ]);

  console.log(`Fetched ${apiItems.length} items, ${apiRecipes.length} recipes`);

  // Collect all item IDs referenced in recipes (outputs + ingredients)
  const referencedIds = new Set<number>();
  for (const r of apiRecipes) {
    referencedIds.add(r.output_item_id);
    for (const ing of r.ingredients) referencedIds.add(ing.item_id);
  }

  // Build item lookup map
  const itemMap = new Map(apiItems.map((i) => [i.id, i]));

  const itemsToInsert = Array.from(referencedIds).map((id) => {
    const item = itemMap.get(id);
    return {
      id,
      name: item?.name ?? `Unknown Item #${id}`,
      category: item?.category ?? null,
      image_url: `${IMAGE_BASE}/${String(id).padStart(8, "0")}.png`,
    };
  });

  // Clear and re-insert (clean seed)
  console.log("Clearing existing data...");
  await supabase.from("recipe_ingredients").delete().neq("id", 0);
  await supabase.from("recipes").delete().neq("id", 0);
  await supabase.from("items").delete().neq("id", 0);

  console.log(`Inserting ${itemsToInsert.length} items...`);
  await insert("items", itemsToInsert);

  const recipesToInsert = apiRecipes.map((r) => ({
    id: r.id,
    discipline: r.discipline,
    discipline_skill_id: r.discipline_skill_id,
    output_item_id: r.output_item_id,
    output_count: r.output_count,
    req_skill_level: r.req_skill_level,
    craft_exp: r.craft_exp,
    meso_cost: r.meso_cost,
  }));

  console.log(`Inserting ${recipesToInsert.length} recipes...`);
  await insert("recipes", recipesToInsert);

  const recipeIds = apiRecipes.map((r) => r.id);

  const ingredientsToInsert = apiRecipes.flatMap((r) =>
    r.ingredients.map((ing) => ({
      recipe_id: r.id,
      item_id: ing.item_id,
      count: ing.count,
    }))
  );

  console.log(`Inserting ${ingredientsToInsert.length} recipe ingredients...`);
  const { error: ingError } = await supabase
    .from("recipe_ingredients")
    .insert(ingredientsToInsert);
  if (ingError) throw ingError;

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
