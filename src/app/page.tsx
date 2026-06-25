// Temporary status page. Confirms the GitHub → Vercel pipeline works and
// that environment variables are wired up. Gets replaced by the Today
// dashboard in a later Phase 1 step.

import GoogleSignInButton from "./auth/GoogleSignInButton";

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-3 py-1">
      <span
        className={ok ? "text-teal-400" : "text-neutral-600"}
        aria-hidden
      >
        {ok ? "●" : "○"}
      </span>
      <span className={ok ? "text-neutral-100" : "text-neutral-500"}>
        {label}
      </span>
    </li>
  );
}

export default function Home() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nutrition Tracker</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Phase 1 scaffold — deployment is live.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Environment
        </h2>
        <ul className="text-sm">
          <StatusRow label="NEXT_PUBLIC_SUPABASE_URL" ok={hasSupabaseUrl} />
          <StatusRow label="NEXT_PUBLIC_SUPABASE_ANON_KEY" ok={hasSupabaseKey} />
          <StatusRow label="ANTHROPIC_API_KEY (server)" ok={hasAnthropicKey} />
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          Filled circles mean the variable is set. Add any missing ones in your
          Vercel project settings, then redeploy.
        </p>
      </section>

      <div className="flex justify-center">
        <GoogleSignInButton />
      </div>

      <p className="text-center text-xs text-neutral-600">
        Next: auth, settings, and meal logging.
      </p>
    </main>
  );
}
