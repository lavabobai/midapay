import { createClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';
import { Database } from './services/supabase/schema';

// Load environment variables
dotenvConfig({ path: '.env.local' });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DISCORD_TOKEN',
  'DISCORD_CHANNEL_ID',
  'DISCORD_SERVER_ID',
  'API_BEARER_TOKEN'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Configuration object
export const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  discord: {
    token: process.env.DISCORD_TOKEN!,
    channelId: process.env.DISCORD_CHANNEL_ID!,
    serverId: process.env.DISCORD_SERVER_ID!,
    wsUrl: 'wss://gateway.discord.gg/?v=10&encoding=json'
  },
  api: {
    bearerToken: process.env.API_BEARER_TOKEN!,
    port: parseInt(process.env.PORT || '3000', 10)
  },
  storage: {
    bucket: 'generations'
  }
} as const;

// Create Supabase client
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceRoleKey
);
