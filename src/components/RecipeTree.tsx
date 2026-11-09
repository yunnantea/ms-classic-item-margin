"use client";

import { useState } from "react";
import type { CostNode } from "@/types";
import { formatMeso } from "@/lib/calculations";

interface Props {
  node: CostNode;
  depth?: number;
}

export default function RecipeTree({ node, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === "raw") {
    return (
      <div
        className={`flex items-center justify-between gap-2 py-1 ${
          depth > 0 ? "pl-4 border-l border-zinc-700" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-zinc-600 flex-shrink-0" />
          <span className="text-sm text-zinc-300 truncate">{node.item.name}</span>
          <span className="text-xs text-zinc-500">×{node.quantity.toLocaleString()}</span>
          {node.unitPrice === 0 && (
            <span className="text-xs text-amber-500/70">no price</span>
          )}
        </div>
        <span className="text-sm text-zinc-400 tabular-nums flex-shrink-0">
          {formatMeso(node.totalCost)}
        </span>
      </div>
    );
  }

  return (
    <div className={depth > 0 ? "pl-4 border-l border-zinc-700" : ""}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 py-1 hover:text-amber-400 group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-zinc-500 group-hover:text-amber-500 flex-shrink-0">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="text-sm font-medium text-white truncate group-hover:text-amber-400">
            {node.item.name}
          </span>
          <span className="text-xs text-zinc-500">×{node.quantity.toLocaleString()}</span>
          <span className="text-xs text-zinc-600">
            ({node.craftsNeeded} craft{node.craftsNeeded !== 1 ? "s" : ""})
          </span>
        </div>
        <span className="text-sm text-zinc-300 tabular-nums flex-shrink-0">
          {formatMeso(node.totalCost)}
        </span>
      </button>

      {expanded && (
        <div className="ml-2 space-y-0.5">
          {node.craftingFee > 0 && (
            <div className="flex justify-between gap-2 py-0.5 pl-4 border-l border-zinc-700">
              <span className="text-xs text-zinc-500 italic">crafting fee</span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {formatMeso(node.craftingFee)}
              </span>
            </div>
          )}
          {node.children.map((child, i) => (
            <RecipeTree key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
