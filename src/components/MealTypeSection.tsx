"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MealForm } from "@/components/MealForm";
import type { Meal, MealType } from "@/lib/types";

const MEAL_TYPE_META: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: "Breakfast", icon: "🍞" },
  lunch: { label: "Lunch", icon: "🥗" },
  dinner: { label: "Dinner", icon: "🍽️" },
  snack: { label: "Snack", icon: "🍎" },
};

type Props = {
  mealType: MealType;
  meals: Meal[];
  onChanged: () => void;
};

export function MealTypeSection({ mealType, meals, onChanged }: Props) {
  const supabase = createClient();
  const [formOpen, setFormOpen] = useState(false);
  const meta = MEAL_TYPE_META[mealType];

  async function handleDelete(id: string) {
    await supabase.from("meals").delete().eq("id", id);
    onChanged();
  }

  return (
    <div className="rounded-2xl bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <span>{meta.icon}</span>
          {meta.label}
        </h2>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-neutral-950"
          aria-label={`Add ${meta.label}`}
        >
          +
        </button>
      </div>

      {formOpen && (
        <div className="mt-3">
          <MealForm
            mealType={mealType}
            onSaved={() => {
              setFormOpen(false);
              onChanged();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      {meals.length > 0 && (
        <ul className="mt-3 space-y-2">
          {meals.map((meal) => (
            <li key={meal.id} className="rounded-xl bg-neutral-950 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{meal.name}</p>
                  <p className="text-xs text-neutral-500">
                    🔥 {meal.calories} kcal · 🌾 {meal.carbs_g}g · 🥩{" "}
                    {meal.protein_g}g · 🥑 {meal.fat_g}g
                  </p>
                  {meal.description && (
                    <p className="mt-1 text-xs text-neutral-600">
                      {meal.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="text-xs text-neutral-600 hover:text-red-400"
                  aria-label="Delete entry"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
