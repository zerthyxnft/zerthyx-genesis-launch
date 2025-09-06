-- Fix security linting issues from the previous migration

-- 1. Fix function search path issue for security definer functions
-- Set proper search_path for all security definer functions

-- Update all existing security definer functions to have proper search_path
ALTER FUNCTION public.is_current_user_admin() SET search_path = 'public';
ALTER FUNCTION public.add_referral_reward(uuid, uuid, numeric) SET search_path = 'public';
ALTER FUNCTION public.create_user_referral_code(uuid) SET search_path = 'public';
ALTER FUNCTION public.transfer_daily_earnings() SET search_path = 'public';
ALTER FUNCTION public.is_admin(uuid) SET search_path = 'public';
ALTER FUNCTION public.add_admin_by_email(text) SET search_path = 'public';
ALTER FUNCTION public.handle_referral_signup() SET search_path = 'public';
ALTER FUNCTION public.process_referral_reward() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_mining_wallet() SET search_path = 'public';
ALTER FUNCTION public.reset_daily_mining_stats() SET search_path = 'public';
ALTER FUNCTION public.generate_referral_code() SET search_path = 'public';
ALTER FUNCTION public.process_mining_claim(uuid) SET search_path = 'public';
ALTER FUNCTION public.complete_task(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.get_admin_dashboard_stats() SET search_path = 'public';
ALTER FUNCTION public.process_nft_maturity_check() SET search_path = 'public';
ALTER FUNCTION public.process_nft_withdrawal(uuid, numeric) SET search_path = 'public';
ALTER FUNCTION public.get_nft_deposit_summary(uuid) SET search_path = 'public';
ALTER FUNCTION public.approve_deposit_with_amount(uuid) SET search_path = 'public';
ALTER FUNCTION public.update_daily_earnings() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';