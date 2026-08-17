import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="panel p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome</h2>
          <p className="text-muted-foreground">Your bike maintenance overview will appear here.</p>
        </div>
      </div>
    </AppShell>
  );
}
