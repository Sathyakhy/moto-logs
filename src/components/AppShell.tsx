import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bike, Gauge, LogOut, Moon, Settings, Sun, Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/bikes", label: "Garage", icon: Bike },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function ThemeToggle() {
  const toggle = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    void navigate({ to: "/auth" });
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" aria-hidden />
            <span className="text-display text-2xl">MotoLog</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 md:gap-2">
            <div className="hidden md:flex items-center gap-1">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  <Icon className="size-4" aria-hidden />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out" className="md:ml-2">
              <LogOut className="size-4 md:mr-2" aria-hidden />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-32 md:pb-8 md:py-8 -webkit-overflow-scrolling-touch">
        <div className="mx-auto max-w-6xl pb-[env(safe-area-inset-bottom)]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-display text-3xl md:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-1 text-xs md:text-sm text-muted-foreground line-clamp-1">{subtitle}</p> : null}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </main>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 pt-3 pb-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 px-3 text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function StatusPill({ status }: { status: "good" | "due-soon" | "overdue" }) {
  const map = {
    good: "border-success/40 bg-success/10 text-success",
    "due-soon": "border-warning/40 bg-warning/10 text-warning",
    overdue: "border-destructive/40 bg-destructive/10 text-destructive",
  } as const;
  const label = { good: "Good", "due-soon": "Due soon", overdue: "Overdue" } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}
    >
      {label[status]}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <p className="label-caps font-medium text-[0.65rem] tracking-[0.2em]">{label}</p>
      <p className="num mt-2.5 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
