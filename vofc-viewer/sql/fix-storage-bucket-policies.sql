-- Fix Supabase storage bucket policies for document uploads
-- This ensures PDF files can be uploaded and JSON results can be saved

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for documents bucket (PDF uploads)
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
  AND (storage.extension(name) = 'pdf' OR storage.extension(name) = 'PDF')
);

CREATE POLICY "Allow authenticated users to read documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow service role to manage documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'documents' 
  AND auth.role() = 'service_role'
);

-- Policy for Parsed bucket (JSON results)
CREATE POLICY "Allow service role to upload parsed results" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'Parsed' 
  AND auth.role() = 'service_role'
  AND storage.extension(name) = 'json'
);

CREATE POLICY "Allow authenticated users to read parsed results" ON storage.objects
FOR SELECT USING (
  bucket_id = 'Parsed' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow service role to manage parsed results" ON storage.objects
FOR ALL USING (
  bucket_id = 'Parsed' 
  AND auth.role() = 'service_role'
);

-- Policy for processed-documents bucket
CREATE POLICY "Allow service role to manage processed documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'processed-documents' 
  AND auth.role() = 'service_role'
);

CREATE POLICY "Allow authenticated users to read processed documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'processed-documents' 
  AND auth.role() = 'authenticated'
);
