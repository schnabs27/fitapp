"use client";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const supabase = createClient();

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      onClick={signIn}
      className="rounded-full bg-teal-500 px-5 py-2 font-medium text-neutral-950"
    >
      Sign in with Google
    </button>
  );
}
