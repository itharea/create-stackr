"use server";

import { revalidateTag } from "next/cache";
import { buildAuthHeaders } from "@/lib/auth/cookies";
import { AUTH_CONFIG } from "@/lib/auth/config";
import type { User, UserRole } from "@/lib/auth/types";

const BACKEND = AUTH_CONFIG.backendUrl;

export async function fetchUsers(params?: {
  search?: string;
  role?: string;
}): Promise<User[]> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  if (params?.role && params.role !== "all") sp.set("role", params.role);

  const query = sp.toString();
  const res = await fetch(
    `${BACKEND}/api/admin/users${query ? `?${query}` : ""}`,
    {
      headers: await buildAuthHeaders(),
      next: { tags: ["admin-users"] },
    }
  );

  if (!res.ok) return [];
  return res.json();
}

export async function fetchUser(id: string): Promise<User | null> {
  const res = await fetch(`${BACKEND}/api/admin/users/${id}`, {
    headers: await buildAuthHeaders(),
    next: { tags: ["admin-users"] },
  });

  if (!res.ok) return null;
  return res.json();
}

export interface UserStats {
  total: number;
  admins: number;
  mentors: number;
  students: number;
  alumni: number;
}

export async function fetchUserStats(): Promise<UserStats> {
  const users = await fetchUsers();
  return {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    mentors: users.filter((u) => u.role === "mentor").length,
    students: users.filter((u) => u.role === "student").length,
    alumni: users.filter((u) => u.role === "alumni").length,
  };
}

export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BACKEND}/api/admin/users/${id}/role`, {
    method: "PUT",
    headers: await buildAuthHeaders(),
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      error: err.error?.message || "Failed to update role",
    };
  }

  revalidateTag("admin-users");
  return { success: true };
}

export async function deleteUser(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BACKEND}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: await buildAuthHeaders({ includeContentType: false }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      error: err.error?.message || "Failed to delete user",
    };
  }

  revalidateTag("admin-users");
  return { success: true };
}
