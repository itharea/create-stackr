"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/auth/types";

const ROLES = ["all", "admin", "mentor", "student", "alumni"] as const;

interface Props {
  users: User[];
  initialFilters: { search: string; role: string };
}

export function UsersClient({ users, initialFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [roleFilter, setRoleFilter] = useState(initialFilters.role);

  const updateUrl = (overrides: { search?: string; role?: string }) => {
    const nextSearch = overrides.search ?? search;
    const nextRole = overrides.role ?? roleFilter;

    const sp = new URLSearchParams();
    if (nextSearch) sp.set("search", nextSearch);
    if (nextRole && nextRole !== "all") sp.set("role", nextRole);

    const query = sp.toString();
    startTransition(() => {
      router.push(`${pathname}${query ? `?${query}` : ""}`);
    });
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Users</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isPending ? "Loading..." : `${users.length} users`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUrl({ search });
              }}
            >
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </form>
            <div className="flex gap-1">
              {ROLES.map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRoleFilter(role);
                    updateUrl({ role });
                  }}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* User table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Joined</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3">{user.name || "-"}</td>
                    <td className="text-muted-foreground py-3">{user.email}</td>
                    <td className="py-3">
                      <span className="bg-secondary rounded px-2 py-0.5 text-xs font-medium capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="text-muted-foreground py-3">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/users/${user.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
