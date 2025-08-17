import { GenerationStatus } from './index';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      generations: {
        Row: {
          id: string
          prompt: string
          status: GenerationStatus
          progress: number
          grid_image_url?: string
          upscale_1?: string
          upscale_2?: string
          upscale_3?: string
          upscale_4?: string
          error?: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['generations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['generations']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
