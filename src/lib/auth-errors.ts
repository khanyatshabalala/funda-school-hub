/**
 * Converts raw Supabase auth errors into safe, user-friendly messages.
 * Never expose internal error details, schema info, or DB messages to the user.
 */
export function friendlyAuthError(error: { message?: string; status?: number } | null): string {
  if (!error?.message) return "Something went wrong. Please try again.";

  const msg = error.message.toLowerCase();

  // Wrong credentials
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }

  // Email not confirmed
  if (msg.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }

  // Account doesn't exist (Supabase sometimes returns this)
  if (msg.includes("user not found")) {
    // Don't confirm whether the email exists — use same message as wrong password
    return "Incorrect email or password.";
  }

  // Too many attempts
  if (msg.includes("too many requests") || msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Email already in use
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "An account with that email already exists. Try signing in instead.";
  }

  // Weak password
  if (msg.includes("password should be")) {
    return "Password must be at least 6 characters.";
  }

  // Network / timeout
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout")) {
    return "Connection problem. Check your internet and try again.";
  }

  // Anything else — DB errors, schema errors, internal errors — show nothing specific
  return "Something went wrong. Please try again.";
}
