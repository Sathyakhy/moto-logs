import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export function use360Photos(paths: string[] | null | undefined) {
  const [urls, setUrls] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function getUrls() {
      if (!paths || paths.length === 0) {
        setUrls([]);
        return;
      }

      setLoading(true);
      try {
        const { data } = await supabase.storage.from("bike-files").createSignedUrls(paths, 60 * 60);
        if (data) {
          setUrls(data.map(d => d.signedUrl).filter(Boolean) as string[]);
        }
      } catch (error) {
        console.error("Error fetching 360 photos:", error);
      } finally {
        setLoading(false);
      }
    }

    getUrls();
  }, [paths]);

  return { urls, loading };
}

interface View360Props {
  paths: string[] | null | undefined;
  className?: string;
}

export function View360({ paths, className }: View360Props) {
  const { urls, loading } = use360Photos(paths);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const startX = React.useRef(0);
  const lastIndex = React.useRef(0);

  if (!paths || paths.length === 0) return null;
  if (loading || urls.length === 0) {
    return <div className={`animate-pulse bg-secondary rounded-2xl ${className}`} />;
  }

  // If only one photo, just show it
  if (urls.length === 1) {
    return <img src={urls[0]} alt="Motorcycle" className={`object-contain ${className}`} />;
  }

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startX.current = clientX;
    lastIndex.current = currentIndex;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const diff = clientX - startX.current;
    const sensitivity = 20; // pixels per image change
    const indexChange = Math.floor(diff / sensitivity);
    
    let nextIndex = (lastIndex.current + indexChange) % urls.length;
    if (nextIndex < 0) nextIndex = urls.length + nextIndex;
    
    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`relative cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => e.touches[0] && handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={`Motorcycle view ${i}`}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-100 ${
            i === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
        />
      ))}
      
      {/* 360 indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
        <div className="size-1 rounded-full bg-white/30" />
        <span className="text-[8px] text-white uppercase font-bold tracking-widest">360° View</span>
        <div className="size-1 rounded-full bg-white/30" />
      </div>
    </div>
  );
}
