import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/actions";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/login?error=not-admin");
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar email={session.user.email} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
