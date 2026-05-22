import "server-only";
import { cache } from "react";
import { buildAuthHeaders } from "./cookies";
import { AUTH_CONFIG } from "./config";
import type { AuthSession } from "./types";

// Wrapped in React.cache() so a layout + its nested pages share one backend
// call per request. `cache: "no-store"` alone only opts out of the data cache;
// it does NOT dedupe within a request. Keep this file out of "use server" —
// every export in a Server Action file becomes a callable action, which would
// defeat the per-request memoization.
export const getSession = cache(async (): Promise<AuthSession | null> => {
  try {
    const response = await fetch(
      `${AUTH_CONFIG.backendUrl}/api/auth/get-session`,
      {
        method: "GET",
        headers: await buildAuthHeaders(),
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.user) return null;

    return data as AuthSession;
  } catch {
    return null;
  }
});
