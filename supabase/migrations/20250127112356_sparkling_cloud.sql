/*
  # Create company info table

  1. New Tables
    - `company_info`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `logo` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_info` table
    - Add policy for authenticated users to manage company info
*/

CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT,
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to authenticated users" ON company_info
  FOR ALL TO authenticated USING (true);