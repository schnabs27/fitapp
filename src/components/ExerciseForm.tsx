"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseEstimate } from "@/lib/types";

type Prefill = {
  name: string;
  description: string | null;
  duration_minutes: number;
  calories_burned: number;
};

type Props = {
  prefill?: Prefill;
  // ISO timestamp this entry should be saved under — same mechanism as
  // meals: a future day's entry IS the plan for that day.
  loggedAt: string;
  onSaved: () => void;
  onCancel: () => void;
};

const emptyFields = {
  name: "",
  duration_minutes: 0,
  calories_burned: 0,
};

export function ExerciseForm({ prefill, loggedAt, onSaved, onCancel }: Props) {
  const supabase = createClient();

  const [description, setDescription] = useState(prefill?.description ?? "");
  const [fields, setFields] = useState(
    prefill
      ? {
          name: prefill.name,
          duration_minutes: prefill.duration_minutes,
          calories_burned: prefill.calories_burned,
        }
      : emptyFields,
  );
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ExerciseEstimate["confidence"] | null>(
    null,
  );
  const [notes, setNotes] = useState<string | null>(null);

  async function handleEstimate() {
    if (!description.trim()) return;
    setEstimating(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Estimate failed.");

      const estimate: ExerciseEstimate = data.estimate;
      setFields({
        name: estimate.name,
        duration_minutes: estimate.duration_minutes,
        calories_burned: estimate.calories_burned,
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
      setError("Give this session a name (or run Estimate first).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("exercises").insert({
        name: fields.name,
        description: description || null,
        duration_minutes: fields.duration_minutes,
        calories_burned: Math.round(fields.calories_burned),
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
        placeholder="e.g. Elliptical 20 min, 2.1 miles; situps 15 reps x3 with weight; rowing machine 80lb 15x3…"
        rows={3}
        className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm placeholder:text-neutral-600 focus:border-teal-500 focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-end">
        <button
          onClick={handleEstimate}
          disabled={estimating || !description.trim()}
          className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-neutral-950 disabled:opacity-50"
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
            Session name
          </label>
          <input
            value={fields.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Enter name…"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <NumberField
          label="Duration (min)"
          value={fields.duration_minutes}
          onChange={(v) => updateField("duration_minutes", v)}
        />
        <NumberField
          label="Calories burned"
          value={fields.calories_burned}
          onChange={(v) => updateField("calories_burned", v)}
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
