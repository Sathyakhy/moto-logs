import { useOnlineStatus } from "@/hooks/usePWAInstall";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-warning/40 bg-card/95 px-4 py-1.5 text-xs font-medium text-warning shadow-xl backdrop-blur-md animate-in slide-in-from-top-2">
      <WifiOff className="size-3.5" />
      <span>Offline Mode — Showing cached garage data</span>
    </div>
  );
}
