"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SignIn, ArrowLeft } from "@phosphor-icons/react";
import { login } from "@/lib/api";
import { saveTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await login(username, password);
      saveTokens(tokens);
      router.push("/system");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-600 text-ink-soft transition-colors hover:text-blue"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>

        <div className="glass rounded-blob p-8 sm:p-10">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl chrome">
              <Image
                src="/brand/fresh-phones-logo.png"
                alt="Fresh Phones PH logo"
                width={56}
                height={56}
                className="h-12 w-12 scale-150 object-cover"
              />
            </span>
            <h1 className="font-display text-2xl font-700 tracking-tight text-blue-ink">
              Sign in to <span className="holo-text">Fresh Phones PH</span>
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Staff &amp; customer portal
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-600 text-blue-ink">
                Email or username
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-ink outline-none transition focus:border-blue focus:bg-white"
                placeholder="you@freshphones.ph"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-600 text-blue-ink">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-ink outline-none transition focus:border-blue focus:bg-white"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="rounded-2xl bg-hotpink/15 px-4 py-2.5 text-sm font-600 text-hotpink">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-candy mt-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <SignIn weight="fill" className="h-5 w-5" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Payment coordination stays in Messenger — this portal is for records
          &amp; status only.
        </p>
      </div>
    </main>
  );
}
