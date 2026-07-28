"use client";

import { useActionState } from "react";
import { AlertCircle, LockKeyhole, Mail } from "lucide-react";

import { login, type LoginState } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const hasFormError = Boolean(state.message);

  return (
    <form action={formAction} className="mt-7 flex flex-col gap-4 sm:mt-8">
      {state.message ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">ელფოსტა</Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            strokeWidth={1.8}
            className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-[#706d69]"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@nordicliving.com"
            defaultValue={state.email}
            required
            aria-invalid={Boolean(state.errors?.email) || hasFormError}
            aria-describedby={state.errors?.email ? "email-error" : undefined}
            className="pl-10"
          />
        </div>
        {state.errors?.email ? (
          <p id="email-error" className="text-xs text-[#b42318]">
            {state.errors.email}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">პაროლი</Label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            strokeWidth={1.8}
            className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-[#706d69]"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            aria-invalid={Boolean(state.errors?.password) || hasFormError}
            aria-describedby={
              state.errors?.password ? "password-error" : undefined
            }
            className="pl-10"
          />
        </div>
        {state.errors?.password ? (
          <p id="password-error" className="text-xs text-[#b42318]">
            {state.errors.password}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="-mt-px w-full"
      >
        {pending ? "მიმდინარეობს შესვლა…" : "შესვლა"}
      </Button>
    </form>
  );
}
