CREATE TABLE IF NOT EXISTS creator_facebook_pages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id varchar NOT NULL REFERENCES creators(id),
  page_id varchar NOT NULL,
  name text NOT NULL,
  access_token text NOT NULL,
  followers_count integer DEFAULT 0,
  fan_count integer DEFAULT 0,
  instagram_business_account_id varchar,
  connected_instagram_account_id varchar,
  last_synced_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_facebook_pages_creator ON creator_facebook_pages(creator_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_creator_facebook_page ON creator_facebook_pages(creator_id, page_id);

