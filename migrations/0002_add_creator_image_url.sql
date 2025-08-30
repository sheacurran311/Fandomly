-- Optional image/logo URL for creators
ALTER TABLE "creators" ADD COLUMN IF NOT EXISTS "image_url" text;


