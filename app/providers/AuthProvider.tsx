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
    let isInitialized = false;

    const initializeAuth = async () => {
      if (isInitialized) return; // Prevent multiple initializations

      try {
        // Get initial session without clearing existing session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          console.log("No valid session found, user needs to sign in");
          if (mounted) {
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
            setInitialized(true);
            isInitialized = true;
          }
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          await checkAdminStatus(session.user.id);
          setLoading(false);
          setInitialized(true);
          isInitialized = true;
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          setInitialized(true);
          isInitialized = true;
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

    // Handle browser close/refresh
    const handleBeforeUnload = () => {
      // Clear session on browser close
      supabase.auth.signOut({ scope: "local" });
    };

    // Handle tab focus to prevent unnecessary re-authentication
    const handleFocus = () => {
      // Don't re-authenticate on tab focus if already initialized
      if (isInitialized && user) {
        return;
      }
    };

    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isInitialized && user) {
        // Tab is visible and user is already authenticated, no need to reload
        return;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

      // Sign out from all scopes
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.error("Sign out error:", error);
        // Still clear local state even if signOut fails
      }

      // Clear local state immediately
      setUser(null);
      setIsAdmin(false);
      setInitialized(false);

      // Clear any cached data
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
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
