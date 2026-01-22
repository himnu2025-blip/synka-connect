-- Ensure documents bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;

-- Allow public read access to documents bucket
CREATE POLICY "Public read access for documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own documents
CREATE POLICY "Users can update their documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);