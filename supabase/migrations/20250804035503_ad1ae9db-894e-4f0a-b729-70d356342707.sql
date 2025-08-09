-- Fix foreign key constraint for deposits table
-- First, check which users don't have profiles and create them
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.user_id
        WHERE p.user_id IS NULL
    LOOP
        INSERT INTO public.profiles (user_id, name, email)
        VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data ->> 'name', 'User'),
            user_record.email
        );
        
        -- Also create wallet for missing users
        INSERT INTO public.user_wallets (user_id)
        VALUES (user_record.id)
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;

-- Now add proper foreign key constraint to deposits table
ALTER TABLE public.deposits 
DROP CONSTRAINT IF EXISTS deposits_user_id_fkey;

ALTER TABLE public.deposits 
ADD CONSTRAINT deposits_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Fix the handle_new_user trigger to ensure it doesn't fail
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile with error handling
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'User'),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = COALESCE(NEW.raw_user_meta_data ->> 'name', 'User'),
    email = NEW.email,
    updated_at = now();
  
  -- Insert wallet with error handling
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;