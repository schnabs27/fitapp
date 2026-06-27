"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getZonedDayBoundsUTC } from "@/lib/timezone";
import { MEAL_TYPES, type Exercise, type Meal, type UserSettings } from "@/lib/types";
import { WaterTracker } from "@/components/WaterTracker";
import { MealTypeSection } from "@/components/MealTypeSection";
import { MealHistorySearch } from "@/components/MealHistorySearch";
import { ExerciseSection } from "@/components/ExerciseSection";
import { ExerciseHistorySearch } from "@/components/ExerciseHistorySearch";

const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  daily_calorie_goal: 1400,
  daily_water_goal_oz: 70,
  daily_protein_goal_g: null,
  daily_fiber_goal_g: null,
  daily_fat_goal_g: null,
  daily_sugar_goal_g: null,
  home_timezone: "America/Chicago",
  birth_year: null,
  height_in: null,
  weight_lbs: null,
  biological_sex: null,
  activity_level: null,
};

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [waterOz, setWaterOz] = useState(0);
  const [loading, setLoading] = useState(true);

  // 0 = today, +1 = tomorrow, -1 = yesterday, etc. This is the entire
  // mechanism behind the meal planner: viewing/logging a future day
  // uses the exact same dashboard and meal form as today. A meal dated
  // in the future IS your plan for that day — no separate table needed.
  const [dayOffset, setDayOffset] = useState(0);

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
    const { startUTC, endUTC } = getZonedDayBoundsUTC(timezone, new Date(), dayOffset);

    const [{ data: mealRows }, { data: waterRows }, { data: exerciseRows }] =
      await Promise.all([
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
        supabase
          .from("exercises")
          .select("*")
          .gte("logged_at", startUTC.toISOString())
          .lt("logged_at", endUTC.toISOString())
          .order("logged_at", { ascending: true }),
      ]);

    setMeals((mealRows as Meal[]) ?? []);
    setExercises((exerciseRows as Exercise[]) ?? []);
    setWaterOz(
      (waterRows ?? []).reduce((sum, row) => sum + Number(row.amount_oz), 0),
    );
    setLoading(false);
  }, [supabase, router, dayOffset]);

  useEffect(() => {
    setLoading(true);
    loadEverything();
  }, [loadEverything]);

  if (!authChecked || loading || !settings) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  const timezone = settings.home_timezone;
  const { startUTC: dayStartUTC } = getZonedDayBoundsUTC(timezone, new Date(), dayOffset);
  // Meals/water logged for this viewed day get stamped at local noon —
  // keeps them safely inside the day's bounds regardless of exact entry
  // time, and avoids any midnight edge cases.
  const loggedAtForDay = new Date(dayStartUTC.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const isToday = dayOffset === 0;
  const isFutureDay = dayOffset > 0;
  const dayLabel =
    dayOffset === 0
      ? "Today"
      : dayOffset === 1
        ? "Tomorrow"
        : dayOffset === -1
          ? "Yesterday"
          : dayStartUTC.toLocaleDateString(undefined, {
              timeZone: timezone,
              weekday: "short",
              month: "short",
              day: "numeric",
            });
  const dateSubLabel = dayStartUTC.toLocaleDateString(undefined, {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein_g: acc.protein_g + Number(m.protein_g),
      fiber_g: acc.fiber_g + Number(m.fiber_g),
      fat_g: acc.fat_g + Number(m.fat_g),
      sugar_g: acc.sugar_g + Number(m.sugar_g),
    }),
    { calories: 0, protein_g: 0, fiber_g: 0, fat_g: 0, sugar_g: 0 },
  );
  const caloriesLeft = settings.daily_calorie_goal - totals.calories;
  const caloriesBurned = exercises.reduce((sum, e) => sum + e.calories_burned, 0);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDayOffset((d) => d - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-neutral-300"
            aria-label="Previous day"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{dayLabel}</h1>
            {dayOffset !== 0 && (
              <p className="text-xs leading-tight text-neutral-500">{dateSubLabel}</p>
            )}
          </div>
          <button
            onClick={() => setDayOffset((d) => d + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-neutral-300"
            aria-label="Next day"
          >
            →
          </button>
          {!isToday && (
            <button
              onClick={() => setDayOffset(0)}
              className="ml-1 rounded-full bg-teal-500/10 px-2 py-1 text-xs font-medium text-teal-400"
            >
              Today
            </button>
          )}
        </div>
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

      {isFutureDay && (
        <div className="rounded-xl bg-amber-400/10 px-3 py-2 text-center text-xs text-amber-300">
          📅 Planning ahead — meals logged here are your plan for this day.
        </div>
      )}

      <WaterTracker
        totalOz={waterOz}
        goalOz={settings.daily_water_goal_oz}
        onLogged={loadEverything}
        readOnly={!isToday}
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
            {caloriesBurned > 0 && (
              <p className="text-xs text-amber-400">🔥 {caloriesBurned} burned</p>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
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
            <p className="text-neutral-500">🌿 Fiber</p>
            <p className="font-semibold">
              {Math.round(totals.fiber_g)}
              {settings.daily_fiber_goal_g != null && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  / {settings.daily_fiber_goal_g}
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
          <div>
            <p className="text-neutral-500">🍬 Sugar</p>
            <p className="font-semibold">
              {Math.round(totals.sugar_g)}
              {settings.daily_sugar_goal_g != null && (
                <span className="font-normal text-neutral-500">
                  {" "}
                  / {settings.daily_sugar_goal_g}
                </span>
              )}{" "}
              g
            </p>
          </div>
        </div>
      </div>

      <MealHistorySearch onReused={loadEverything} loggedAt={loggedAtForDay} />

      {MEAL_TYPES.map((mealType) => (
        <MealTypeSection
          key={mealType}
          mealType={mealType}
          meals={meals.filter((m) => m.meal_type === mealType)}
          onChanged={loadEverything}
          loggedAt={loggedAtForDay}
          timezone={timezone}
        />
      ))}

      <ExerciseHistorySearch onReused={loadEverything} loggedAt={loggedAtForDay} />

      <ExerciseSection
        exercises={exercises}
        onChanged={loadEverything}
        loggedAt={loggedAtForDay}
        timezone={timezone}
      />
    </main>
  );
}
