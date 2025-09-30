"use client";

import { User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshSession: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session with retry logic
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          // Try to refresh the session
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("Error refreshing session:", refreshError);
          } else if (refreshedSession?.user && mounted) {
            setUser(refreshedSession.user);
            await checkAdminStatus(refreshedSession.user.id);
          }
        } else if (session?.user && mounted) {
          setUser(session.user);
          await checkAdminStatus(session.user.id);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);

      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      // First try to get from custom users table
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.log("Custom users table not found or error:", error.message);
        // Fallback: check if user email is in admin list or use metadata
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // Check user metadata for admin role
          const isAdmin =
            user.user_metadata?.role === "admin" ||
            user.user_metadata?.is_admin === true ||
            user.email?.includes("admin") ||
            user.email?.includes("miniway");
          setIsAdmin(!!isAdmin);
          console.log("Admin status from metadata:", isAdmin);
        } else {
          setIsAdmin(false);
        }
        return;
      }

      setIsAdmin(data?.role === "admin");
    } catch (error) {
      console.error("Error checking admin status:", error);
      // Fallback: allow access for now (you can restrict this later)
      setIsAdmin(true);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Error refreshing session:", error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }

      // Check admin status after successful sign in
      if (data.user) {
        await checkAdminStatus(data.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }

      // Clear local state
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading: loading || !initialized,
    signIn,
    signOut,
    isAdmin,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
