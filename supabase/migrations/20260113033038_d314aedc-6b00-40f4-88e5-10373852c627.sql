-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view classroom by join code" ON public.classrooms;
DROP POLICY IF EXISTS "Anyone can enroll in a classroom" ON public.student_enrollments;

-- Create more specific policy for join code lookup using a function
CREATE OR REPLACE FUNCTION public.lookup_classroom_by_code(code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  subject TEXT,
  description TEXT,
  teacher_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.subject,
    c.description,
    p.full_name as teacher_name
  FROM public.classrooms c
  LEFT JOIN public.profiles p ON p.user_id = c.teacher_id
  WHERE c.join_code = code AND c.is_active = true;
$$;

-- Create function for guest enrollment
CREATE OR REPLACE FUNCTION public.enroll_in_classroom(
  p_classroom_id UUID,
  p_guest_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if classroom exists and is active
  IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE id = p_classroom_id AND is_active = true) THEN
    RAISE EXCEPTION 'Classroom not found or inactive';
  END IF;
  
  -- Check if already enrolled (for authenticated users)
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_enrollment_id 
    FROM public.student_enrollments 
    WHERE classroom_id = p_classroom_id AND student_user_id = v_user_id;
    
    IF v_enrollment_id IS NOT NULL THEN
      RETURN v_enrollment_id;
    END IF;
  END IF;
  
  -- Create enrollment
  INSERT INTO public.student_enrollments (classroom_id, student_user_id, guest_name)
  VALUES (p_classroom_id, v_user_id, CASE WHEN v_user_id IS NULL THEN p_guest_name ELSE NULL END)
  RETURNING id INTO v_enrollment_id;
  
  RETURN v_enrollment_id;
END;
$$;