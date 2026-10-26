"use client";

import { useActionState } from "react";
import Link from "next/link";
import { type AuthState, signIn, signUp } from "@/lib/auth/actions";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--you)]";

const fieldClass = `min-h-11 w-full rounded-[10px] border border-[var(--line)] bg-[var(--sheet)] px-3 text-base text-[var(--ink)] placeholder:text-[var(--quiet)] ${focusRing}`;

const primaryButton = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] bg-[var(--you)] px-4 text-base font-semibold text-[var(--you-ink)] hover:bg-[var(--you-hover)] disabled:cursor-not-allowed motion-safe:transition-colors motion-safe:duration-200 motion-safe:active:translate-y-px ${focusRing}`;

type CredentialsFormProps = {
  mode: "sign-in" | "sign-up";
};

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
      className="grid min-h-dvh place-items-center bg-[var(--paper)] px-4 py-10 text-[var(--ink)]"
      style={{ colorScheme: "light" }}
    >
      <div className="w-full max-w-[22.5rem]">
        <p className="text-sm font-semibold text-[var(--you)]">Messages</p>
        <form action={formAction} className="mt-6" style={{ colorScheme: "light" }}>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-base leading-7 text-[var(--quiet)]">{intro}</p>

          <div className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-semibold">
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
              <label htmlFor="password" className="text-sm font-semibold">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={6}
                required
                className={fieldClass}
              />
            </div>
            {mode === "sign-up" ? (
              <div className="grid gap-2">
                <label htmlFor="confirm" className="text-sm font-semibold">
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
              className="mt-5 rounded-[10px] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium leading-6 text-[var(--danger)]"
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
        </form>

        <p className="mt-5 text-sm leading-6 text-[var(--quiet)]">
          {mode === "sign-in" ? (
            <>
              No account yet?{" "}
              <Link
                href="/signup"
                className={`cursor-pointer rounded-sm font-semibold text-[var(--you)] underline-offset-2 hover:underline ${focusRing}`}
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className={`cursor-pointer rounded-sm font-semibold text-[var(--you)] underline-offset-2 hover:underline ${focusRing}`}
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
