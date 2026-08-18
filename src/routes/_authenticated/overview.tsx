import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Bike as BikeIcon, 
  BookOpen, 
  Calendar, 
  CircleDot, 
  History, 
  Info, 
  LayoutDashboard, 
  Wrench 
} from "lucide-react";
import { useBikes } from "@/hooks/useBikes";
import { useDashboardHistory } from "@/hooks/useDashboard";
import { useProfile } from "@/hooks/useProfile";
import { AppShell } from "@/components/AppShell";
import { LogMaintenanceDialog } from "@/components/LogMaintenanceDialog";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/hooks/useBikes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { computeSchedule } from "@/lib/moto";
import { View360 } from "@/components/View360";

export const Route = createFileRoute("/_authenticated/overview")({
  component: Overview,
});

function Overview() {
  const { profile } = useProfile();
  const { data: bikes } = useBikes();
  const { data: history } = useDashboardHistory(profile?.id || undefined);
  
  // Use the default bike, or the first one if none is set
  const bike = bikes?.find(b => b.is_default) || bikes?.[0];

  const { data: schedules } = useQuery({
    queryKey: ["service-schedules", bike?.id],
    enabled: !!bike?.id,
    queryFn: async () => {
      if (!bike?.id) return [];
      const { data } = await supabase
        .from("service_schedules")
        .select("*")
        .eq("bike_id", bike.id);
      return data || [];
    }
  });

  const getHealth = (item: string) => {
    const s = schedules?.find(s => s.item.toLowerCase().includes(item.toLowerCase()));
    if (!s) return null;
    const computed = computeSchedule(s as any, bike?.current_odometer || 0);
    // Inverse of progress (which is used/distance)
    return Math.max(0, 100 - Math.round(computed.progress));
  };

  const oilHealth = getHealth("oil");
  const batteryHealth = getHealth("battery");
  const tireHealth = getHealth("tire");

  return (
    <AppShell title="Scooter Care" subtitle={bike ? `${bike.year} ${bike.name}` : "Welcome to your garage"}>
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-full aspect-[4/3] flex items-center justify-center mb-6 group bike-bg-premium-lg">
          {bike?.photos_paths && bike.photos_paths.length > 0 ? (
            <View360 paths={bike.photos_paths} className="size-full" />
          ) : bike?.photo_path ? (
            <HeroImage path={bike.photo_path} />
          ) : (
            <BikeIcon className="size-32 text-muted-foreground/20" />
          )}
        </div>
        
        <div className="flex flex-col items-center">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
             <Wrench className="size-8 text-primary" />
          </div>
          <h2 className="text-display text-3xl tracking-[0.1em]">Moto Care</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bike Status */}
        <div className="panel p-4 flex flex-col min-h-[160px]">
          <h3 className="label-caps mb-3 flex items-center gap-2">
            <BikeIcon className="size-3 text-primary" />
            Bike Status
          </h3>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <BikeIcon className="size-8 text-muted-foreground/40 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground">Oil Health: {oilHealth !== null ? `${oilHealth}%` : 'N/A'}</p>
                <p className="text-[10px] text-muted-foreground">Tire Status: {tireHealth !== null ? (tireHealth > 20 ? 'Good' : 'Check') : 'N/A'}</p>
                <p className="text-[10px] text-muted-foreground">Battery: {batteryHealth !== null ? `${batteryHealth}%` : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Booking */}
        <div className="panel p-4 flex flex-col min-h-[160px]">
          <h3 className="label-caps mb-3 flex items-center gap-2">
            <Calendar className="size-3 text-primary" />
            Service Booking
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="size-8" />
              <Wrench className="size-8 opacity-50" />
            </div>
            {bike && (
              <LogMaintenanceDialog 
                bikeId={bike.id}
                currentOdometer={bike.current_odometer}
                trigger={
                  <Button variant="secondary" size="sm" className="w-full text-[10px] h-8 font-bold uppercase tracking-wider">
                    Schedule Now
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Maintenance Guides */}
        <div className="panel p-4 flex flex-col min-h-[160px]">
          <h3 className="label-caps mb-3 flex items-center gap-2">
            <BookOpen className="size-3 text-primary" />
            Maintenance Guides
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-3 text-muted-foreground/40">
              <BookOpen className="size-8" />
              <CircleDot className="size-8" />
            </div>
            <Button variant="secondary" size="sm" className="w-full text-[10px] h-8 font-bold uppercase tracking-wider" disabled>
              Explore Guides
            </Button>
          </div>
        </div>

        {/* Service History */}
        <div className="panel p-4 flex flex-col min-h-[160px]">
          <h3 className="label-caps mb-3 flex items-center gap-2 border-b border-border pb-2">
            <History className="size-3 text-primary" />
            Service History
          </h3>
          <div className="flex-1 mt-2 space-y-3 overflow-hidden">
            {history?.maintenance && history.maintenance.length > 0 ? (
              history.maintenance.slice(0, 2).map((item: any, i) => (
                <div key={item.id} className="relative pl-4 border-l border-border">
                  <div className="absolute left-[-4.5px] top-1 size-2 rounded-full bg-primary" />
                  <p className="text-[10px] font-bold leading-none truncate">{item.notes || item.categories?.[0] || 'Service'}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <History className="size-6 mb-1" />
                <p className="text-[9px]">No history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function HeroImage({ path }: { path: string }) {
  const { data: url } = useSignedUrl(path);
  if (!url) return <div className="animate-pulse bg-secondary size-full rounded-2xl" />;
  return (
    <img 
      src={url} 
      alt="Motorcycle" 
      className="h-full w-full object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
    />
  );
}
