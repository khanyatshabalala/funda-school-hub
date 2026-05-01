/**
 * create-staff-account
 * Called by:
 *   - super_admin  → create principal / school_admin for a school
 *   - principal / school_admin → create teacher / school_admin for their own school
 *
 * Body: { full_name, email, password, role, school_id }
 *
 * Uses the service-role key (server-side only) to create the auth user,
 * then inserts the correct role row — WITHOUT the default "parent" role
 * that the handle_new_user trigger would normally add.
 *
 * We skip the trigger's parent role by inserting the staff role first and
 * relying on ON CONFLICT DO NOTHING in the trigger, OR we delete the
 * auto-inserted parent role right after creation.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAFF_ROLES = ["teacher", "principal", "school_admin", "super_admin"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── 1. Verify the caller is authenticated ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client scoped to the caller's JWT — used to check their role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

    // Admin client — has full access
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 2. Parse & validate body ───────────────────────────────────────────
    const { full_name, email, password, role, school_id } = await req.json() as {
      full_name: string;
      email: string;
      password: string;
      role: StaffRole;
      school_id: string | null;
    };

    if (!full_name?.trim()) return json({ error: "full_name is required" }, 400);
    if (!email?.trim()) return json({ error: "email is required" }, 400);
    if (!password || password.length < 6) return json({ error: "password must be at least 6 characters" }, 400);
    if (!STAFF_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);
    if (role !== "super_admin" && !school_id) return json({ error: "school_id is required for this role" }, 400);

    // ── 3. Authorisation check ─────────────────────────────────────────────
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", caller.id);

    const isSuperAdmin = callerRoles?.some((r) => r.role === "super_admin");
    const isPrincipalOrAdmin = callerRoles?.some(
      (r) =>
        (r.role === "principal" || r.role === "school_admin") &&
        r.school_id === school_id,
    );

    // super_admin can create any staff role
    // principal/school_admin can only create teacher or school_admin for their own school
    if (!isSuperAdmin) {
      if (!isPrincipalOrAdmin) return json({ error: "Forbidden" }, 403);
      if (role === "principal" || role === "super_admin") {
        return json({ error: "Only a super admin can create a principal or super admin account" }, 403);
      }
    }

    // ── 4. Create the auth user ────────────────────────────────────────────
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // skip email verification — admin is setting this up
      user_metadata: { full_name: full_name.trim() },
    });

    if (createErr) {
      // Surface duplicate email clearly
      if (createErr.message.toLowerCase().includes("already")) {
        return json({ error: "An account with that email already exists." }, 409);
      }
      return json({ error: createErr.message }, 400);
    }

    const newUserId = created.user.id;

    // ── 5. Remove the auto-assigned "parent" role from the trigger ─────────
    await admin.from("user_roles").delete().eq("user_id", newUserId).eq("role", "parent");

    // ── 6. Insert the correct staff role ──────────────────────────────────
    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role,
      school_id: role === "super_admin" ? null : school_id,
    });

    if (roleErr) {
      // Roll back — delete the auth user so we don't leave orphans
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: roleErr.message }, 500);
    }

    return json({ success: true, user_id: newUserId });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
