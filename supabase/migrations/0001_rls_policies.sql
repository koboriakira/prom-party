-- Ensure pgcrypto extension is enabled (if not already by previous scripts)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Enable RLS for all relevant tables if not already enabled
-- Assumes tables users, templates, fields, tags, template_tags already exist.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;

-- POLICIES for 'users' table (custom user-defined table)
-- This table is named 'users' and is separate from auth.users.
-- Policies here are based on the assumption it's for public profile info.
CREATE POLICY "Authenticated users can view user profiles"
ON public.users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (true); -- Modify check if specific conditions needed, e.g. linking to auth.uid()

-- POLICIES for 'templates' table
-- Assumes 'user_id' column in 'templates' table references 'auth.users(id)'
CREATE POLICY "Users can view their own templates"
ON public.templates FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
ON public.templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.templates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.templates FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public templates"
ON public.templates FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);

-- Function to update 'updated_at' timestamp on 'templates' table
CREATE OR REPLACE FUNCTION public.update_template_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.created_at = OLD.created_at; -- Preserve original creation date
   NEW.updated_at = NOW(); -- Set modification date
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_template_update
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_template_updated_at_column();

-- POLICIES for 'fields' table
-- Assumes 'template_id' references 'templates(id)'
CREATE POLICY "Users can view fields for their templates"
ON public.fields FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can insert fields for their templates"
ON public.fields FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can update fields for their templates"
ON public.fields FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete fields for their templates"
ON public.fields FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

CREATE POLICY "Anyone can view fields for public templates"
ON public.fields FOR SELECT
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.is_public = TRUE));

-- POLICIES for 'tags' table
CREATE POLICY "Anyone can view tags"
ON public.tags FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can insert tags"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (true);

-- POLICIES for 'template_tags' join table
CREATE POLICY "Users can view tag assignments for their templates"
ON public.template_tags FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_tags.template_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can insert tag assignments for their templates"
ON public.template_tags FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_tags.template_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete tag assignments for their templates"
ON public.template_tags FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_tags.template_id AND t.user_id = auth.uid()));

CREATE POLICY "Anyone can view tag assignments for public templates"
ON public.template_tags FOR SELECT
TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.templates t WHERE t.id = template_tags.template_id AND t.is_public = TRUE));

-- Grant basic permissions on tables. RLS policies will further restrict access.
GRANT SELECT ON TABLE public.users TO anon, authenticated;
GRANT INSERT ON TABLE public.users TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.templates TO authenticated;
GRANT SELECT ON TABLE public.templates TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fields TO authenticated;
GRANT SELECT ON TABLE public.fields TO anon;

GRANT SELECT ON TABLE public.tags TO anon, authenticated;
GRANT INSERT ON TABLE public.tags TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.template_tags TO authenticated;
GRANT SELECT ON TABLE public.template_tags TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.update_template_updated_at_column() TO authenticated;

-- This script applies Row Level Security (RLS) policies and helper functions. It assumes that the table structures (users, templates, fields, tags, template_tags) have already been created by a preceding migration script.
