import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/bikes")({
  component: Bikes,
});

function Bikes() {
  return (
    <AppShell title="My Garage">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="panel p-6">
          <p className="text-muted-foreground">No bikes added yet.</p>
        </div>
      </div>
    </AppShell>
  );
}
