/**
 * Converts raw Supabase DB/PostgREST errors into safe, user-friendly messages.
 * Never expose table names, column names, constraint names, or SQL to the user.
 */
export function friendlyDbError(
  error: { message?: string; code?: string; details?: string } | null,
  context?: {
    duplicate?: string;   // message to show on unique constraint violation
    notFound?: string;    // message to show on not-found
    forbidden?: string;   // message to show on RLS/permission denial
  },
): string {
  if (!error?.message) return "Something went wrong. Please try again.";

  const msg = error.message.toLowerCase();
  const code = error.code ?? "";

  // Unique constraint violation (23505)
  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
    return context?.duplicate ?? "This record already exists.";
  }

  // Foreign key violation (23503) — referenced record doesn't exist
  if (code === "23503" || msg.includes("foreign key") || msg.includes("violates")) {
    return "The selected item no longer exists. Please refresh and try again.";
  }

  // RLS / permission denied (42501 or PGRST301)
  if (
    code === "42501" ||
    code === "PGRST301" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("policy")
  ) {
    return context?.forbidden ?? "You don't have permission to do that.";
  }

  // Not found
  if (code === "PGRST116" || msg.includes("not found") || msg.includes("no rows")) {
    return context?.notFound ?? "Record not found.";
  }

  // Network / connection
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout")) {
    return "Connection problem. Check your internet and try again.";
  }

  // Anything else — schema errors, internal errors — show nothing specific
  return "Something went wrong. Please try again.";
}

/**
 * Sanitises error messages coming back from our own edge functions.
 * Edge functions return { error: string } — some of those strings are safe
 * (we wrote them), but we still gate them to avoid leaking anything unexpected.
 */
export function friendlyEdgeError(raw: string | undefined): string {
  if (!raw) return "Something went wrong. Please try again.";

  // Messages we explicitly wrote in the edge function — safe to show
  const safeMessages = [
    "An account with that email already exists.",
    "full_name is required",
    "email is required",
    "password must be at least 6 characters",
    "Invalid role",
    "school_id is required for this role",
    "Forbidden",
    "Only a super admin can create a principal or super admin account",
  ];

  if (safeMessages.some((s) => raw.toLowerCase().includes(s.toLowerCase()))) {
    return raw;
  }

  // Anything else is an internal error
  return "Something went wrong. Please try again.";
}
