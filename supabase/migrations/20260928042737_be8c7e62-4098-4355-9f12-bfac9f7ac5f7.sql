GRANT SELECT ON public.workspace_state TO anon;
GRANT SELECT ON public.project_assets TO anon;

DROP POLICY IF EXISTS "anon read workspace_state" ON public.workspace_state;
CREATE POLICY "anon read workspace_state" ON public.workspace_state FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon read project_assets" ON public.project_assets;
CREATE POLICY "anon read project_assets" ON public.project_assets FOR SELECT TO anon USING (true);

ALTER TABLE public.project_assets ALTER COLUMN uploaded_by DROP NOT NULL;

DROP POLICY IF EXISTS "anon read project-assets objects" ON storage.objects;
CREATE POLICY "anon read project-assets objects" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'project-assets');