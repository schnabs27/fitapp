import { GoogleSignInButton } from "@/app/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nutrition Tracker</h1>
        <p className="mt-1 text-sm text-neutral-400">Sign in to continue.</p>
      </div>
      <GoogleSignInButton />
    </main>
  );
}
