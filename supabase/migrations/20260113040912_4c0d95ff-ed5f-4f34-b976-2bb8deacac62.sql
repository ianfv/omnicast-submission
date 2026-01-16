-- Drop the problematic restrictive policies
DROP POLICY IF EXISTS "Students can view classrooms they're enrolled in" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can view their own classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can create classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can update their own classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can delete their own classrooms" ON public.classrooms;

DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.student_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments for their classrooms" ON public.student_enrollments;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(classroom_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classrooms
    WHERE id = classroom_uuid AND teacher_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_student(classroom_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_enrollments
    WHERE classroom_id = classroom_uuid AND student_user_id = auth.uid()
  )
$$;

-- Recreate classrooms policies as PERMISSIVE (default)
CREATE POLICY "Teachers can view own classrooms"
ON public.classrooms FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view enrolled classrooms"
ON public.classrooms FOR SELECT
USING (public.is_enrolled_student(id));

CREATE POLICY "Teachers can create classrooms"
ON public.classrooms FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classrooms"
ON public.classrooms FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classrooms"
ON public.classrooms FOR DELETE
USING (auth.uid() = teacher_id);

-- Recreate student_enrollments policies as PERMISSIVE
CREATE POLICY "Students can view own enrollments"
ON public.student_enrollments FOR SELECT
USING (auth.uid() = student_user_id);

CREATE POLICY "Teachers can view classroom enrollments"
ON public.student_enrollments FOR SELECT
USING (public.is_classroom_teacher(classroom_id));