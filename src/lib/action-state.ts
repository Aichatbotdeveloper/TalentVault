export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: Record<string, unknown>;
};

export const initialActionState: ActionState = { ok: false };

/** Map a Postgres/PostgREST error to a user-safe message (no internals leaked). */
export function safeDbMessage(error: { message?: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "42501") return "You do not have permission to perform this action.";
  // Messages raised deliberately by our own SQL functions (P0001) are written for users.
  if (error.code === "P0001" && error.message) return error.message.charAt(0).toUpperCase() + error.message.slice(1) + ".";
  return fallback;
}
