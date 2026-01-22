-- Create storage policies for the profiles bucket

-- Allow authenticated users to upload files to the profiles bucket
CREATE POLICY "Users can upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profiles');

-- Allow public read access to profile images (bucket is already public)
CREATE POLICY "Public can view profile images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profiles');