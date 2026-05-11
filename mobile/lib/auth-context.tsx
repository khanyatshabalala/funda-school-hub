import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserRole = 'parent' | 'teacher' | 'principal' | 'school_admin' | 'super_admin';

export interface RoleRow {
  role: UserRole;
  school_id: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: RoleRow[];
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    subscription_tier: 'free' | 'premium';
    phone?: string | null;
  } | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  primaryRole: UserRole;
  primarySchoolId: string | null;
  displayName: string | null;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [profile, setProfile] = useState<AuthCtx['profile']>(null);
  const fetchedUid = useRef<string | null>(null);

  const loadUserData = async (uid: string) => {
    if (fetchedUid.current === uid) return;
    fetchedUid.current = uid;
    const [{ data: roleRows }, { data: prof }] = await Promise.all([
      supabase.from('user_roles').select('role, school_id').eq('user_id', uid),
      supabase.from('profiles').select('full_name, avatar_url, subscription_tier, phone').eq('id', uid).maybeSingle(),
    ]);
    setRoles((roleRows ?? []) as RoleRow[]);
    setProfile(prof as AuthCtx['profile']);
  };

  const clearUserData = () => {
    fetchedUid.current = null;
    setRoles([]);
    setProfile(null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserData(sess.user.id);
      else clearUserData();
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserData(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Role priority: super_admin > principal > school_admin > teacher > parent
  const order: UserRole[] = ['super_admin', 'principal', 'school_admin', 'teacher', 'parent'];
  const sorted = [...roles].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  const primary = sorted[0];
  const primaryRole: UserRole = primary?.role ?? 'parent';
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
        displayName: profile?.full_name ?? user?.user_metadata?.full_name ?? null,
        refresh: async () => {
          if (user) {
            fetchedUid.current = null;
            await loadUserData(user.id);
          }
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
