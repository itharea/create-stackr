import { fetchUsers } from "@/lib/admin/actions";
import { UsersClient } from "./users-client";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const users = await fetchUsers({ search: sp.search, role: sp.role });

  return (
    <UsersClient
      users={users}
      initialFilters={{
        search: sp.search ?? "",
        role: sp.role ?? "all",
      }}
    />
  );
}
