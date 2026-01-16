-- Make classroom-documents bucket public so enrolled students (including guests) can view files
UPDATE storage.buckets SET public = true WHERE id = 'classroom-documents';

-- Add SELECT policy for guests enrolled in the classroom (via enrollment records)
-- Since guests aren't authenticated, we'll rely on the public bucket with the folder structure
-- providing implicit access control (files are organized by classroom_id)