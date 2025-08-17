import { Database } from './schema';
import type { Generation, GenerationStatus } from '../../types/index';

export type DbGeneration = Database['public']['Tables']['generations']['Row'];

export interface CreateGenerationInput {
  prompt: string;
  aspect_ratio: string;
  style?: string;
  status: GenerationStatus;
  progress: number;
}

export interface UpdateGenerationInput {
  status?: GenerationStatus;
  progress?: number;
  grid_image_url?: string;
  upscale_1?: string;
  upscale_2?: string;
  upscale_3?: string;
  upscale_4?: string;
  error?: string;
  completed_at?: string;
}
