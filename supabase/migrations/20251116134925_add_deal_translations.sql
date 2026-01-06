/*
  # Add Deal Translations System

  1. New Tables
    - `deal_translations`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, foreign key to deals)
      - `language` (text, language code: en, el, ru, de, fr)
      - `title` (text, translated title)
      - `description` (text, translated description)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `deal_translations` table
    - Add policy for public read access
    - Add policy for authenticated users to manage translations

  3. Indexes
    - Add index on deal_id and language for fast lookups
*/

CREATE TABLE IF NOT EXISTS deal_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'el', 'ru', 'de', 'fr')),
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, language)
);

CREATE INDEX IF NOT EXISTS idx_deal_translations_deal_language
  ON deal_translations(deal_id, language);

ALTER TABLE deal_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deal translations"
  ON deal_translations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert deal translations"
  ON deal_translations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update deal translations"
  ON deal_translations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deal translations"
  ON deal_translations
  FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_deal_translation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deal_translations_timestamp
  BEFORE UPDATE ON deal_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_translation_timestamp();
