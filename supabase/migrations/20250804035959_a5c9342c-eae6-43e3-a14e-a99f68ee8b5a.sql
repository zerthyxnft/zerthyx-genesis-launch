-- Make transaction-screenshots bucket public and fix policies
UPDATE storage.buckets 
SET public = true 
WHERE id = 'transaction-screenshots';

-- Create proper storage policies for screenshot access
CREATE POLICY "Users can upload their own screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'transaction-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own screenshots" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'transaction-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all screenshots" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'transaction-screenshots' 
  AND is_current_user_admin()
);

CREATE POLICY "Everyone can view transaction screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'transaction-screenshots');