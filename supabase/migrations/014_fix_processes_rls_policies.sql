-- Fix RLS policies for processes table
-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON processes TO anon;
GRANT ALL PRIVILEGES ON processes TO authenticated;

-- Create RLS policies for processes table
CREATE POLICY "Allow anon to read processes" ON processes
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon to insert processes" ON processes
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update processes" ON processes
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete processes" ON processes
  FOR DELETE TO anon
  USING (true);

CREATE POLICY "Allow authenticated to read processes" ON processes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to insert processes" ON processes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update processes" ON processes
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete processes" ON processes
  FOR DELETE TO authenticated
  USING (true);