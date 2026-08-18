import { Loader2 } from "lucide-react";

export function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-display text-xl tracking-wider text-muted-foreground animate-pulse">
          PREPARING GARAGE...
        </p>
      </div>
    </div>
  );
}
