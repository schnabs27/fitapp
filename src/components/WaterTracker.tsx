"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  totalOz: number;
  goalOz: number;
  onLogged: () => void;
};

export function WaterTracker({ totalOz, goalOz, onLogged }: Props) {
  const supabase = createClient();
  const [custom, setCustom] = useState("");
  const [logging, setLogging] = useState(false);

  const pct = Math.min(100, Math.round((totalOz / goalOz) * 100));

  async function logWater(amountOz: number) {
    if (amountOz <= 0) return;
    setLogging(true);
    await supabase.from("water_logs").insert({ amount_oz: amountOz });
    setLogging(false);
    setCustom("");
    onLogged();
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 p-4">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <span>💧 Drinks</span>
        <span>
          {totalOz} oz · {pct}%
        </span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-white/80">{goalOz} oz goal</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => logWater(8)}
          disabled={logging}
          className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          +8 oz
        </button>
        <button
          onClick={() => logWater(16)}
          disabled={logging}
          className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          +16 oz
        </button>
        <input
          type="number"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="oz"
          className="w-16 rounded-full bg-white/20 px-3 py-1 text-xs text-white placeholder:text-white/60 focus:outline-none"
        />
        <button
          onClick={() => logWater(Number(custom))}
          disabled={logging || !custom}
          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700 disabled:opacity-50"
        >
          Log
        </button>
      </div>
    </div>
  );
}
