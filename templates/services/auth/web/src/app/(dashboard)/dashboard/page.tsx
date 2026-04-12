import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUserStats } from "@/lib/admin/actions";

export default async function DashboardPage() {
  const stats = await fetchUserStats();

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.total} />
        <StatCard title="Admins" value={stats.admins} />
        <StatCard title="Mentors" value={stats.mentors} />
        <StatCard title="Students" value={stats.students} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
