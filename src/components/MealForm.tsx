"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealType, NutritionEstimate } from "@/lib/types";

type Prefill = {
  name: string;
  description: string | null;
  calories: number;
  protein_g: number;
  fiber_g: number;
  fat_g: number;
  sugar_g: number;
  portion: number;
};

type Props = {
  mealType: MealType;
  prefill?: Prefill;
  // ISO timestamp this entry should be saved under — lets the same form
  // log today, backfill a past day, or plan a future day.
  loggedAt: string;
  onSaved: () => void;
  onCancel: () => void;
};

const emptyFields = {
  name: "",
  calories: 0,
  protein_g: 0,
  fiber_g: 0,
  fat_g: 0,
  sugar_g: 0,
};

export function MealForm({ mealType, prefill, loggedAt, onSaved, onCancel }: Props) {
  const supabase = createClient();

  const [description, setDescription] = useState(prefill?.description ?? "");
  const [portion, setPortion] = useState(prefill?.portion ?? 1);
  const [fields, setFields] = useState(
    prefill
      ? {
          name: prefill.name,
          calories: prefill.calories,
          protein_g: prefill.protein_g,
          fiber_g: prefill.fiber_g,
          fat_g: prefill.fat_g,
          sugar_g: prefill.sugar_g,
        }
      : emptyFields,
  );
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<NutritionEstimate["confidence"] | null>(
    null,
  );
  const [notes, setNotes] = useState<string | null>(null);

  async function handleEstimate() {
    if (!description.trim()) return;
    setEstimating(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, portion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Estimate failed.");

      const estimate: NutritionEstimate = data.estimate;
      setFields({
        name: estimate.name,
        calories: estimate.calories,
        protein_g: estimate.protein_g,
        fiber_g: estimate.fiber_g,
        fat_g: estimate.fat_g,
        sugar_g: estimate.sugar_g,
      });
      setConfidence(estimate.confidence);
      setNotes(estimate.notes ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Estimate failed.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave() {
    if (!fields.name.trim()) {
      setError("Give this meal a name (or run Estimate first).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("meals").insert({
        meal_type: mealType,
        name: fields.name,
        description: description || null,
        calories: Math.round(fields.calories),
        protein_g: fields.protein_g,
        fiber_g: fields.fiber_g,
        fat_g: fields.fat_g,
        sugar_g: fields.sugar_g,
        portion,
        logged_at: loggedAt,
      });
      if (insertError) throw insertError;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof typeof emptyFields, value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: key === "name" ? value : Number(value),
    }));
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        Description
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. 1 egg and 1 slice Ezekiel bread, toasted, with 2oz avocado"
        rows={2}
        className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm placeholder:text-neutral-600 focus:border-teal-500 focus:outline-none"
      />

      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-neutral-400">Portion</label>
        <input
          type="number"
          step="0.25"
          min="0.25"
          value={portion}
          onChange={(e) => setPortion(Number(e.target.value))}
          className="w-16 rounded-lg border border-neutral-700 bg-neutral-950 p-1 text-sm focus:border-teal-500 focus:outline-none"
        />
        <button
          onClick={handleEstimate}
          disabled={estimating || !description.trim()}
          className="ml-auto rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-neutral-950 disabled:opacity-50"
        >
          {estimating ? "Estimating…" : "✨ Estimate"}
        </button>
      </div>

      {confidence && (
        <p className="mt-2 text-xs text-neutral-500">
          Confidence: <span className="capitalize">{confidence}</span>
          {notes ? ` — ${notes}` : ""}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Food name
          </label>
          <input
            value={fields.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Enter name…"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <NumberField
          label="Calories"
          value={fields.calories}
          onChange={(v) => updateField("calories", v)}
        />
        <NumberField
          label="Protein (g)"
          value={fields.protein_g}
          onChange={(v) => updateField("protein_g", v)}
        />
        <NumberField
          label="Fiber (g)"
          value={fields.fiber_g}
          onChange={(v) => updateField("fiber_g", v)}
        />
        <NumberField
          label="Fat (g)"
          value={fields.fat_g}
          onChange={(v) => updateField("fat_g", v)}
        />
        <NumberField
          label="Sugar (g)"
          value={fields.sugar_g}
          onChange={(v) => updateField("sugar_g", v)}
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-neutral-700 py-2 text-sm text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-full bg-teal-500 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
        >
          {saving ? "Saving…" : "✓ Save"}
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
      />
    </div>
  );
}
