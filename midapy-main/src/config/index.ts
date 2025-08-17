import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { Database } from '../types/database'

// Load environment variables
dotenv.config()

// Environment variables validation
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DISCORD_TOKEN',
  'DISCORD_CHANNEL_ID',
  'DISCORD_SERVER_ID',
  'API_BEARER_TOKEN'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  discord: {
    token: process.env.DISCORD_TOKEN!,
    channelId: process.env.DISCORD_CHANNEL_ID!,
    serverId: process.env.DISCORD_SERVER_ID!,
  },
  api: {
    bearerToken: process.env.API_BEARER_TOKEN!
  },
  storage: {
    bucket: process.env.STORAGE_BUCKET || 'generations'
  }
} as const

// Create Supabase client
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceKey
)
