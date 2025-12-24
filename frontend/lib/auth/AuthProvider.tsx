"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocalUser } from "../hooks/useLocalUser";

type AuthStrategy = "clerk" | "local";

type ClerkUser = { id?: string };
type ClerkAuthState = { user?: ClerkUser };
type ClerkClient = {
  load: (opts: { publishableKey: string }) => Promise<void>;
  user?: ClerkUser;
  session?: { getToken?: () => Promise<string | null> };
  signOut?: () => Promise<void>;
  openSignIn?: () => void;
  openUserProfile?: () => void;
  addListener?: (listener: (state: ClerkAuthState) => void) => void;
};

type ClerkWindow = typeof window & { Clerk?: ClerkClient };

type AuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  strategy: AuthStrategy;
  getToken: () => Promise<string | undefined>;
  signIn: () => void;
  signOut: () => Promise<void>;
  setLocalUserId: (value: string) => void;
  openUserProfile?: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadClerkScript() {
  return new Promise<ClerkWindow>((resolve) => {
    if (typeof window === "undefined") return resolve(window as unknown as ClerkWindow);
    if ((window as ClerkWindow).Clerk) return resolve(window as ClerkWindow);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@4/dist/clerk.browser.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(window as ClerkWindow);
    script.onerror = () => resolve(window as ClerkWindow);
    document.body.appendChild(script);
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { userId: localUserId, setUserId: setLocalUserId } = useLocalUser();
  const [isLoaded, setIsLoaded] = useState(false);
  const [clerkUserId, setClerkUserId] = useState<string | undefined>(undefined);
  const [clerkClient, setClerkClient] = useState<ClerkClient | undefined>(undefined);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      setIsLoaded(true);
      return;
    }

    void (async () => {
      try {
        const win = await loadClerkScript();
        const client: ClerkClient | undefined = win?.Clerk;
        if (!client) {
          setIsLoaded(true);
          return;
        }
        await client.load({ publishableKey });
        setClerkClient(client);
        setClerkUserId(client.user?.id);
        if (client.addListener) {
          client.addListener((authState: ClerkAuthState) => {
            setClerkUserId(authState?.user?.id ?? undefined);
          });
        }
      } catch (error) {
        console.error("Failed to initialise Clerk", error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const userId = clerkUserId || localUserId || undefined;
    const isSignedIn = Boolean(userId);
    const strategy: AuthStrategy = clerkUserId ? "clerk" : "local";

    const getToken = async () => {
      try {
        if (clerkClient?.session?.getToken) {
          return await clerkClient.session.getToken();
        }
      } catch (error) {
        console.warn("Unable to fetch Clerk token", error);
      }
      return undefined;
    };

    const signIn = () => {
      if (clerkClient?.openSignIn) {
        clerkClient.openSignIn();
        return;
      }
      const input = typeof window !== "undefined" ? window.prompt("Enter an email to identify yourself") : "";
      if (input) {
        setLocalUserId(input);
      }
    };

    const signOut = async () => {
      try {
        if (clerkClient?.signOut) {
          await clerkClient.signOut();
        }
      } catch (error) {
        console.warn("Unable to sign out of Clerk", error);
      } finally {
        setClerkUserId(undefined);
        setLocalUserId("");
      }
    };

    const openUserProfile = clerkClient?.openUserProfile
      ? () => clerkClient.openUserProfile()
      : undefined;

    return {
      isLoaded,
      isSignedIn,
      userId,
      strategy,
      getToken,
      signIn,
      signOut,
      setLocalUserId,
      openUserProfile,
    };
  }, [clerkClient, clerkUserId, isLoaded, localUserId, setLocalUserId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
