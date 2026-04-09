-- Add resume_tailors counter to user_usage
ALTER TABLE public.user_usage
  ADD COLUMN IF NOT EXISTS resume_tailors integer NOT NULL DEFAULT 0;
