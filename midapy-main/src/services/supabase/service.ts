import { supabase } from '../../config';
import type { Generation, GenerationStatus } from '../../types/index';
import { CreateGenerationInput, UpdateGenerationInput } from './types';

class SupabaseService {
  async createGeneration(input: CreateGenerationInput): Promise<Generation> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .insert({
          prompt: input.prompt,
          aspect_ratio: input.aspect_ratio,
          style: input.style,
          status: 'waiting' as GenerationStatus,
          progress: 0
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23514') { // Check constraint violation
          throw new Error('Another generation is already in progress');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating generation:', error);
      throw error;
    }
  }

  async updateGeneration(id: string, input: UpdateGenerationInput): Promise<Generation> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating generation:', error);
      throw error;
    }
  }

  async getGeneration(id: string): Promise<Generation | null> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting generation:', error);
      throw error;
    }
  }

  async listGenerations(limit: number = 10): Promise<Generation[]> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select()
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error listing generations:', error);
      throw error;
    }
  }

  async deleteGeneration(id: string): Promise<void> {
    try {
      // Supprimer les images du bucket
      const imagePaths = [
        `${id}/grid.png`,
        `${id}/upscale_1.png`,
        `${id}/upscale_2.png`,
        `${id}/upscale_3.png`,
        `${id}/upscale_4.png`
      ];

      const { error: storageError } = await supabase.storage
        .from('generations')
        .remove(imagePaths);

      if (storageError) {
        console.error('Error deleting images from storage:', storageError);
      }

      // Supprimer l'entrée de la base de données
      const { error: dbError } = await supabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (dbError) {
        throw dbError;
      }
    } catch (error) {
      console.error('Error deleting generation:', error);
      throw error;
    }
  }

  async getProcessingGeneration(): Promise<Generation | null> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select()
        .in('status', ['processing', 'waiting'])
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting processing generation:', error);
      throw error;
    }
  }

  async resetStuckGenerationsAfterTimeout(timeoutMinutes: number = 10): Promise<number> {
    try {
      // Calculate the cutoff time (current time - timeout)
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

      const { data, error } = await supabase
        .from('generations')
        .update({
          status: 'error',
          error: `Generation stuck in processing state for more than ${timeoutMinutes} minutes`,
          updated_at: new Date().toISOString()
        })
        .in('status', ['processing', 'waiting'])
        .lt('updated_at', cutoffTime.toISOString())  // Only reset generations older than cutoff time
        .select();

      if (error) {
        throw error;
      }

      return data?.length ?? 0;
    } catch (error) {
      console.error('Error resetting stuck generations:', error);
      throw error;
    }
  }

  async forceResetStuckGenerations(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('generations')
        .update({
          status: 'error',
          error: 'Generation reset by admin request',
          updated_at: new Date().toISOString()
        })
        .in('status', ['processing', 'waiting'])
        .select();

      if (error) {
        throw error;
      }

      return data?.length ?? 0;
    } catch (error) {
      console.error('Error force resetting generations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
