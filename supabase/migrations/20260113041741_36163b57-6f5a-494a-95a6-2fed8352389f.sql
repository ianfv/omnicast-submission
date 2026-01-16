-- Drop all existing storage policies for classroom-documents
DROP POLICY IF EXISTS "Teachers can upload classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete classroom files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view classroom files" ON storage.objects;

-- Create simple, working policies using auth.uid() directly
-- Teachers: can upload, view, delete files if they own the classroom
CREATE POLICY "teacher_upload_files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-documents' 
  AND (
    SELECT teacher_id FROM classrooms 
    WHERE id::text = (string_to_array(name, '/'))[1]
    LIMIT 1
  ) = auth.uid()
);

CREATE POLICY "teacher_select_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-documents'
  AND (
    SELECT teacher_id FROM classrooms 
    WHERE id::text = (string_to_array(name, '/'))[1]
    LIMIT 1
  ) = auth.uid()
);

CREATE POLICY "teacher_delete_files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-documents'
  AND (
    SELECT teacher_id FROM classrooms 
    WHERE id::text = (string_to_array(name, '/'))[1]
    LIMIT 1
  ) = auth.uid()
);

-- Students: can view files if enrolled in the classroom
CREATE POLICY "student_select_files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-documents'
  AND EXISTS (
    SELECT 1 FROM student_enrollments 
    WHERE classroom_id::text = (string_to_array(name, '/'))[1]
    AND student_user_id = auth.uid()
  )
);