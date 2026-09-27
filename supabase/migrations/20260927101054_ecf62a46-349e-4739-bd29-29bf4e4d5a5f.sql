CREATE TABLE public.workspace_state (
  id text PRIMARY KEY,
  state jsonb NOT NULL,
  client_id text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspace_state TO authenticated;
GRANT ALL ON public.workspace_state TO service_role;
ALTER TABLE public.workspace_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in teammates read workspace" ON public.workspace_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in teammates create workspace" ON public.workspace_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Signed-in teammates update workspace" ON public.workspace_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'document',
  width int,
  height int,
  section_id text NOT NULL DEFAULT 's1',
  slot text NOT NULL DEFAULT 'general',
  caption text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT '',
  in_presentation boolean NOT NULL DEFAULT true,
  sort_order double precision NOT NULL DEFAULT 0,
  uploaded_by uuid,
  uploader_member_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assets TO authenticated;
GRANT ALL ON public.project_assets TO service_role;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teammates read assets" ON public.project_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teammates add assets" ON public.project_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Teammates edit assets" ON public.project_assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Teammates delete assets" ON public.project_assets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Teammates read project files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-assets');
CREATE POLICY "Teammates upload project files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-assets');
CREATE POLICY "Teammates update project files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-assets');
CREATE POLICY "Teammates delete project files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-assets');

ALTER TABLE public.workspace_state REPLICA IDENTITY FULL;
ALTER TABLE public.project_assets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_assets;