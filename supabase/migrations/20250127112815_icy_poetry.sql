-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('service-orders', 'service-orders', true),
  ('company', 'company', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for storage
CREATE POLICY "Allow authenticated users to manage service-orders" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'service-orders');

CREATE POLICY "Allow authenticated users to manage company assets" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'company');