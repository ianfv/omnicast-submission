-- Drop the broken storage policies
DROP POLICY IF EXISTS "Teachers can upload to their classrooms" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view their classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete their classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled students can view classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view enrolled classroom files" ON storage.objects;

-- Recreate with correct path extraction
-- The file path format is: {classroom_id}/{timestamp}-{filename}
-- storage.foldername(name) returns an array of folder names in the path

CREATE POLICY "Teachers can upload classroom files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'classroom-documents' 
  AND EXISTS (
    SELECT 1 FROM classrooms 
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view classroom files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'classroom-documents'
  AND EXISTS (
    SELECT 1 FROM classrooms 
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete classroom files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'classroom-documents'
  AND EXISTS (
    SELECT 1 FROM classrooms 
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view classroom files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'classroom-documents'
  AND EXISTS (
    SELECT 1 FROM student_enrollments 
    WHERE student_enrollments.classroom_id::text = (storage.foldername(name))[1]
    AND student_enrollments.student_user_id = auth.uid()
  )
);