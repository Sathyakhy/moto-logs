import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bike as BikeIcon, RotateCw, Compass } from "lucide-react";
import { useSignedUrl } from "@/hooks/useBikes";

interface View360Props {
  paths?: string[] | null;
  fallbackPath?: string | null;
  className?: string;
  compact?: boolean;
}

export function View360({ paths, fallbackPath, className, compact }: View360Props) {
  const [urls, setUrls] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const startX = React.useRef(0);
  const currentOffset = React.useRef(0);

  const { data: fallbackUrl } = useSignedUrl(fallbackPath || "");

  // Load signed URLs for 360 photos with resilience and timeout
  React.useEffect(() => {
    let isMounted = true;
    const validPaths = (paths || []).filter((p) => Boolean(p && typeof p === "string" && p.trim() !== ""));

    if (validPaths.length === 0) {
      setUrls([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Timeout safety so it never gets stuck in infinite loading spinner
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    async function loadUrls() {
      try {
        const { data, error } = await supabase.storage
          .from("bike-files")
          .createSignedUrls(validPaths, 60 * 60 * 24);

        if (!isMounted) return;

        if (error || !data) {
          setUrls([]);
          setLoading(false);
          return;
        }

        const resolved = data.map((d) => d.signedUrl).filter(Boolean) as string[];
        if (resolved.length > 0) {
          setUrls(resolved);
        } else {
          setUrls([]);
        }
      } catch {
        if (isMounted) setUrls([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadUrls();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [paths]);

  const activePhotoList = urls.length > 0 ? urls : fallbackUrl ? [fallbackUrl] : [];

  const handleStart = (clientX: number) => {
    if (activePhotoList.length <= 1) return;
    setIsDragging(true);
    startX.current = clientX;
    currentOffset.current = 0;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || activePhotoList.length <= 1) return;

    const deltaX = clientX - startX.current;
    const sensitivity = 6;

    currentOffset.current += deltaX;
    startX.current = clientX;

    const steps = Math.round(currentOffset.current / sensitivity);

    if (steps !== 0) {
      setCurrentIndex((prev) => {
        let next = (prev - steps) % activePhotoList.length;
        if (next < 0) next = activePhotoList.length + next;
        return next;
      });
      currentOffset.current = 0;
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Angle label calculation
  const totalCount = activePhotoList.length;
  const currentAngle = totalCount > 1 ? Math.round((currentIndex / totalCount) * 360) : 0;

  const getAngleLabel = (angle: number) => {
    if (angle >= 315 || angle < 45) return "0° FRONT";
    if (angle >= 45 && angle < 135) return "90° SIDE";
    if (angle >= 135 && angle < 225) return "180° REAR";
    return "270° SIDE";
  };

  const jumpToAngle = (targetDeg: number) => {
    if (totalCount <= 1) return;
    const targetIdx = Math.round((targetDeg / 360) * totalCount) % totalCount;
    setCurrentIndex(targetIdx);
  };

  if (!loading && activePhotoList.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center text-muted-foreground ${className}`}>
        <BikeIcon className="size-16 opacity-20 stroke-1 mb-2 text-slate-400" />
        <p className="text-xs font-mono text-slate-500">NO VEHICLE PHOTO</p>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center w-full select-none ${className}`}>
      {/* 360 Turntable Frame - Comfortable 16:10 aspect ratio ensuring full bike height */}
      <div
        className={`relative w-full aspect-[16/10] sm:aspect-[16/10] min-h-[190px] max-h-[300px] flex items-center justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/95 backdrop-blur-xl ${
          totalCount > 1 ? "cursor-grab active:cursor-grabbing touch-none" : ""
        }`}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => e.touches[0] && handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {/* HUD Angle Overlay Badge - Only rendered when 360 multi-angles are available */}
        {totalCount > 1 && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-slate-950/85 px-2.5 py-1 text-[10px] font-mono font-bold text-amber-400 backdrop-blur-md shadow-xs pointer-events-none">
            <Compass className="size-3 text-amber-500" />
            <span>{getAngleLabel(currentAngle)}</span>
            <span className="text-slate-500 font-sans">|</span>
            <span className="text-slate-200">{currentAngle}°</span>
          </div>
        )}

        {/* Drag Hint Overlay */}
        {totalCount > 1 && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/85 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 backdrop-blur-md pointer-events-none">
            <RotateCw className="size-2.5 text-cyan-400" />
            <span>Drag 360°</span>
          </div>
        )}

        {/* Vehicle Image Viewport - Full object-contain with padding to preserve tires and wheels */}
        <div className="size-full flex items-center justify-center p-3 pt-6 pb-4">
          {activePhotoList.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`Motorcycle view ${i}`}
              style={{ display: i === currentIndex ? "block" : "none" }}
              className="max-h-full max-w-full w-auto h-auto object-contain pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-all duration-75 select-none"
              draggable={false}
            />
          ))}
        </div>

        {/* Subtle Turntable Floor Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950/50 to-transparent pointer-events-none" />
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-36 h-0.5 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none" />
      </div>

      {/* Preset Angle Buttons - Cleanly positioned below turntable frame */}
      {totalCount > 1 && (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 w-full">
          {[
            { label: "0° Front", deg: 0 },
            { label: "90° Side", deg: 90 },
            { label: "180° Rear", deg: 180 },
            { label: "270° Side", deg: 270 },
          ].map((btn) => {
            const isNear = Math.abs(currentAngle - btn.deg) < 45 || (btn.deg === 0 && currentAngle >= 315);
            return (
              <button
                key={btn.deg}
                type="button"
                onClick={() => jumpToAngle(btn.deg)}
                className={`rounded-md px-2 py-0.5 text-[9px] font-mono font-semibold transition-all ${
                  isNear
                    ? "border border-amber-500/60 bg-amber-500/20 text-amber-300 shadow-xs"
                    : "border border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
