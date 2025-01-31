/*
  # Add address and service prices tables

  1. Changes to service_orders table
    - Add address fields
    - Add custom_service_value field

  2. New Tables
    - service_prices
      - installation_prices (jsonb)
      - cleaning_prices (jsonb)

  3. Security
    - Enable RLS on service_prices table
    - Add policy for authenticated users
*/

-- Add address fields to service_orders
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS address jsonb;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS custom_service_value DECIMAL(10,2);

-- Create service_prices table
CREATE TABLE IF NOT EXISTS service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_prices jsonb DEFAULT '{}'::jsonb,
  cleaning_prices jsonb DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to authenticated users" ON service_prices
  FOR ALL TO authenticated USING (true);

-- Insert default service prices
INSERT INTO service_prices (installation_prices, cleaning_prices)
VALUES (
  '{
    "split": {"base_price": "800"},
    "cassete": {"base_price": "1200"},
    "piso_teto": {"base_price": "1000"},
    "multi_split": {"base_price": "1500"},
    "janela": {"base_price": "400"},
    "portatil": {"base_price": "300"}
  }',
  '{
    "split": {"base_price": "150"},
    "cassete": {"base_price": "200"},
    "piso_teto": {"base_price": "180"},
    "multi_split": {"base_price": "250"},
    "janela": {"base_price": "100"},
    "portatil": {"base_price": "80"}
  }'
)
ON CONFLICT DO NOTHING;