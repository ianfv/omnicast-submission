-- Create profiles table for teachers/students
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  join_code TEXT NOT NULL UNIQUE,
  system_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teaching_style table for quiz results
CREATE TABLE public.teaching_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL UNIQUE,
  communication_style TEXT NOT NULL, -- formal, conversational, energetic
  explanation_depth TEXT NOT NULL, -- brief, detailed, socratic
  test_difficulty TEXT NOT NULL, -- easy, moderate, challenging
  encouragement_level TEXT NOT NULL, -- minimal, moderate, frequent
  example_preference TEXT NOT NULL, -- abstract, real-world, mixed
  raw_answers JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classroom_documents table for RAG
CREATE TABLE public.classroom_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_text TEXT, -- extracted text for RAG
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_enrollments table
CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT student_or_guest CHECK (student_user_id IS NOT NULL OR guest_name IS NOT NULL)
);

-- Create podcast_sessions to track student learning
CREATE TABLE public.podcast_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  transcript JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Classrooms policies
CREATE POLICY "Teachers can view their own classrooms"
ON public.classrooms FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view classrooms they're enrolled in"
ON public.classrooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE student_enrollments.classroom_id = classrooms.id
    AND student_enrollments.student_user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view classroom by join code"
ON public.classrooms FOR SELECT
USING (true);

CREATE POLICY "Teachers can create classrooms"
ON public.classrooms FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classrooms"
ON public.classrooms FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own classrooms"
ON public.classrooms FOR DELETE
USING (auth.uid() = teacher_id);

-- Teaching styles policies
CREATE POLICY "Teachers can manage their classroom styles"
ON public.teaching_styles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = teaching_styles.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view teaching style of enrolled classrooms"
ON public.teaching_styles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE student_enrollments.classroom_id = teaching_styles.classroom_id
    AND student_enrollments.student_user_id = auth.uid()
  )
);

-- Classroom documents policies
CREATE POLICY "Teachers can manage their classroom documents"
ON public.classroom_documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = classroom_documents.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Enrolled students can view documents"
ON public.classroom_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE student_enrollments.classroom_id = classroom_documents.classroom_id
    AND student_enrollments.student_user_id = auth.uid()
  )
);

-- Student enrollments policies
CREATE POLICY "Teachers can view enrollments for their classrooms"
ON public.student_enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = student_enrollments.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own enrollments"
ON public.student_enrollments FOR SELECT
USING (auth.uid() = student_user_id);

CREATE POLICY "Anyone can enroll in a classroom"
ON public.student_enrollments FOR INSERT
WITH CHECK (true);

-- Podcast sessions policies
CREATE POLICY "Students can manage their own sessions"
ON public.podcast_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrollments
    WHERE student_enrollments.id = podcast_sessions.enrollment_id
    AND student_enrollments.student_user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view sessions in their classrooms"
ON public.podcast_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = podcast_sessions.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);

-- Function to generate join codes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate join code
CREATE OR REPLACE FUNCTION public.set_classroom_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := public.generate_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_classroom_join_code_trigger
BEFORE INSERT ON public.classrooms
FOR EACH ROW
EXECUTE FUNCTION public.set_classroom_join_code();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
BEFORE UPDATE ON public.classrooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for classroom documents
INSERT INTO storage.buckets (id, name, public) VALUES ('classroom-documents', 'classroom-documents', false);

-- Storage policies
CREATE POLICY "Teachers can upload to their classrooms"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'classroom-documents' AND
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view their classroom files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'classroom-documents' AND
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their classroom files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'classroom-documents' AND
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND classrooms.teacher_id = auth.uid()
  )
);

CREATE POLICY "Enrolled students can view classroom files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'classroom-documents' AND
  EXISTS (
    SELECT 1 FROM public.student_enrollments
    JOIN public.classrooms ON classrooms.id = student_enrollments.classroom_id
    WHERE classrooms.id::text = (storage.foldername(name))[1]
    AND student_enrollments.student_user_id = auth.uid()
  )
);