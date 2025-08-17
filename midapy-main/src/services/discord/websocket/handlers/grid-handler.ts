import { EventEmitter } from 'events';
import { WebSocketMessage, IWebSocketManager } from '../core/types';
import { UpscaleHandler } from './upscale-handler';
import { supabase } from '../../../../config';
import { config } from '../../../../config';
import { GenerationStatus } from '../../../../types';
import { SupabaseStorageService } from '../../../supabase/storage';
import { STORAGE_CONSTANTS, getGridPath } from '../../../supabase/storage/paths';

export class GridHandler extends EventEmitter {
  private ws: IWebSocketManager;
  private upscaleHandler: UpscaleHandler;
  private processedUrls = new Set<string>();

  constructor(ws: IWebSocketManager) {
    super();
    this.ws = ws;
    this.upscaleHandler = new UpscaleHandler(ws);
  }

  public async handleMessage(message: WebSocketMessage): Promise<void> {
    console.log('[GridHandler] Handling message');

    if (!this.isGridMessage(message)) {
      return;
    }

    let currentGenerationId: string | undefined;

    try {
      const { data } = message;
      if (!data || !data.imageUrl || !data.generationId) {
        return;
      }

      const { imageUrl, generationId } = data;
      currentGenerationId = generationId;

      console.log(`[GridHandler] Processing grid for generation ${generationId}`);

      // Ne traiter que les images PNG
      const baseUrl = imageUrl.split('?')[0];  // Enlever les paramètres d'URL
      if (!baseUrl.endsWith('.png')) {
        console.log('[GridHandler] Ignoring non-PNG image:', imageUrl);
        return;
      }

      // Éviter le traitement en double des URLs
      if (this.processedUrls.has(imageUrl)) {
        return;
      }

      try {
        // Download the image
        const imageBuffer = await SupabaseStorageService.downloadImage(imageUrl);
        if (!imageBuffer) {
          throw new Error('Failed to download image from Discord');
        }

        // Upload the image to Supabase storage
        const storagePath = getGridPath(generationId);
        const publicUrl = await SupabaseStorageService.uploadImage(
          storagePath,
          imageBuffer,
          {
            contentType: STORAGE_CONSTANTS.CONTENT_TYPE,
            cacheControl: STORAGE_CONSTANTS.CACHE_CONTROL
          }
        );

        if (!publicUrl) {
          throw new Error('Failed to upload image to storage');
        }

        // Update generation with grid URL
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            grid_image_url: publicUrl,
            status: GenerationStatus.PROCESSING,
            progress: 50
          })
          .eq('id', generationId);

        if (updateError) {
          console.error('[GridHandler] Error processing grid:', updateError.message);
          throw updateError;
        }

        // Marquer l'URL comme traitée
        this.processedUrls.add(imageUrl);

        // Émettre l'événement de grille complétée
        this.emit('gridCompleted', {
          generationId,
          gridImageUrl: publicUrl
        });

        // Vérifier si les composants contiennent des boutons d'upscale
        if (message.components && message.components.length > 0) {
          const upscaleButtons = message.components
            .flatMap(row => row.components)
            .filter(button => button.custom_id?.includes('upsample'))
            .map(button => ({
              index: parseInt(button.custom_id?.split(':')[3] || '0'),
              customId: button.custom_id
            }))
            .sort((a, b) => a.index - b.index); // Trier par index pour cliquer dans l'ordre

          if (upscaleButtons.length > 0) {
            console.log('[WebSocket] Found upscale buttons in message');

            // Émettre un événement avec les boutons pour que le WebSocketManager puisse les traiter
            this.emit('upscaleButtonsFound', {
              generationId,
              messageId: message.id,
              buttons: upscaleButtons
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[GridHandler] Error processing grid:', errorMessage);
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            status: GenerationStatus.ERROR,
            error: errorMessage
          })
          .eq('id', generationId);

        if (updateError) {
          console.error('[GridHandler] Error updating generation status:', updateError.message);
        }

        this.emit('error', {
          error: errorMessage,
          generationId
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GridHandler] Unexpected error:', errorMessage);
      if (currentGenerationId) {
        this.emit('error', {
          error: errorMessage,
          generationId: currentGenerationId
        });
      }
    }
  }

  private isGridMessage(message: WebSocketMessage): boolean {
    return Boolean(
      message.data &&
      typeof message.data.imageUrl === 'string' &&
      typeof message.data.generationId === 'string'
    );
  }
}
