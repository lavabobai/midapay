import { EventEmitter } from 'events';
import { DiscordWebSocket } from './websocket/core/websocket-manager';
import { IWebSocketManager } from './websocket/core/types';
import { config } from '../../config';
import { DISCORD_CONSTANTS } from './websocket/core/constants';
import { supabase } from '../../config';
import { GenerationStatus } from '../../types';

console.log('[service.ts] Imported WebSocketManager:', DiscordWebSocket);
console.log('[service.ts] WebSocketManager type:', typeof DiscordWebSocket);
console.log('[service.ts] WebSocketManager prototype:', DiscordWebSocket?.prototype);
console.log('[DiscordService] Is WebSocketManager a constructor?', DiscordWebSocket?.prototype?.constructor === DiscordWebSocket);

export class DiscordService {
  private wsManagers: Map<string, IWebSocketManager> = new Map();

  constructor() {
    console.log('[DiscordService] Constructor called');
    console.log('[DiscordService] WebSocketManager:', DiscordWebSocket);
  }

  private getOrCreateWebSocket(generationId: string, userId: string): IWebSocketManager {
    console.log('[DiscordService] getOrCreateWebSocket called with:', { generationId, userId });
    
    let wsManager = this.wsManagers.get(generationId);
    if (!wsManager) {
      console.log('[DiscordService] Creating new WebSocket instance...');
      wsManager = new DiscordWebSocket(generationId, userId);
      console.log('[DiscordService] New WebSocket instance created');
      this.wsManagers.set(generationId, wsManager);

      // Configurer les handlers par défaut
      console.log('[DiscordService] Setting up default handlers');
      
      wsManager.on('gridCompleted', async (data: { generationId: string; gridImageUrl: string }) => {
        console.log('[DiscordService] Grid completed event received');
      });

      // Nettoyer le WebSocket quand il est fermé avec erreur
      wsManager.on('error', () => {
        console.log('[DiscordService] WebSocket error detected, cleaning up instance for:', generationId);
        this.cleanup(generationId);
      });
    } else {
      console.log('[DiscordService] Using existing WebSocket instance');
    }
    return wsManager;
  }

  public async cleanup(generationId: string): Promise<void> {
    console.log('[DiscordService] Starting cleanup for generation:', generationId);
    const wsManager = this.wsManagers.get(generationId);
    if (wsManager) {
      console.log('[DiscordService] Disconnecting WebSocket for generation:', generationId);
      // Marquer le WebSocket comme en cours de nettoyage
      wsManager.markForCleanup();
      // Attendre un court délai pour laisser les opérations en cours se terminer
      await new Promise(resolve => setTimeout(resolve, 1000));
      await wsManager.disconnect();
      this.wsManagers.delete(generationId);
      console.log('[DiscordService] WebSocket manager removed for generation:', generationId);
    } else {
      console.log('[DiscordService] No WebSocket manager found for generation:', generationId);
    }
  }

  private waitForReady(wsManager: IWebSocketManager): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket ready timeout'));
      }, 30000);

      if (wsManager.isReady) {
        clearTimeout(timeout);
        resolve();
      } else {
        wsManager.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        wsManager.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      }
    });
  }

  public async generateImage(prompt: string, generationId: string, userId?: string): Promise<void> {
    console.log('[DiscordService] generateImage called with:', { prompt, generationId, userId });
    try {
      // Mettre à jour le statut à PROCESSING
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: GenerationStatus.PROCESSING,
          progress: 0
        })
        .eq('id', generationId);

      if (updateError) {
        throw new Error(`Failed to update generation status: ${updateError.message}`);
      }

      const wsManager = this.getOrCreateWebSocket(generationId, userId || '');
      
      // Configurer les handlers pour stocker les images
      this.onGridCompleted(generationId, async (data) => {
        console.log('[DiscordService] Grid completed callback:', data);
      });

      this.onUpscaleCompleted(generationId, async (data) => {
        console.log('[DiscordService] Upscale completed callback:', data);
      });

      console.log('[DiscordService] Connecting WebSocket...');
      await wsManager.connect(config.discord.token);
      console.log('[DiscordService] WebSocket connected');

      console.log('[DiscordService] Waiting for WebSocket to be ready...');
      await this.waitForReady(wsManager);
      console.log('[DiscordService] WebSocket is ready');

      console.log('[DiscordService] Sending message...');
      wsManager.send({
        op: DISCORD_CONSTANTS.OPCODES.DISPATCH,
        t: DISCORD_CONSTANTS.EVENTS.MESSAGE_CREATE,
        d: {
          content: `/imagine ${prompt}`,
          channel_id: config.discord.channelId
        }
      });
    } catch (error) {
      console.error('[DiscordService] Error in generateImage:', error);
      throw error;
    }
  }

  public async upscaleImage(generationId: string, index: number): Promise<void> {
    try {
      console.log('[DiscordService] Starting upscale for generation:', generationId, 'index:', index);
      
      const wsManager = this.wsManagers.get(generationId);
      if (!wsManager) {
        throw new Error('No WebSocket manager found for this generation');
      }

      console.log('[DiscordService] Sending upscale message...');
      wsManager.send({
        op: DISCORD_CONSTANTS.OPCODES.DISPATCH,
        t: DISCORD_CONSTANTS.EVENTS.MESSAGE_CREATE,
        d: {
          content: `/upscale ${index}`,
          channel_id: config.discord.channelId
        }
      });
    } catch (error) {
      console.error('[DiscordService] Error in upscaleImage:', error);
      throw error;
    }
  }

  public onGridCompleted(generationId: string, callback: (data: { imageUrl: string; generationId: string }) => Promise<void>): void {
    console.log('[DiscordService] Setting up grid completed handler for:', generationId);
    const wsManager = this.wsManagers.get(generationId);
    if (!wsManager) {
      console.log('[DiscordService] No WebSocket manager found for:', generationId);
      return;
    }

    wsManager.on('gridCompleted', async (data: { generationId: string; gridImageUrl: string }) => {
      try {
        // Télécharger l'image
        console.log('[DiscordService] Grid completed event received:', data);
        const response = await fetch(data.gridImageUrl);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        console.log('[DiscordService] Image downloaded successfully');

        // Stocker sur Supabase
        const filePath = `${generationId}/grid.png`;
        console.log('[DiscordService] Uploading to Supabase:', filePath);
        const { error: uploadError } = await supabase.storage
          .from(config.storage.bucket)
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('[DiscordService] Upload error:', uploadError);
          throw uploadError;
        }

        // Obtenir l'URL publique
        console.log('[DiscordService] Getting public URL for:', filePath);
        const { data: urlData } = supabase.storage
          .from(config.storage.bucket)
          .getPublicUrl(filePath);

        console.log('[DiscordService] Calling callback with URL:', urlData.publicUrl);
        // Appeler le callback avec l'URL Supabase
        await callback({
          generationId: data.generationId,
          imageUrl: urlData.publicUrl
        });
        console.log('[DiscordService] Grid completion handled successfully');
      } catch (error) {
        console.error('[DiscordService] Error handling grid completion:', error);
      }
    });
  }

  public onUpscaleCompleted(generationId: string, callback: (data: { generationId: string; index: number; imageUrl: string }) => Promise<void>): void {
    const wsManager = this.wsManagers.get(generationId);
    if (wsManager) {
      wsManager.on('upscaleCompleted', async (data: { generationId: string; upscaleNumber: number; upscaleUrl: string }) => {
        try {
          // Mise à jour de la base de données
          const update: Record<string, any> = {
            [`upscale_${data.upscaleNumber}`]: data.upscaleUrl,
            progress: 75 + (data.upscaleNumber * 6.25) // Progress from 75% to 100% across 4 upscales
          };

          // Si c'est le dernier upscale, marquer comme terminé
          if (data.upscaleNumber === 4) {
            update.status = GenerationStatus.COMPLETED;
            update.completed_at = new Date().toISOString();
          }

          await supabase
            .from('generations')
            .update(update)
            .eq('id', data.generationId);

          // Appeler le callback avec les données transformées
          await callback({
            generationId: data.generationId,
            index: data.upscaleNumber,
            imageUrl: data.upscaleUrl
          });

          console.log(`[DiscordService] Upscale ${data.upscaleNumber}/4 completion handled successfully`);

          // Si c'est le dernier upscale, nettoyer le WebSocket APRÈS la mise à jour et le callback
          if (data.upscaleNumber === 4) {
            await this.cleanup(data.generationId);
          }
        } catch (error) {
          console.error('[DiscordService] Error handling upscale completion:', error instanceof Error ? error.message : 'Unknown error');
          throw error;
        }
      });
    }
  }

  public onError(generationId: string, callback: (data: { error: string; generationId: string }) => Promise<void>): void {
    console.log('[DiscordService] Setting up error handler for:', generationId);
    const wsManager = this.wsManagers.get(generationId);
    if (wsManager) {
      wsManager.on('error', async (data) => {
        await callback(data);
      });
    }
  }
}

export const discordService = new DiscordService();
