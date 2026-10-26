"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  type AuthState,
  signIn,
  signUp,
} from "@/lib/auth/actions";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800";

const fieldClass = `w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm ${focusRing}`;

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

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 text-neutral-950 shadow-sm"
      style={{ colorScheme: "light" }}
    >
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {mode === "sign-in"
          ? "Use the email and password for your account."
          : "Your display name starts as the part of your email before @."}
      </p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
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
        <div className="grid gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
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
          <div className="grid gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium">
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
        <p role="alert" className="mt-4 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`mt-6 w-full rounded-md bg-sky-800 px-3 py-2 text-sm font-medium text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
      >
        {pending ? pendingLabel : submitLabel}
      </button>

      <p className="mt-4 text-center text-sm text-neutral-600">
        {mode === "sign-in" ? (
          <>
            No account yet?{" "}
            <Link
              href="/signup"
              className={`font-medium text-sky-800 underline-offset-2 hover:underline ${focusRing}`}
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className={`font-medium text-sky-800 underline-offset-2 hover:underline ${focusRing}`}
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
