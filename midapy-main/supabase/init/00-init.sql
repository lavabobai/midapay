-- Initial setup
-- This file is executed before all other migrations

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_net";  -- For making HTTP requests if needed

-- Set up realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

-- Enable realtime for required tables
alter publication supabase_realtime add table public.generations;
