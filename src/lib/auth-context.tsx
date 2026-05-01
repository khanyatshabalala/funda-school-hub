import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "parent" | "teacher" | "principal" | "school_admin" | "super_admin";

export interface RoleRow {
  role: UserRole;
  school_id: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: RoleRow[];
  profile: { full_name: string | null; avatar_url: string | null; subscription_tier: "free" | "premium" } | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  primaryRole: UserRole;
  primarySchoolId: string | null;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [profile, setProfile] = useState<AuthCtx["profile"]>(null);

  const loadUserData = async (uid: string) => {
    const [{ data: roleRows }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role, school_id").eq("user_id", uid),
      supabase.from("profiles").select("full_name, avatar_url, subscription_tier").eq("id", uid).maybeSingle(),
    ]);
    setRoles((roleRows ?? []) as RoleRow[]);
    setProfile(prof as AuthCtx["profile"]);
  };

  useEffect(() => {
    let currentUid: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      const newUid = sess?.user?.id ?? null;
      if (newUid && newUid !== currentUid) {
        currentUid = newUid;
        setTimeout(() => loadUserData(newUid), 0);
      } else if (!newUid) {
        currentUid = null;
        setRoles([]);
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        currentUid = sess.user.id;
        loadUserData(sess.user.id);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Role priority: super_admin > school_admin > principal > teacher > parent
  const order: UserRole[] = ["super_admin", "school_admin", "principal", "teacher", "parent"];
  const sorted = [...roles].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  const primary = sorted[0];
  const primaryRole: UserRole = primary?.role ?? "parent";
  const primarySchoolId = primary?.school_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        profile,
        primaryRole,
        primarySchoolId,
        refresh: async () => {
          if (user) await loadUserData(user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
