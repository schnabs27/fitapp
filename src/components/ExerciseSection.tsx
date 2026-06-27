"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExerciseForm } from "@/components/ExerciseForm";
import { getZonedDateKey } from "@/lib/timezone";
import type { Exercise } from "@/lib/types";

type Props = {
  exercises: Exercise[];
  onChanged: () => void;
  loggedAt: string;
  timezone: string;
};

export function ExerciseSection({ exercises, onChanged, loggedAt, timezone }: Props) {
  const supabase = createClient();
  const [formOpen, setFormOpen] = useState(false);

  const todayKey = getZonedDateKey(timezone);

  async function handleDelete(id: string) {
    await supabase.from("exercises").delete().eq("id", id);
    onChanged();
  }

  const totalBurned = exercises.reduce((sum, e) => sum + e.calories_burned, 0);

  return (
    <div className="rounded-2xl bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <span>🏋️</span>
          Exercise
          {totalBurned > 0 && (
            <span className="text-xs font-normal text-neutral-500">
              · 🔥 {totalBurned} kcal burned
            </span>
          )}
        </h2>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-neutral-950"
          aria-label="Add exercise"
        >
          +
        </button>
      </div>

      {formOpen && (
        <div className="mt-3">
          <ExerciseForm
            loggedAt={loggedAt}
            onSaved={() => {
              setFormOpen(false);
              onChanged();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      {exercises.length > 0 && (
        <ul className="mt-3 space-y-2">
          {exercises.map((ex) => {
            const isPlanned = getZonedDateKey(timezone, new Date(ex.logged_at)) > todayKey;
            return (
              <li key={ex.id} className="rounded-xl bg-neutral-950 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{ex.name}</p>
                      {isPlanned && (
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          📅 Planned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      🔥 {ex.calories_burned} kcal · ⏱ {ex.duration_minutes} min
                    </p>
                    {ex.description && (
                      <p className="mt-1 text-xs text-neutral-600">{ex.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(ex.id)}
                    className="text-xs text-neutral-600 hover:text-red-400"
                    aria-label="Delete entry"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
