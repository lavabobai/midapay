export type GenerationStatus = 
  | 'waiting'
  | 'processing'
  | 'grid_completed'
  | 'variations_in_progress'
  | 'completed'
  | 'error';

export interface Generation {
  id: string;
  prompt: string;
  status: GenerationStatus;
  progress: number;
  grid_image_url?: string;
  upscale_1?: string;
  upscale_2?: string;
  upscale_3?: string;
  upscale_4?: string;
  error?: string;
  aspect_ratio: string;
  style?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface GenerateRequest {
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '4:3';
  style?: string;
}

export interface GenerateResponse {
  id: string;
  status: GenerationStatus;
}

export interface StatusResponse {
  id: string;
  status: GenerationStatus;
  progress: number;
  grid_image_url?: string;
  upscales?: string[];
  error?: string;
}

export interface UpscaleRequest {
  index: 1 | 2 | 3 | 4;
}

export interface UpscaleResponse {
  id: string;
  status: GenerationStatus;
  upscale_url?: string;
}
