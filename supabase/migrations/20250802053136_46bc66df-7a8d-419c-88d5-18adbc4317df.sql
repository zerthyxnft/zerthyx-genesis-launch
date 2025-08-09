-- Add foreign key relationships to establish proper table relations

-- Add foreign key for deposits to profiles (via user_id)
ALTER TABLE public.deposits 
ADD CONSTRAINT fk_deposits_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for withdrawals to profiles (via user_id)  
ALTER TABLE public.withdrawals
ADD CONSTRAINT fk_withdrawals_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for user_wallets to profiles (via user_id)
ALTER TABLE public.user_wallets
ADD CONSTRAINT fk_user_wallets_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for profiles to auth users
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;