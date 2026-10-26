"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { type AuthState, signIn, signUp } from "@/lib/auth/actions";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";

const fieldClass = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm placeholder:text-slate-600 ${focusRing}`;

const primaryButton = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-blue-800 px-4 text-base font-semibold text-white shadow-sm hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-blue-800 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`;

type CredentialsFormProps = {
  mode: "sign-in" | "sign-up";
};

function BrandMark() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-800 text-white shadow-sm">
      <MessageSquareText className="size-5" aria-hidden />
    </span>
  );
}

export function CredentialsForm({ mode }: CredentialsFormProps) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );
  const title = mode === "sign-in" ? "Sign in" : "Create account";
  const submitLabel = mode === "sign-in" ? "Sign in" : "Sign up";
  const pendingLabel = mode === "sign-in" ? "Signing in…" : "Creating account…";
  const intro =
    mode === "sign-in"
      ? "Use the email and password for your account."
      : "Your display name starts as the part of your email before @.";

  return (
    <main
      className="min-h-dvh bg-slate-100 text-slate-950"
      style={{ colorScheme: "light" }}
    >
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between bg-slate-950 px-10 py-12 text-white lg:flex">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" aria-hidden />
          <div className="flex items-center gap-3">
            <BrandMark />
            <p className="text-lg font-semibold tracking-tight">Messages</p>
          </div>
          <div className="max-w-md">
            <p className="text-3xl font-semibold leading-tight tracking-tight">
              Channels and direct messages
            </p>
            <p className="mt-4 text-base leading-7 text-slate-300">{intro}</p>
          </div>
          <p className="text-sm font-medium text-slate-300">Email and password</p>
        </section>

        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <p className="text-lg font-semibold tracking-tight">Messages</p>
            </div>
            <form
              action={formAction}
              className="rounded-xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm sm:p-8"
              style={{ colorScheme: "light" }}
            >
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-base leading-7 text-slate-600">{intro}</p>

              <div className="mt-8 grid gap-5">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-semibold text-slate-900">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={fieldClass}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-900">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    minLength={6}
                    required
                    className={fieldClass}
                  />
                </div>
                {mode === "sign-up" ? (
                  <div className="grid gap-2">
                    <label htmlFor="confirm" className="text-sm font-semibold text-slate-900">
                      Confirm password
                    </label>
                    <input
                      id="confirm"
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className={fieldClass}
                    />
                  </div>
                ) : null}
              </div>

              {state?.error ? (
                <p
                  role="alert"
                  className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-800"
                >
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className={`mt-6 ${primaryButton}`}
              >
                {pending ? pendingLabel : submitLabel}
              </button>

              <p className="mt-5 text-center text-sm leading-6 text-slate-600">
                {mode === "sign-in" ? (
                  <>
                    No account yet?{" "}
                    <Link
                      href="/signup"
                      className={`cursor-pointer rounded-sm font-semibold text-blue-800 underline-offset-2 hover:underline ${focusRing}`}
                    >
                      Sign up
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className={`cursor-pointer rounded-sm font-semibold text-blue-800 underline-offset-2 hover:underline ${focusRing}`}
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
