ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'MotoLog',
ADD COLUMN IF NOT EXISTS app_logo_path TEXT;

-- Update existing profiles to have the default name
UPDATE public.profiles SET app_name = 'MotoLog' WHERE app_name IS NULL;
