import { EventEmitter } from 'events';
import { WebSocketMessage, IWebSocketManager } from '../core/types';
import { supabase } from '../../../../config';
import { config } from '../../../../config';
import { GenerationStatus } from '../../../../types';
import { SupabaseStorageService } from '../../../supabase/storage';
import { STORAGE_CONSTANTS, getUpscalePath } from '../../../supabase/storage/paths';
import { sleep } from '../../../../utils/sleep';

export class UpscaleHandler extends EventEmitter {
  private readonly processedUrls = new Set<string>();
  private readonly processingUrls = new Set<string>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private ws: IWebSocketManager;

  constructor(ws: IWebSocketManager) {
    super();
    this.ws = ws;
  }

  public async handleMessage(message: WebSocketMessage): Promise<void> {
    console.log('[UpscaleHandler] Handling message');

    if (!this.isUpscaleMessage(message)) {
      return;
    }

    // TypeScript type guard
    if (!message.data || typeof message.data.generationId !== 'string' || typeof message.data.imageUrl !== 'string') {
      console.error('[UpscaleHandler] Invalid message data structure');
      return;
    }

    // À ce stade, TypeScript sait que ces valeurs sont des strings
    const generationId = message.data.generationId;
    const imageUrl = message.data.imageUrl;

    console.log(`[UpscaleHandler] Processing upscale for generation ${generationId}`);

    try {
      // Skip if already processed or currently processing
      if (this.processedUrls.has(imageUrl)) {
        return;
      }
      if (this.processingUrls.has(imageUrl)) {
        return;
      }

      // Mark as processing
      this.processingUrls.add(imageUrl);

      // Download the image
      const imageBuffer = await SupabaseStorageService.downloadImage(imageUrl);
      if (!imageBuffer) {
        throw new Error('Failed to download image from Discord');
      }

      // Get current generation with retry logic
      let currentGeneration = null;
      let retryCount = 0;
      while (!currentGeneration && retryCount < this.maxRetries) {
        const { data: gen, error } = await supabase
          .from('generations')
          .select('upscale_1, upscale_2, upscale_3, upscale_4, status')
          .eq('id', generationId)
          .single();

        if (error) {
          retryCount++;
          await sleep(this.retryDelay * retryCount);
        } else {
          currentGeneration = gen;
        }
      }

      if (!currentGeneration) {
        console.log('[UpscaleHandler] No generation found');
        return;
      }

      // Type guard pour TypeScript
      if (!currentGeneration.status) {
        console.error('[UpscaleHandler] Generation status is missing');
        return;
      }

      console.log(`[UpscaleHandler] Generation status: ${currentGeneration.status}`);

      // Determine which upscale number we're processing
      let upscaleNumber = 1;
      if (currentGeneration.upscale_1) upscaleNumber = 2;
      if (currentGeneration.upscale_2) upscaleNumber = 3;
      if (currentGeneration.upscale_3) upscaleNumber = 4;

      // Upload to Supabase
      const filePath = getUpscalePath(generationId, upscaleNumber);
      const publicUrl = await SupabaseStorageService.uploadImage(filePath, imageBuffer, {
        contentType: STORAGE_CONSTANTS.CONTENT_TYPE,
        cacheControl: STORAGE_CONSTANTS.CACHE_CONTROL
      });

      if (!publicUrl) {
        throw new Error('Failed to upload image to storage');
      }

      // Calculate progress and determine status
      const progress = Math.floor(50 + (upscaleNumber * 12.5)); // 50% + 12.5% par upscale
      const updates: any = {
        [`upscale_${upscaleNumber}`]: publicUrl,
        progress,
        status: upscaleNumber === 4 ? GenerationStatus.COMPLETED : GenerationStatus.PROCESSING,
        ...(upscaleNumber === 4 ? { completed_at: new Date().toISOString() } : {})
      };

      const { error: updateError } = await supabase
        .from('generations')
        .update(updates)
        .eq('id', generationId);

      if (updateError) {
        throw updateError;
      }

      // Mark URL as processed
      this.processedUrls.add(imageUrl);
      this.processingUrls.delete(imageUrl);

      console.log('[UpscaleHandler] Successfully processed upscale');

      // Emit events
      this.emit('upscaleCompleted', {
        generationId,
        upscaleNumber,
        upscaleUrl: publicUrl
      });

    } catch (error) {
      // Remove from processing on error
      if (imageUrl) {
        this.processingUrls.delete(imageUrl);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while processing upscale';
      console.error('[UpscaleHandler] Error handling upscale:', errorMessage);
      this.emit('error', { 
        generationId, 
        error: errorMessage
      });
    }
  }

  private isUpscaleMessage(message: WebSocketMessage): boolean {
    return Boolean(
      message.data &&
      typeof message.data.imageUrl === 'string' &&
      typeof message.data.generationId === 'string'
    );
  }
}
