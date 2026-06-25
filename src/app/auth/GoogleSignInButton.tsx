"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton() {
  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button onClick={handleSignIn}>
      Sign in with Google
    </button>
  );
}
