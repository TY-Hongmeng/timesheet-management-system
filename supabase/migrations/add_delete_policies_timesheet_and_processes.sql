-- Allow delete on timesheet_records and timesheet_record_items for owners/approvers/admins
DO $$
BEGIN
  -- timesheet_records delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='timesheet_records' AND policyname='allow_delete_timesheet_records'
  ) THEN
    CREATE POLICY "allow_delete_timesheet_records" ON timesheet_records
      FOR DELETE
      USING (
        auth.uid() = user_id OR auth.uid() = supervisor_id OR auth.uid() = section_chief_id OR
        EXISTS (
          SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
          WHERE u.id = auth.uid() AND ur.name IN ('管理员','超级管理员','admin','super_admin')
        )
      );
  END IF;

  -- timesheet_record_items delete policy based on parent record permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='timesheet_record_items' AND policyname='allow_delete_timesheet_items'
  ) THEN
    CREATE POLICY "allow_delete_timesheet_items" ON timesheet_record_items
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM timesheet_records r 
          WHERE r.id = timesheet_record_id AND (
            auth.uid() = r.user_id OR auth.uid() = r.supervisor_id OR auth.uid() = r.section_chief_id OR
            EXISTS (
              SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
              WHERE u.id = auth.uid() AND ur.name IN ('管理员','超级管理员','admin','super_admin')
            )
          )
        )
      );
  END IF;

  -- processes update policy for soft delete (is_active flag)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='processes' AND policyname='allow_update_processes_soft_delete'
  ) THEN
    CREATE POLICY "allow_update_processes_soft_delete" ON processes
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
          WHERE u.id = auth.uid() AND (ur.name IN ('管理员','超级管理员','admin','super_admin') OR u.company_id = processes.company_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users u JOIN user_roles ur ON ur.id = u.role_id
          WHERE u.id = auth.uid() AND (ur.name IN ('管理员','超级管理员','admin','super_admin') OR u.company_id = processes.company_id)
        )
      );
  END IF;
END$$;
