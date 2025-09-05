-- Add admin user directly using user_id from network logs
INSERT INTO public.admin_users (user_id, role, permissions)
VALUES (
  '9d766837-ba35-413c-803c-55e7281c36eb',
  'super_admin',
  '["dashboard", "users", "blockchain", "deposits", "content", "settings"]'::jsonb
)
ON CONFLICT (user_id) DO NOTHING;