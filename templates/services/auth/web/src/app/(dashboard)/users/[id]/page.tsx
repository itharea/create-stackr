import { notFound } from "next/navigation";
import { fetchUser } from "@/lib/admin/actions";
import { getSession } from "@/lib/auth/session";
import { UserDetailClient } from "./user-detail-client";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // getSession() is also called in (dashboard)/layout.tsx; React.cache() in
  // session.ts dedupes them into one backend fetch per request.
  const [user, session] = await Promise.all([fetchUser(id), getSession()]);

  if (!user) notFound();

  return (
    <UserDetailClient user={user} currentUserId={session?.user.id ?? null} />
  );
}
