"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/format";
import { Icon } from "./icon";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn-primary",
  icon,
  name,
  value,
  formAction,
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  icon?: string;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? <Icon name="progress_activity" className="animate-spin text-lg" /> : icon ? <Icon name={icon} className="text-lg" /> : null}
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState | undefined }) {
  if (!state?.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-space-xs rounded-lg px-space-md py-space-sm font-body-sm text-body-sm",
        state.ok ? "bg-secondary-fixed/30 text-on-secondary-container" : "bg-error-container text-on-error-container",
      )}
    >
      <Icon name={state.ok ? "check_circle" : "error"} className="text-lg mt-px" />
      <span>{state.message}</span>
    </div>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="tv-error">{errors[0]}</p>;
}

export function Field({
  label,
  name,
  errors,
  help,
  required,
  children,
  aside,
}: {
  label: string;
  name: string;
  errors?: string[];
  help?: string;
  required?: boolean;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="tv-label">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
        {aside}
      </div>
      {children}
      {help && !errors?.length && <p className="tv-help">{help}</p>}
      <FieldError errors={errors} />
    </div>
  );
}

const SECRET_FIELDS = new Set(["password", "confirm_password", "current_password"]);

/**
 * useActionState wrapper that remembers submitted values when the action fails,
 * so React 19's automatic form reset does not wipe what the user typed.
 * Use `v(name)` as an input's defaultValue.
 */
export function useFormAction(serverAction: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await serverAction(prev, fd);
    if (result.ok) return result;
    const values: Record<string, string> = {};
    fd.forEach((val, key) => {
      if (typeof val === "string" && !SECRET_FIELDS.has(key) && !key.startsWith("$")) values[key] = val;
    });
    return { ...result, data: { ...(result.data ?? {}), __values: values } };
  }, initialActionState);
  const values = (state.data?.__values ?? {}) as Record<string, string>;
  const v = (name: string, fallback = "") => values[name] ?? fallback;
  return { state, action, pending, v, fe: state.fieldErrors ?? {} };
}
