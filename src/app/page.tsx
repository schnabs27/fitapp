"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getZonedDayBoundsUTC } from "@/lib/timezone";
import { MEAL_TYPES, type Meal, type UserSettings } from "@/lib/types";
import { WaterTracker } from "@/components/WaterTracker";
import { MealTypeSection } from "@/components/MealTypeSection";
import { MealHistorySearch } from "@/components/MealHistorySearch";

const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  daily_calorie_goal: 1400,
  daily_water_goal_oz: 70,
  daily_carbs_goal_g: null,
  daily_protein_goal_g: null,
  daily_fat_goal_g: null,
  home_timezone: "America/Chicago",
};

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterOz, setWaterOz] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadEverything = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }
    setUser(userData.user);
    setAuthChecked(true);

    // Ensure a settings row exists (first run), otherwise fetch it.
    let { data: settingsRow } = await supabase
      .from("user_settings")
      .select("*")
      .maybeSingle();

    if (!settingsRow) {
      const { data: inserted } = await supabase
        .from("user_settings")
        .insert(DEFAULT_SETTINGS)
        .select("*")
        .single();
      settingsRow = inserted;
    }
    setSettings(settingsRow as UserSettings);

    const timezone = (settingsRow as UserSettings)?.home_timezone ?? "America/Chicago";
    const { startUTC, endUTC } = getZonedDayBoundsUTC(timezone);

    const [{ data: mealRows }, { data: waterRows }] = await Promise.all([
      supabase
        .from("meals")
        .select("*")
        .gte("logged_at", startUTC.toISOString())
        .lt("logged_at", endUTC.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("water_logs")
        .select("amount_oz")
        .gte("logged_at", startUTC.toISOString())
        .lt("logged_at", endUTC.toISOString()),
    ]);

    setMeals((mealRows as Meal[]) ?? []);
    setWaterOz(
      (waterRows ?? []).reduce((sum, row) => sum + Number(row.amount_oz), 0),
    );
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadEverything();
  }, [loadEverything]);

  if (!authChecked || loading || !settings) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      carbs_g: acc.carbs_g + Number(m.carbs_g),
      protein_g: acc.protein_g + Number(m.protein_g),
      fat_g: acc.fat_g + Number(m.fat_g),
    }),
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
  );
  const caloriesLeft = settings.daily_calorie_goal - totals.calories;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          Today · {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-xs text-neutral-500" aria-label="Goals">
            ⚙️ Goals
          </Link>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
            className="text-xs text-neutral-500"
          >
            Sign out
          </button>
        </div>
      </div>

      <WaterTracker
        totalOz={waterOz}
        goalOz={settings.daily_water_goal_oz}
        onLogged={loadEverything}
      />

      <div className="rounded-2xl bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Calories Left</p>
            <p className="text-2xl font-bold">
              {caloriesLeft} <span className="text-sm font-normal text-neutral-500">kcal</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">Total Calories</p>
            <p className="text-2xl font-bold">{totals.calories}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-neutral-500">🌾 Carbs</p>
            <p className="font-semibold">
              {Math.round(totals.carbs_g)}
              {settings.daily_carbs_goal_g != null && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  / {settings.daily_carbs_goal_g}
                </span>
              )}{" "}
              g
            </p>
          </div>
          <div>
            <p className="text-neutral-500">🥩 Protein</p>
            <p className="font-semibold">
              {Math.round(totals.protein_g)}
              {settings.daily_protein_goal_g != null && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  / {settings.daily_protein_goal_g}
                </span>
              )}{" "}
              g
            </p>
          </div>
          <div>
            <p className="text-neutral-500">🥑 Fat</p>
            <p className="font-semibold">
              {Math.round(totals.fat_g)}
              {settings.daily_fat_goal_g != null && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  / {settings.daily_fat_goal_g}
                </span>
              )}{" "}
              g
            </p>
          </div>
        </div>
      </div>

      <MealHistorySearch onReused={loadEverything} />

      {MEAL_TYPES.map((mealType) => (
        <MealTypeSection
          key={mealType}
          mealType={mealType}
          meals={meals.filter((m) => m.meal_type === mealType)}
          onChanged={loadEverything}
        />
      ))}
    </main>
  );
}
