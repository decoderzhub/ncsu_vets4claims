/*
  # Create Veteran Profiles Schema

  1. New Tables
    - `veteran_profiles`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `ssn_encrypted` (text, encrypted)
      - `phone` (text)
      - `date_of_birth` (date)
      - `military_service` (jsonb)
      - `claim_info` (jsonb)
      - `address` (jsonb)
      - `has_paid` (boolean, default false)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `veteran_profiles` table
    - Add policy for users to manage their own profiles
    - Add audit logging triggers
*/

-- Create the veteran_profiles table
CREATE TABLE IF NOT EXISTS veteran_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  middle_initial text,
  last_name text NOT NULL,
  ssn_encrypted text,
  phone text,
  date_of_birth date,
  file_number text,
  veterans_service_number text,
  military_service jsonb DEFAULT '{}',
  claim_info jsonb DEFAULT '{}',
  address jsonb DEFAULT '{}',
  has_signed_up boolean DEFAULT false,
  has_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_veteran_profiles_email ON veteran_profiles(email);

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_veteran_profiles_payment ON veteran_profiles(has_paid);

-- Enable Row Level Security
ALTER TABLE veteran_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own data
CREATE POLICY "Users can manage their own veteran profiles"
  ON veteran_profiles
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = email);

-- Create policy for anonymous users to insert profiles (for initial signup)
CREATE POLICY "Anonymous users can create profiles"
  ON veteran_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_veteran_profiles_updated_at
  BEFORE UPDATE ON veteran_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create audit log table for compliance
CREATE TABLE IF NOT EXISTS veteran_profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veteran_profile_id uuid REFERENCES veteran_profiles(id),
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by text,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE veteran_profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Create audit policy
CREATE POLICY "Users can view their own audit logs"
  ON veteran_profile_audit_log
  FOR SELECT
  TO authenticated
  USING (
    veteran_profile_id IN (
      SELECT id FROM veteran_profiles 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_veteran_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO veteran_profile_audit_log (veteran_profile_id, action, new_values, changed_by)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.jwt() ->> 'email');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO veteran_profile_audit_log (veteran_profile_id, action, old_values, new_values, changed_by)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.jwt() ->> 'email');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO veteran_profile_audit_log (veteran_profile_id, action, old_values, changed_by)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.jwt() ->> 'email');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

-- Create audit triggers
CREATE TRIGGER audit_veteran_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON veteran_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_veteran_profile_changes();