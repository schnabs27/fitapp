"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";

type Props = {
  onReused: () => void;
  loggedAt: string;
};

export function ExerciseHistorySearch({ onReused, loggedAt }: Props) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
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
      .from("exercises")
      .select("*")
      .or(`name.ilike.%${value}%,description.ilike.%${value}%`)
      .order("logged_at", { ascending: false })
      .limit(8);
    setSearching(false);
    if (!error && data) setResults(data as Exercise[]);
  }

  async function reuse(exercise: Exercise) {
    setAddingId(exercise.id);
    await supabase.from("exercises").insert({
      name: exercise.name,
      description: exercise.description,
      duration_minutes: exercise.duration_minutes,
      calories_burned: exercise.calories_burned,
      logged_at: loggedAt,
    });
    setAddingId(null);
    setQuery("");
    setResults([]);
    onReused();
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        Search past activities to reuse
      </label>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="e.g. bicep day, dog walk, cardio…"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm placeholder:text-neutral-600 focus:border-teal-500 focus:outline-none"
      />

      {searching && <p className="mt-2 text-xs text-neutral-500">Searching…</p>}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((exercise) => (
            <li
              key={exercise.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-neutral-950 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{exercise.name}</p>
                <p className="text-xs text-neutral-500">
                  🔥 {exercise.calories_burned} kcal · ⏱ {exercise.duration_minutes} min
                </p>
              </div>
              <button
                onClick={() => reuse(exercise)}
                disabled={addingId === exercise.id}
                className="rounded-full bg-teal-500 px-3 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40"
              >
                {addingId === exercise.id ? "Adding…" : "Add"}
              </button>
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
