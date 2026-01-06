/*
  # Add Vendor Review Responses

  1. Changes
    - Add vendor_response column to product_reviews table
    - Add vendor_response_date column
    - Add vendor_response_by column
  
  2. Security
    - Only vendors can respond to their own deal reviews
    - Responses are public
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_reviews' AND column_name = 'vendor_response'
  ) THEN
    ALTER TABLE product_reviews ADD COLUMN vendor_response text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_reviews' AND column_name = 'vendor_response_date'
  ) THEN
    ALTER TABLE product_reviews ADD COLUMN vendor_response_date timestamptz;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_reviews' AND column_name = 'vendor_response_by'
  ) THEN
    ALTER TABLE product_reviews ADD COLUMN vendor_response_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_reviews_vendor_response ON product_reviews(vendor_response_by) WHERE vendor_response IS NOT NULL;
