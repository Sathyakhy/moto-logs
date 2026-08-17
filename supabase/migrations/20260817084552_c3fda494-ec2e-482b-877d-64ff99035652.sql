ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS gas_station text;
ALTER TABLE public.fuel_logs ADD COLUMN IF NOT EXISTS price_per_liter numeric;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_logs TO authenticated;
GRANT ALL ON public.fuel_logs TO service_role;
