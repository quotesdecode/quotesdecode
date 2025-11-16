"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type SimpleUser = {
  email: string | null;
};

export function UserMenu() {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current user session
    supabase.auth.getUser().then(({ data, error }) => {
      const u = data.user;
      setUser(u ? { email: u.email ?? null } : null);
      setLoading(false);
    });

    // Listen for login/logout
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user;
        setUser(u ? { email: u.email ?? null } : null);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // REAL Google login button
  const handleSignIn = async () => {
    console.log("SIGN IN CLICKED!");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Sign in error:", error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="text-[11px] text-zinc-500">...</div>;
  }

  // USER NOT LOGGED IN → Show Sign In button
  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-white"
      >
        Sign in
      </button>
    );
  }

  // USER LOGGED IN → Show email + Sign out
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="max-w-[140px] truncate text-zinc-400">
        {user.email ?? "Signed in"}
      </span>
      <button
        onClick={handleSignOut}
        className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
      >
        Sign out
      </button>
    </div>
  );
}
