"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEAL_TYPES, type Meal, type MealType } from "@/lib/types";

type Props = {
  onReused: () => void;
};

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
  snack: "S",
};

export function MealHistorySearch({ onReused }: Props) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Meal[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .or(`name.ilike.%${value}%,description.ilike.%${value}%`)
      .order("logged_at", { ascending: false })
      .limit(8);
    setSearching(false);
    if (!error && data) setResults(data as Meal[]);
  }

  async function reuse(meal: Meal, mealType: MealType) {
    setAddingId(meal.id);
    await supabase.from("meals").insert({
      meal_type: mealType,
      name: meal.name,
      description: meal.description,
      calories: meal.calories,
      protein_g: meal.protein_g,
      fiber_g: meal.fiber_g,
      fat_g: meal.fat_g,
      sugar_g: meal.sugar_g,
      portion: meal.portion,
    });
    setAddingId(null);
    setQuery("");
    setResults([]);
    onReused();
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        Search past meals to reuse
      </label>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="e.g. avocado, chicken, almond butter…"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm placeholder:text-neutral-600 focus:border-teal-500 focus:outline-none"
      />

      {searching && <p className="mt-2 text-xs text-neutral-500">Searching…</p>}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((meal) => (
            <li
              key={meal.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-neutral-950 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{meal.name}</p>
                <p className="text-xs text-neutral-500">
                  {meal.calories} kcal · {meal.protein_g}g P · {meal.fiber_g}g Fb ·{" "}
                  {meal.fat_g}g F · {meal.sugar_g}g Sg
                </p>
              </div>
              <div className="flex gap-1">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt}
                    onClick={() => reuse(meal, mt)}
                    disabled={addingId === meal.id}
                    title={`Add to ${mt}`}
                    className="h-7 w-7 rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300 disabled:opacity-40"
                  >
                    {MEAL_TYPE_LABEL[mt]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500">No matches.</p>
      )}
    </div>
  );
}
