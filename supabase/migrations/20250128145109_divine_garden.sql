/*
  # Update service prices schema for BTU-based pricing

  1. Changes
    - Update service_prices table to support BTU-based pricing
    - Add default BTU-based prices for different equipment types
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update service_prices table structure
ALTER TABLE service_prices DROP COLUMN IF EXISTS installation_prices;
ALTER TABLE service_prices DROP COLUMN IF EXISTS cleaning_prices;

ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS installation_prices jsonb DEFAULT '{
  "split": {
    "7000": "800",
    "9000": "900",
    "12000": "1000",
    "18000": "1200",
    "24000": "1500",
    "30000": "1800",
    "36000": "2000",
    "48000": "2500",
    "60000": "3000"
  },
  "cassete": {
    "7000": "1000",
    "9000": "1200",
    "12000": "1400",
    "18000": "1600",
    "24000": "1800",
    "30000": "2000",
    "36000": "2500",
    "48000": "3000",
    "60000": "3500"
  },
  "piso_teto": {
    "7000": "900",
    "9000": "1100",
    "12000": "1300",
    "18000": "1500",
    "24000": "1700",
    "30000": "1900",
    "36000": "2200",
    "48000": "2700",
    "60000": "3200"
  },
  "multi_split": {
    "7000": "1200",
    "9000": "1400",
    "12000": "1600",
    "18000": "1800",
    "24000": "2000",
    "30000": "2200",
    "36000": "2500",
    "48000": "3000",
    "60000": "3500"
  },
  "janela": {
    "7000": "400",
    "9000": "450",
    "12000": "500",
    "18000": "600",
    "24000": "700",
    "30000": "800",
    "36000": "900",
    "48000": "1000",
    "60000": "1200"
  },
  "portatil": {
    "7000": "300",
    "9000": "350",
    "12000": "400",
    "18000": "500",
    "24000": "600",
    "30000": "700",
    "36000": "800",
    "48000": "900",
    "60000": "1000"
  }
}'::jsonb;

ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS cleaning_prices jsonb DEFAULT '{
  "split": "150",
  "cassete": "200",
  "piso_teto": "180",
  "multi_split": "250",
  "janela": "100",
  "portatil": "80"
}'::jsonb;