ALTER TABLE public.bikes ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Ensure only one bike is default per user
CREATE UNIQUE INDEX bikes_is_default_idx ON public.bikes (user_id) WHERE (is_default = true);

-- Add comment
COMMENT ON COLUMN public.bikes.is_default IS 'Flag to indicate the default motorcycle for overview display';

-- Update grants (standard procedure for table changes)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bikes TO authenticated;
GRANT ALL ON public.bikes TO service_role;
