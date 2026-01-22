-- Drop the problematic insert policy
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

-- Create proper insert policy for authenticated users
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);