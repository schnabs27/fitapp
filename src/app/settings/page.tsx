"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/lib/types";

type FormState = {
  daily_calorie_goal: string;
  daily_water_goal_oz: string;
  daily_protein_goal_g: string;
  daily_fiber_goal_g: string;
  daily_fat_goal_g: string;
  daily_sugar_goal_g: string;
  home_timezone: string;
  birth_year: string;
  height_in: string;
  weight_lbs: string;
  biological_sex: string;
  activity_level: string;
};

const COMMON_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

function toFormState(s: UserSettings): FormState {
  return {
    daily_calorie_goal: String(s.daily_calorie_goal),
    daily_water_goal_oz: String(s.daily_water_goal_oz),
    daily_protein_goal_g:
      s.daily_protein_goal_g != null ? String(s.daily_protein_goal_g) : "",
    daily_fiber_goal_g:
      s.daily_fiber_goal_g != null ? String(s.daily_fiber_goal_g) : "",
    daily_fat_goal_g: s.daily_fat_goal_g != null ? String(s.daily_fat_goal_g) : "",
    daily_sugar_goal_g:
      s.daily_sugar_goal_g != null ? String(s.daily_sugar_goal_g) : "",
    home_timezone: s.home_timezone,
    birth_year: s.birth_year != null ? String(s.birth_year) : "",
    height_in: s.height_in != null ? String(s.height_in) : "",
    weight_lbs: s.weight_lbs != null ? String(s.weight_lbs) : "",
    biological_sex: s.biological_sex ?? "",
    activity_level: s.activity_level ?? "",
  };
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState<FormState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .maybeSingle();
      if (data) setForm(toFormState(data as UserSettings));
      setLoading(false);
    })();
  }, [supabase, router]);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!form || !userId) return;
    setSaving(true);
    setError(null);

    const calorieGoal = Number(form.daily_calorie_goal);
    const waterGoal = Number(form.daily_water_goal_oz);

    if (!Number.isFinite(calorieGoal) || calorieGoal <= 0) {
      setError("Calorie goal must be a positive number.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(waterGoal) || waterGoal <= 0) {
      setError("Water goal must be a positive number.");
      setSaving(false);
      return;
    }

    const toNullableNumber = (v: string) => (v.trim() === "" ? null : Number(v));

    const { error: updateError } = await supabase
      .from("user_settings")
      .update({
        daily_calorie_goal: Math.round(calorieGoal),
        daily_water_goal_oz: waterGoal,
        daily_protein_goal_g: toNullableNumber(form.daily_protein_goal_g),
        daily_fiber_goal_g: toNullableNumber(form.daily_fiber_goal_g),
        daily_fat_goal_g: toNullableNumber(form.daily_fat_goal_g),
        daily_sugar_goal_g: toNullableNumber(form.daily_sugar_goal_g),
        home_timezone: form.home_timezone,
        birth_year: toNullableNumber(form.birth_year),
        height_in: toNullableNumber(form.height_in),
        weight_lbs: toNullableNumber(form.weight_lbs),
        biological_sex: form.biological_sex.trim() === "" ? null : form.biological_sex,
        activity_level: form.activity_level.trim() === "" ? null : form.activity_level,
      })
      .eq("user_id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSavedAt(Date.now());
  }

  if (loading || !form) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="text-neutral-400"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Goals</h1>
      </div>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Daily Targets
        </h2>

        <Field
          label="Calorie goal (kcal/day)"
          value={form.daily_calorie_goal}
          onChange={(v) => update("daily_calorie_goal", v)}
        />
        <Field
          label="Water goal (oz/day)"
          value={form.daily_water_goal_oz}
          onChange={(v) => update("daily_water_goal_oz", v)}
        />
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Macro Targets (optional)
        </h2>
        <p className="mb-3 text-xs text-neutral-600">
          Leave blank to track macros without a specific daily goal.
        </p>

        <Field
          label="Protein goal (g/day)"
          value={form.daily_protein_goal_g}
          onChange={(v) => update("daily_protein_goal_g", v)}
          placeholder="—"
        />
        <Field
          label="Fiber goal (g/day)"
          value={form.daily_fiber_goal_g}
          onChange={(v) => update("daily_fiber_goal_g", v)}
          placeholder="—"
        />
        <Field
          label="Fat goal (g/day)"
          value={form.daily_fat_goal_g}
          onChange={(v) => update("daily_fat_goal_g", v)}
          placeholder="—"
        />
        <Field
          label="Sugar goal (g/day)"
          value={form.daily_sugar_goal_g}
          onChange={(v) => update("daily_sugar_goal_g", v)}
          placeholder="—"
        />
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Timezone
        </h2>
        <p className="mb-3 text-xs text-neutral-600">
          Determines where each day starts and ends.
        </p>
        <select
          value={form.home_timezone}
          onChange={(e) => update("home_timezone", e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          {!COMMON_TIMEZONES.includes(form.home_timezone) && (
            <option value={form.home_timezone}>{form.home_timezone}</option>
          )}
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Profile
        </h2>
        <p className="mb-3 text-xs text-neutral-600">
          Used to personalize exercise calorie-burn estimates. Optional, but
          more accurate with it filled in.
        </p>

        <Field
          label="Birth year"
          value={form.birth_year}
          onChange={(v) => update("birth_year", v)}
          placeholder="e.g. 1976"
        />
        <Field
          label="Height (inches)"
          value={form.height_in}
          onChange={(v) => update("height_in", v)}
          placeholder="e.g. 62"
        />
        <Field
          label="Weight (lbs)"
          value={form.weight_lbs}
          onChange={(v) => update("weight_lbs", v)}
          placeholder="e.g. 129"
        />

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Biological sex
          </label>
          <select
            value={form.biological_sex}
            onChange={(e) => update("biological_sex", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Activity level
          </label>
          <select
            value={form.activity_level}
            onChange={(e) => update("activity_level", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
          >
            <option value="">—</option>
            <option value="sedentary">Sedentary</option>
            <option value="lightly active">Lightly active</option>
            <option value="moderately active">Moderately active</option>
            <option value="very active">Very active</option>
          </select>
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {savedAt && !error && (
        <p className="text-sm text-teal-400">Saved.</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-teal-500 py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-50"
      >
        {saving ? "Saving…" : "✓ Save Goals"}
      </button>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm focus:border-teal-500 focus:outline-none"
      />
    </div>
  );
}
