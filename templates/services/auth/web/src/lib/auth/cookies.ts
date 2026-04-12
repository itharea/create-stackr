import "server-only";
import { cookies } from "next/headers";
import { AUTH_CONFIG, COOKIE_NAMES, BETTER_AUTH_COOKIE_NAME } from "./config";

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.SESSION, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_CONFIG.sessionMaxAge,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.SESSION)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.SESSION);
}

export async function buildAuthHeaders(options?: {
  includeContentType?: boolean;
}): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    Origin: AUTH_CONFIG.appUrl,
  };

  if (options?.includeContentType !== false) {
    headers["Content-Type"] = "application/json";
  }

  const sessionToken = await getSessionToken();
  if (sessionToken) {
    headers["Cookie"] = `${BETTER_AUTH_COOKIE_NAME}=${sessionToken}`;
  }

  return headers;
}
