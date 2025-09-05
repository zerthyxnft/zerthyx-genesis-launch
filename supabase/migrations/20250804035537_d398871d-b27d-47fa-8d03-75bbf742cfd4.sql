-- Add unique constraint to user_wallets table and fix missing profiles
-- First add unique constraint on user_id
ALTER TABLE public.user_wallets 
ADD CONSTRAINT user_wallets_user_id_unique UNIQUE (user_id);

-- Fix missing profiles for existing users
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
        
        -- Also create wallet for missing users if it doesn't exist
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