-- Enable les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table pour exécuter des commandes SQL
CREATE TABLE IF NOT EXISTS _sqlc (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction pour exécuter du SQL
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
END;
$$;
