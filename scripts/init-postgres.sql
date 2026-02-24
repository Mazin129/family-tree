-- Initialize PostgreSQL for Sudanese Heritage Platform
-- This runs on first container start

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For text search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- For Arabic search normalization

-- Create full-text search configuration for Arabic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'arabic_simple'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION arabic_simple (COPY = simple);
  END IF;
END
$$;
