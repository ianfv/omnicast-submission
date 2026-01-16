-- Drop existing classroom policies for students
DROP POLICY IF EXISTS "Students can view enrolled classrooms" ON classrooms;

-- Create a function to check if current user OR guest is enrolled
CREATE OR REPLACE FUNCTION public.can_view_classroom(classroom_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Teacher check
    SELECT 1 FROM classrooms
    WHERE id = classroom_uuid AND teacher_id = auth.uid()
  ) OR EXISTS (
    -- Enrolled authenticated student check
    SELECT 1 FROM student_enrollments
    WHERE classroom_id = classroom_uuid AND student_user_id = auth.uid()
  )
$$;

-- Recreate student view policy using the new function
CREATE POLICY "Students can view enrolled classrooms"
ON classrooms FOR SELECT
USING (
  auth.uid() = teacher_id 
  OR public.is_enrolled_student(id)
);

-- Allow anyone to view classroom documents if enrolled (for guest support we need anon access)
-- First update classroom_documents policies
DROP POLICY IF EXISTS "Enrolled users can view documents" ON classroom_documents;
DROP POLICY IF EXISTS "Teachers can manage documents" ON classroom_documents;
DROP POLICY IF EXISTS "Teachers can view classroom documents" ON classroom_documents;
DROP POLICY IF EXISTS "Teachers can insert classroom documents" ON classroom_documents;
DROP POLICY IF EXISTS "Teachers can delete classroom documents" ON classroom_documents;

-- Teachers can fully manage their classroom documents
CREATE POLICY "Teachers can manage documents"
ON classroom_documents FOR ALL
USING (public.is_classroom_teacher(classroom_id))
WITH CHECK (public.is_classroom_teacher(classroom_id));

-- Enrolled students can view documents
CREATE POLICY "Students can view documents"
ON classroom_documents FOR SELECT
USING (public.is_enrolled_student(classroom_id));