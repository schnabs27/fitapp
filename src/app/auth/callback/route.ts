import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// After Google redirects back here with a ?code=..., this exchanges
// that code for a Supabase session and sends the user to the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to a (future) error page.
  return NextResponse.redirect(`${origin}/auth/error`);
}
