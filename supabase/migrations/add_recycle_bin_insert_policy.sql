-- Add INSERT policy for recycle_bin to allow authenticated users to insert
DO $$
BEGIN
  -- Create insert policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recycle_bin' AND policyname = 'Users can insert recycle bin items'
  ) THEN
    CREATE POLICY "Users can insert recycle bin items" ON recycle_bin
      FOR INSERT
      WITH CHECK (
        deleted_by = auth.uid() AND (
          company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL
          ) OR company_id IS NULL
        )
      );
  END IF;
END$$;

-- Grant INSERT to authenticated role
GRANT INSERT ON recycle_bin TO authenticated;
