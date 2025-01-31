/*
  # FB AR HVAC Service Management System Schema

  1. New Tables
    - customers
      - Basic customer information
    - service_orders
      - Main service order information
    - materials
      - Pre-defined and custom materials catalog
    - service_order_materials
      - Materials used in each service order
    - service_order_photos
      - Photos attached to service orders
    
  2. Security
    - RLS enabled on all tables
    - Policies for authenticated users
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  default_price DECIMAL(10,2),
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service_orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  service_type TEXT NOT NULL,
  equipment_type TEXT,
  equipment_power TEXT,
  equipment_quantity INTEGER DEFAULT 1,
  description TEXT NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(10,8),
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service_order_materials table
CREATE TABLE IF NOT EXISTS service_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES service_orders(id),
  material_id UUID REFERENCES materials(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create service_order_photos table
CREATE TABLE IF NOT EXISTS service_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES service_orders(id),
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL, -- 'before', 'during', 'after'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to authenticated users" ON customers
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all access to authenticated users" ON materials
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all access to authenticated users" ON service_orders
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all access to authenticated users" ON service_order_materials
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all access to authenticated users" ON service_order_photos
  FOR ALL TO authenticated USING (true);

-- Insert default materials
INSERT INTO materials (name, unit, default_price, is_custom) VALUES
  ('Tubulação de cobre 1/4', 'metro', 15.00, false),
  ('Tubulação de cobre 3/8', 'metro', 18.00, false),
  ('Tubulação de cobre 1/2', 'metro', 22.00, false),
  ('Tubulação de cobre 5/8', 'metro', 25.00, false),
  ('Dreno', 'metro', 5.00, false),
  ('Suporte', 'unidade', 35.00, false),
  ('Fita isolante', 'unidade', 8.00, false),
  ('Parafusos', 'conjunto', 12.00, false),
  ('Cabo PP 3x1.5mm', 'metro', 8.00, false),
  ('Cabo PP 3x2.5mm', 'metro', 12.00, false)
ON CONFLICT DO NOTHING;