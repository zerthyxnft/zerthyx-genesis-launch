-- Create admin functions with proper security definer
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
$$;

-- Update profiles RLS policies for admin access
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and Admin can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Everyone can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "Users and admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- Update deposits RLS policies
DROP POLICY IF EXISTS "Users and Admin can view deposits" ON public.deposits;

CREATE POLICY "Users and admins can view deposits"
ON public.deposits
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- Update withdrawals RLS policies
DROP POLICY IF EXISTS "Users and Admin can view withdrawals" ON public.withdrawals;

CREATE POLICY "Users and admins can view withdrawals"
ON public.withdrawals
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- Update user_wallets RLS policies
DROP POLICY IF EXISTS "Users and Admin can view wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.user_wallets;

CREATE POLICY "Users and admins can view wallets"
ON public.user_wallets
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "Users and admins can update wallets"
ON public.user_wallets
FOR UPDATE
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- Add admin policies for withdrawals and deposits updates
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawals
FOR UPDATE
USING (public.is_current_user_admin());

CREATE POLICY "Admins can update deposits"
ON public.deposits
FOR UPDATE
USING (public.is_current_user_admin());