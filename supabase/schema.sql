-- MapleStory Classic Crafting Margin Calculator
-- Run this in Supabase SQL editor to set up the schema

-- Items table (resolved from items.json + recipes.json)
create table if not exists items (
  id integer primary key,
  name text not null,
  category text,
  image_url text
);

-- Recipes table (one row per craftable output)
create table if not exists recipes (
  id integer primary key,
  discipline text not null,
  discipline_skill_id integer,
  output_item_id integer not null references items(id),
  output_count integer not null default 1,
  req_skill_level integer,
  craft_exp integer,
  meso_cost integer not null default 0
);

-- Recipe ingredients (many per recipe)
create table if not exists recipe_ingredients (
  id serial primary key,
  recipe_id integer not null references recipes(id) on delete cascade,
  item_id integer not null references items(id),
  count integer not null
);

-- Indexes for common queries
create index if not exists idx_recipes_output_item on recipes(output_item_id);
create index if not exists idx_recipe_ingredients_recipe on recipe_ingredients(recipe_id);
create index if not exists idx_recipe_ingredients_item on recipe_ingredients(item_id);

-- Enable RLS (read-only public access is fine for static data)
alter table items enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "public read items" on items for select using (true);
create policy "public read recipes" on recipes for select using (true);
create policy "public read recipe_ingredients" on recipe_ingredients for select using (true);
