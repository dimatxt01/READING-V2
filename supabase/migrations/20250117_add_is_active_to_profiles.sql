-- Add is_active column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.is_active IS 'Indicates whether the user account is active or deactivated';
