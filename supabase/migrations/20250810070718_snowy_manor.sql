/*
  # Fix audit log RLS policy

  1. Security Changes
    - Add INSERT policy for `veteran_profile_audit_log` table
    - Allow authenticated users to insert audit records
    - This fixes the RLS violation when saving veteran profiles

  2. Notes
    - The audit log is automatically populated by triggers
    - Authenticated users need INSERT permissions for the audit system to work
    - This policy ensures audit records can be created when profiles are updated
*/

-- Add INSERT policy for authenticated users on audit log table
CREATE POLICY "Authenticated users can insert audit records"
  ON veteran_profile_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);