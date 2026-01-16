-- Drop broken policies
DROP POLICY IF EXISTS "teacher_upload_files" ON storage.objects;
DROP POLICY IF EXISTS "teacher_select_files" ON storage.objects;
DROP POLICY IF EXISTS "teacher_delete_files" ON storage.objects;
DROP POLICY IF EXISTS "student_select_files" ON storage.objects;

-- Recreate with correct reference to objects.name (not classrooms.name)
CREATE POLICY "teacher_upload_files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-documents' 
  AND (
    SELECT teacher_id FROM classrooms 
    WHERE id::text = (string_to_array(objects.name, '/'))[1]
    LIMIT 1
  ) = auth.uid()
);

CREATE POLICY "teacher_select_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-documents'
  AND (
    SELECT teacher_id FROM classrooms 
    WHERE id::text = (string_to_array(objects.name, '/'))[1]
    LIMIT 1
  ) = auth.uid()
);

CREATE POLICY "teacher_delete_files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-documents'
  AND (
    SELECT teacher_id FROM classrooms 
    WHERE id::text = (string_to_array(objects.name, '/'))[1]
    LIMIT 1
  ) = auth.uid()
);

CREATE POLICY "student_select_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-documents'
  AND EXISTS (
    SELECT 1 FROM student_enrollments 
    WHERE classroom_id::text = (string_to_array(objects.name, '/'))[1]
    AND student_user_id = auth.uid()
  )
);