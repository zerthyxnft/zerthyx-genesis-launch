-- Make transaction-screenshots bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'transaction-screenshots';