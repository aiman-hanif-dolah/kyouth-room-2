CREATE TABLE public.ai_reviews (
  section text PRIMARY KEY,
  status text NOT NULL DEFAULT 'not_started',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  review_state text NOT NULL DEFAULT 'fresh',
  error text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_reviews TO anon, authenticated;
GRANT ALL ON public.ai_reviews TO service_role;
ALTER TABLE public.ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read ai reviews" ON public.ai_reviews FOR SELECT TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_reviews;