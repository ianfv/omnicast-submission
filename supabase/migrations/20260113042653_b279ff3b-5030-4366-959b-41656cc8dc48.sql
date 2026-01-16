-- Create a function for guests to get classroom data using their enrollment ID
CREATE OR REPLACE FUNCTION public.get_classroom_for_enrollment(p_enrollment_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  subject text,
  description text,
  teacher_id uuid,
  join_code text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  system_prompt text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.subject,
    c.description,
    c.teacher_id,
    c.join_code,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.system_prompt
  FROM classrooms c
  INNER JOIN student_enrollments e ON e.classroom_id = c.id
  WHERE e.id = p_enrollment_id AND c.is_active = true;
$$;

-- Create a function for guests to get classroom documents using their enrollment ID
CREATE OR REPLACE FUNCTION public.get_documents_for_enrollment(p_enrollment_id uuid)
RETURNS TABLE (
  id uuid,
  classroom_id uuid,
  name text,
  file_path text,
  file_type text,
  file_size bigint,
  content_text text,
  uploaded_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.classroom_id,
    d.name,
    d.file_path,
    d.file_type,
    d.file_size,
    d.content_text,
    d.uploaded_at
  FROM classroom_documents d
  INNER JOIN student_enrollments e ON e.classroom_id = d.classroom_id
  WHERE e.id = p_enrollment_id
  ORDER BY d.uploaded_at DESC;
$$;

-- Create a function for guests to get teaching style using their enrollment ID
CREATE OR REPLACE FUNCTION public.get_teaching_style_for_enrollment(p_enrollment_id uuid)
RETURNS TABLE (
  id uuid,
  classroom_id uuid,
  communication_style text,
  explanation_depth text,
  encouragement_level text,
  example_preference text,
  test_difficulty text,
  raw_answers jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.classroom_id,
    t.communication_style,
    t.explanation_depth,
    t.encouragement_level,
    t.example_preference,
    t.test_difficulty,
    t.raw_answers,
    t.created_at
  FROM teaching_styles t
  INNER JOIN student_enrollments e ON e.classroom_id = t.classroom_id
  WHERE e.id = p_enrollment_id;
$$;