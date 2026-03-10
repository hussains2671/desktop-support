-- Migration: Add company_code field to companies table
-- Date: 2025-01-XX
-- Description: Add 16-digit company_code field for custom company identification

-- Add company_code column
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS company_code VARCHAR(16) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);

-- Generate company_code for existing companies (if any)
-- This will generate codes for companies that don't have one
DO $$
DECLARE
    company_record RECORD;
    state_code VARCHAR(4);
    country_code VARCHAR(4);
    random_code VARCHAR(8);
    new_code VARCHAR(16);
BEGIN
    FOR company_record IN SELECT id FROM companies WHERE company_code IS NULL LOOP
        -- Generate random codes
        state_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        country_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        random_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
        new_code := state_code || country_code || random_code;
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM companies WHERE company_code = new_code) LOOP
            state_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
            country_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
            random_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
            new_code := state_code || country_code || random_code;
        END LOOP;
        
        UPDATE companies 
        SET company_code = new_code 
        WHERE id = company_record.id;
    END LOOP;
END $$;

