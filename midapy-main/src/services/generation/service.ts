import type { GenerateRequest, Generation, GenerationStatus } from '../../types/index';
import { discordService } from '../discord/service';
import { storageService } from '../storage/service';
import { supabaseService } from '../supabase/service';

class GenerationService {
  private currentGenerationId: string | null = null;

  constructor() {
    this.setupDiscordHandlers();
  }

  private setupDiscordHandlers() {
    // Les handlers seront configurés pour chaque génération spécifique
  }

  private setupHandlersForGeneration(generationId: string) {
    discordService.onGridCompleted(generationId, async ({ imageUrl, generationId }) => {
      try {
        // Upload grid image
        const imagePath = storageService.getImagePath(generationId, 'grid');
        const storedImageUrl = await storageService.uploadImage(imageUrl, imagePath);

        // Update generation
        await supabaseService.updateGeneration(generationId, {
          status: 'grid_completed' as GenerationStatus,
          grid_image_url: storedImageUrl,
          progress: 50
        });

        // Automatically trigger upscales for all 4 images
        for (let i = 1; i <= 4; i++) {
          await this.upscale(generationId, i);
        }
      } catch (error) {
        console.error('Error handling grid completion:', error);
        this.handleError(generationId, error);
      }
    });

    discordService.onUpscaleCompleted(generationId, async ({ index, imageUrl }) => {
      try {
        // Store upscale URL
        const imagePath = storageService.getImagePath(generationId, 'upscale', index);
        const storedImageUrl = await storageService.uploadImage(imageUrl, imagePath);
        
        const update: any = {
          [`upscale_${index}`]: storedImageUrl,
          progress: 75 + (index * 6.25) // Progress from 75% to 100% across 4 upscales
        };

        // If this is the last upscale, mark as completed
        if (index === 4) {
          update.status = 'completed' as GenerationStatus;
          update.completed_at = new Date().toISOString();
        }

        // Update generation
        await supabaseService.updateGeneration(generationId, update);
      } catch (error) {
        console.error('Error handling variation completion:', error);
        this.handleError(generationId, error);
      }
    });

    discordService.onError(generationId, async ({ error, generationId }) => {
      await this.handleError(generationId, error);
    });
  }

  private async handleError(generationId: string, error: any) {
    console.error(`Error in generation ${generationId}:`, error);
    try {
      await supabaseService.updateGeneration(generationId, {
        status: 'error' as GenerationStatus,
        error: error.message || String(error)
      });
    } catch (updateError) {
      console.error('Error updating generation status:', updateError);
    }
  }

  async generate(request: GenerateRequest): Promise<Generation> {
    try {
      // Reset any stuck generations before starting a new one
      const resetCount = await supabaseService.resetStuckGenerationsAfterTimeout();
      if (resetCount > 0) {
        console.log(`Reset réalisé avec succès : ${resetCount} génération${resetCount > 1 ? 's' : ''}`);
      } else {
        console.log('Aucun reset nécessaire');
      }

      const { prompt, aspectRatio, style } = request;

      // Create generation record
      const generation = await supabaseService.createGeneration({
        prompt,
        aspect_ratio: aspectRatio || '1:1', // Valeur par défaut si non spécifiée
        style: style,
        status: 'waiting' as GenerationStatus,
        progress: 0
      });

      // Setup handlers for this generation
      this.setupHandlersForGeneration(generation.id);

      // Start generation
      await discordService.generateImage(prompt, generation.id);

      return generation;
    } catch (error) {
      console.error('Error in generate:', error);
      throw error;
    }
  }

  async upscale(generationId: string, index: number): Promise<void> {
    try {
      const generation = await supabaseService.getGeneration(generationId);
      if (!generation) {
        throw new Error('Generation not found');
      }

      await discordService.upscaleImage(generationId, index);
    } catch (error) {
      console.error('Error in upscale:', error);
      throw error;
    }
  }

  async cleanup(generationId: string) {
    discordService.cleanup(generationId);
  }

  async getStatus(generationId: string): Promise<Generation | null> {
    return await supabaseService.getGeneration(generationId);
  }
}

// Export singleton instance
export const generationService = new GenerationService();
