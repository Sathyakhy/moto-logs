import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function use360Photos(paths: string[] | null | undefined) {
  const [urls, setUrls] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadedCount, setLoadedCount] = React.useState(0);

  React.useEffect(() => {
    async function getUrls() {
      if (!paths || paths.length === 0) {
        setUrls([]);
        return;
      }

      setLoading(true);
      setLoadedCount(0);
      try {
        const { data } = await supabase.storage.from("bike-files").createSignedUrls(paths, 60 * 60 * 24);
        if (data) {
          const validUrls = data.map(d => d.signedUrl).filter(Boolean) as string[];
          setUrls(validUrls);
          
          // Preload images to browser cache for smooth switching
          validUrls.forEach((url) => {
            const img = new Image();
            img.src = url;
            img.onload = () => setLoadedCount((prev) => prev + 1);
            img.onerror = () => setLoadedCount((prev) => prev + 1);
          });
        }
      } catch (error) {
        console.error("Error fetching 360 photos:", error);
      } finally {
        setLoading(false);
      }
    }

    getUrls();
  }, [paths]);

  const isFullyLoaded = urls.length > 0 && loadedCount >= urls.length;

  return { 
    urls, 
    loading: loading || !isFullyLoaded, 
    progress: urls.length > 0 ? (loadedCount / urls.length) * 100 : 0 
  };
}

interface View360Props {
  paths: string[] | null | undefined;
  className?: string;
}

export function View360({ paths, className }: View360Props) {
  const { urls, loading, progress } = use360Photos(paths);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const startX = React.useRef(0);
  const currentOffset = React.useRef(0);

  if (!paths || paths.length === 0) return null;
  
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-secondary/20 rounded-2xl ${className}`}>
        <Loader2 className="size-8 text-primary animate-spin mb-3 opacity-50" />
        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (urls.length === 1) {
    return <img src={urls[0]} alt="Motorcycle" className={`object-contain ${className}`} />;
  }

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startX.current = clientX;
    currentOffset.current = 0;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startX.current;
    // Lower sensitivity = more frequent updates = smoother rotation
    const sensitivity = 5; 
    
    currentOffset.current += deltaX;
    startX.current = clientX;

    const steps = Math.round(currentOffset.current / sensitivity);
    
    if (steps !== 0) {
      setCurrentIndex((prev) => {
        // Change direction: drag left (negative delta) moves to next images
        let next = (prev - steps) % urls.length;
        if (next < 0) next = urls.length + next;
        return next;
      });
      currentOffset.current = 0;
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`relative cursor-grab active:cursor-grabbing select-none touch-none group bike-bg-premium rounded-3xl ${className}`}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => e.touches[0] && handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 border border-white/10 pointer-events-none">
        <div className="size-1 rounded-full bg-primary animate-pulse" />
        <span className="text-[9px] text-white uppercase font-bold tracking-[0.2em]">360° Perspective</span>
        <div className="size-1 rounded-full bg-primary animate-pulse" />
      </div>

      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={`Motorcycle view ${i}`}
          // Use display: block/none for zero latency switching (opacity can feel sluggish)
          style={{ display: i === currentIndex ? 'block' : 'none' }}
          className="absolute inset-0 size-full object-contain pointer-events-none"
          draggable={false}
        />
      ))}
    </div>
  );
}
