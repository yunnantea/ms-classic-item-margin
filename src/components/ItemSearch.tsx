"use client";

import { useState, useMemo } from "react";
import type { RecipeWithIngredients } from "@/types";

const DISCIPLINES = [
  "All",
  "Smithing",
  "Weaponcrafting",
  "Tailoring",
  "Woodcrafting",
  "Leatherworking",
  "Arcforge",
];

interface Props {
  recipes: RecipeWithIngredients[];
  onSelect: (recipe: RecipeWithIngredients) => void;
}

export default function ItemSearch({ recipes, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState("All");

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const name = r.output_item?.name ?? "";
      const matchesQuery = name.toLowerCase().includes(query.toLowerCase());
      const matchesDiscipline =
        discipline === "All" || r.discipline === discipline;
      return matchesQuery && matchesDiscipline;
    });
  }, [recipes, query, discipline]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
        >
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-zinc-500">{filtered.length} items</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto pr-1">
        {filtered.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => onSelect(recipe)}
            className="flex items-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/50 rounded-lg text-left transition-colors group"
          >
            {recipe.output_item?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recipe.output_item.image_url}
                alt=""
                className="w-8 h-8 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate group-hover:text-amber-400">
                {recipe.output_item?.name ?? `Recipe #${recipe.id}`}
              </div>
              <div className="text-xs text-zinc-500">{recipe.discipline}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
