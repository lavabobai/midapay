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
          status: string
          progress: number
          grid_image_url: string | null
          upscale_1: string | null
          upscale_2: string | null
          upscale_3: string | null
          upscale_4: string | null
          error: string | null
          aspect_ratio: string
          style: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          prompt: string
          status?: string
          progress?: number
          grid_image_url?: string | null
          upscale_1?: string | null
          upscale_2?: string | null
          upscale_3?: string | null
          upscale_4?: string | null
          error?: string | null
          aspect_ratio: string
          style?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          prompt?: string
          status?: string
          progress?: number
          grid_image_url?: string | null
          upscale_1?: string | null
          upscale_2?: string | null
          upscale_3?: string | null
          upscale_4?: string | null
          error?: string | null
          aspect_ratio?: string
          style?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
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
