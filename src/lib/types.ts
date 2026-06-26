export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export type Meal = {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  name: string;
  description: string | null;
  calories: number;
  protein_g: number;
  fiber_g: number;
  fat_g: number;
  sugar_g: number;
  portion: number;
  created_at: string;
  updated_at: string;
};

export type WaterLog = {
  id: string;
  user_id: string;
  amount_oz: number;
  logged_at: string;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  daily_calorie_goal: number;
  daily_water_goal_oz: number;
  daily_protein_goal_g: number | null;
  daily_fiber_goal_g: number | null;
  daily_fat_goal_g: number | null;
  daily_sugar_goal_g: number | null;
  home_timezone: string;
};

export type NutritionEstimate = {
  name: string;
  calories: number;
  protein_g: number;
  fiber_g: number;
  fat_g: number;
  sugar_g: number;
  confidence: "low" | "medium" | "high";
  notes?: string;
};
