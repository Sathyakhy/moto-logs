ALTER TABLE public.bikes ADD COLUMN photos_paths TEXT[] DEFAULT '{}';
COMMENT ON COLUMN public.bikes.photos_paths IS 'Array of photo paths for 360 view simulation';
