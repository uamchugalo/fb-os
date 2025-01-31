-- Update company_info table
ALTER TABLE company_info 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;