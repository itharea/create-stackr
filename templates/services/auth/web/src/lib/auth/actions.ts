"use server";

import { redirect } from "next/navigation";
import {
  setSessionCookie,
  clearSessionCookie,
  buildAuthHeaders,
} from "./cookies";
import { AUTH_CONFIG, BETTER_AUTH_COOKIE_NAME } from "./config";
import type { AuthSession, FormActionState } from "./types";

function extractSessionToken(response: Response): string | null {
  const setCookieHeaders = response.headers.getSetCookie();
  for (const header of setCookieHeaders) {
    const match = header.match(
      new RegExp(`${BETTER_AUTH_COOKIE_NAME}=([^;]+)`)
    );
    if (match) return match[1];
  }
  return null;
}

export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${AUTH_CONFIG.backendUrl}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: await buildAuthHeaders(),
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.message || "Invalid email or password",
      };
    }

    const sessionToken = extractSessionToken(response);
    if (!sessionToken) {
      return { success: false, error: "No session token received" };
    }

    await setSessionCookie(sessionToken);
    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: "An error occurred during sign in" };
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${AUTH_CONFIG.backendUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: await buildAuthHeaders(),
      cache: "no-store",
    });
  } catch {
    // Ignore sign-out errors — we still want to clear the cookie locally
  }
  await clearSessionCookie();
  redirect("/login");
}

export async function getSession(): Promise<AuthSession | null> {
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
}

export async function loginAction(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const result = await signIn(email, password);

  if (!result.success) {
    return { error: result.error || "Login failed" };
  }

  // After signing in, verify the user is an admin before sending to dashboard
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    await clearSessionCookie();
    return { error: "Access denied. Admin role required." };
  }

  redirect("/dashboard");
}
