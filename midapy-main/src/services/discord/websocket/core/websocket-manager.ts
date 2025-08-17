import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { 
  WebSocketEvents, 
  WebSocketMessage, 
  IWebSocketManager, 
  DiscordButton, 
  UpscaleButton,
  DiscordErrorResponse 
} from './types';
import { GridHandler } from '../handlers/grid-handler';
import { UpscaleHandler } from '../handlers/upscale-handler';
import { config } from '../../../../config';
import { getImagePayload, getUpsamplePayload } from '../../../discord/payloads';
import { DISCORD_CONSTANTS, DISCORD_GATEWAY_URL } from './constants';
import { GenerationStatus } from '../../../../types';

export class DiscordWebSocket extends EventEmitter implements IWebSocketManager {
  protected ws: WebSocket | null = null;
  protected pingInterval: NodeJS.Timeout | null = null;
  protected reconnectAttempts = 0;
  protected readonly maxReconnectAttempts = 5;
  protected readonly reconnectDelay = 30000;
  protected _hasError = false;
  protected _isReady = false;
  protected readonly generationId: string;
  protected readonly userId: string;
  protected _onImageUrl: ((url: string, generationId: string) => Promise<void>) | null = null;
  protected upscaleButtons: UpscaleButton[] = [];
  protected upscaleHandler: UpscaleHandler;
  protected gridHandler: GridHandler;
  protected sequence: number | null = null;
  protected sessionId: string | undefined;
  protected isCleaningUp: boolean = false;

  constructor(generationId: string, userId: string) {
    super();
    this.generationId = generationId;
    this.userId = userId;
    this.upscaleHandler = new UpscaleHandler(this);
    this.gridHandler = new GridHandler(this);
    this.setupHandlers();
  }

  // Ajouter les getters publics
  public get isReady(): boolean {
    return this._isReady;
  }

  public get hasError(): boolean {
    return this._hasError;
  }

  public get connectionAttempts(): number {
    return this.reconnectAttempts;
  }

  public markForCleanup(): void {
    if (!this.isCleaningUp) {
      console.log('[WebSocket] Marking for cleanup');
      this.isCleaningUp = true;
      this.disconnect();
    }
  }

  protected setupHandlers() {
    // Nettoyer les anciens listeners
    this.upscaleHandler.removeAllListeners();
    this.gridHandler.removeAllListeners();
    
    // Connecter les événements des handlers
    this.upscaleHandler.on('upscaleCompleted', (data) => {
      const { upscaleNumber } = data;
      console.log(`[WebSocket] Upscale ${upscaleNumber}/4 completed for generation ${this.generationId}`);
      this.emit('upscaleCompleted', data);
    });

    this.upscaleHandler.on('error', (data) => {
      console.log(`[WebSocket] Error in upscale handler for generation ${this.generationId}`);
      this._hasError = true;
      this.emit('error', data);
    });
    
    this.gridHandler.on('gridCompleted', (data) => {
      console.log(`[WebSocket] Grid completed for generation ${this.generationId}`);
      this.emit('gridCompleted', data);
    });

    this.gridHandler.on('upscaleButtonsFound', async (data) => {
      const { buttons, messageId } = data;
      console.log(`[WebSocket] Processing upscale buttons for message ${messageId}`);
      
      // Cliquer sur les boutons avec un délai
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        await new Promise(resolve => setTimeout(resolve, i * 10000)); // 10 secondes entre chaque clic
        
        try {
          console.log(`[WebSocket] Clicking upscale button ${button.index} with ID ${button.customId}`);
          const message: WebSocketMessage = {
            id: messageId,
            type: 'INTERACTION',
            data: {
              generationId: this.generationId,
              buttonId: button.customId,
              type: 'upscale',
              messageId: messageId // Ajout du messageId dans data aussi
            }
          };
          await this.send(message);
        } catch (error) {
          console.error(`[WebSocket] Error clicking upscale button ${button.index}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    });

    this.gridHandler.on('error', (data) => {
      console.log(`[WebSocket] Error in grid handler for generation ${this.generationId}`);
      this._hasError = true;
      this.emit('error', data);
    });
  }

  public async connect(token: string): Promise<void> {
    if (this.isCleaningUp) {
      console.log('[WebSocket] Skipping connection during cleanup');
      return;
    }
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected');
        resolve();
        return;
      }

      try {
        // Nettoyer l'ancienne connexion si elle existe
        this.cleanup();

        // Configurer un timeout pour la connexion
        const connectionTimeout = setTimeout(() => {
          console.log('[WebSocket] Connection timeout');
          reject(new Error('Connection timeout'));
        }, 30000);

        const gatewayUrl = DISCORD_GATEWAY_URL;
        console.log('[WebSocket] Connecting to Discord Gateway');
        
        this.ws = new WebSocket(gatewayUrl);

        this.ws.on('open', () => {
          console.log('[WebSocket] Connected to Discord Gateway');
          clearTimeout(connectionTimeout);
          
          // Identify avec le token
          this.identify(config.discord.token);
          resolve();
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          console.error('[WebSocket] Error:', error instanceof Error ? error.message : 'Unknown error');
          this._hasError = true;
          this.cleanup();
          reject(error);
        });

        this.ws.on('message', async (data: WebSocket.Data) => {
          try {
            const payload = JSON.parse(data.toString());
            await this.handlePayload(payload);
          } catch (error) {
            console.error('[WebSocket] Error handling message:', error instanceof Error ? error.message : 'Unknown error');
          }
        });

        this.setupReconnection(token);
      } catch (error) {
        console.error('[WebSocket] Error connecting:', error instanceof Error ? error.message : 'Unknown error');
        reject(error);
      }
    });
  }

  protected identify(token: string) {
    if (!this.ws) return;

    const payload = {
      op: DISCORD_CONSTANTS.OPCODES.IDENTIFY,
      d: {
        token,
        intents: DISCORD_CONSTANTS.INTENTS,
        properties: {
          $os: 'linux',
          $browser: 'my_library',
          $device: 'my_library'
        }
      }
    };

    this.ws.send(JSON.stringify(payload));
  }

  protected setupReconnection(token: string) {
    if (!this.ws) return;
    
    this.ws.on('close', (code, reason) => {
      console.log(`[WebSocket] Closed with code ${code}`, reason ? `Reason: ${reason.toString()}` : '');
      this.cleanup();
      
      if (code === 4004) {
        console.error('[WebSocket] Authentication failed - invalid token');
        this._hasError = true;
        this.emit('error', {
          generationId: this.generationId,
          error: 'Authentication failed - invalid token'
        });
      } else if (code === 4005) {
        console.error('[WebSocket] Already identified - attempting to reconnect with new session');
        console.error('[WebSocket] Current session ID:', this.sessionId);
        console.error('[WebSocket] Current sequence number:', this.sequence);
        this.scheduleReconnect(token);
      } else if (code === 4006) {
        console.error('[WebSocket] Invalid session - attempting to reconnect');
        console.error('[WebSocket] Current session ID:', this.sessionId);
        this.scheduleReconnect(token);
      } else if (code === 4007) {
        console.error('[WebSocket] Invalid sequence - attempting to reconnect');
        console.error('[WebSocket] Current sequence number:', this.sequence);
        this.scheduleReconnect(token);
      } else {
        console.log('[WebSocket] Unexpected close - attempting to reconnect');
        console.log('[WebSocket] Close code:', code);
        console.log('[WebSocket] Close reason:', reason ? reason.toString() : 'No reason provided');
        this.scheduleReconnect(token);
      }
    });
  }

  protected scheduleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this._hasError = true;
      this.emit('error', {
        generationId: this.generationId,
        error: 'Max reconnection attempts reached'
      });
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(async () => {
      try {
        console.log('[WebSocket] Attempting to reconnect...');
        await this.connect(token);
      } catch (error) {
        console.error('[WebSocket] Reconnection failed:', error instanceof Error ? error.message : 'Unknown error');
        this.scheduleReconnect(token);
      }
    }, this.reconnectDelay);
  }

  protected async handlePayload(payload: any) {
    if (this.isCleaningUp) {
      console.log('[WebSocket] Skipping payload handling during cleanup');
      return;
    }
    // Liste des événements à ignorer pour le logging
    const ignoredEvents = [
      'CHANNEL_UNREAD_UPDATE',
      'GUILD_CREATE',
      'GUILD_MEMBER_LIST_UPDATE',
      'PRESENCE_UPDATE',
      'TYPING_START'
    ];

    // Ne logger que le type d'événement
    if (payload.t && !ignoredEvents.includes(payload.t)) {
      console.log(`[WebSocket] Received event: ${payload.t}`);
    }

    try {
      if (payload.op === DISCORD_CONSTANTS.OPCODES.HELLO) {
        this.startHeartbeat(payload.d.heartbeat_interval);
      } else if (payload.op === DISCORD_CONSTANTS.OPCODES.HEARTBEAT_ACK) {
        // Pas de traitement nécessaire
      } else if (payload.op === DISCORD_CONSTANTS.OPCODES.DISPATCH) {
        if (payload.t === 'READY') {
          this._isReady = true;
          this.sessionId = payload.d.session_id;
          this.reconnectAttempts = 0;
          this.emit('ready');
        } else if (payload.t === 'MESSAGE_CREATE' || payload.t === 'MESSAGE_UPDATE') {
          await this.handleMessage(payload);
        }
      }
    } catch (error) {
      console.error('[WebSocket] Error in handlePayload:', error instanceof Error ? error.message : 'Unknown error');
      this.emit('error', { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        generationId: this.generationId
      });
    }
  }

  protected async handleMessage(payload: any) {
    if (this.isCleaningUp) {
      console.log('[WebSocket] Skipping message handling during cleanup');
      return;
    }
    const message = payload.d;

    // Vérifications de sécurité
    if (!message || !message.author) {
      console.log('[WebSocket] Invalid message format:', message);
      return;
    }

    // Ignorer les messages qui ne sont pas du bot Midjourney
    if (message.author.id !== DISCORD_CONSTANTS.MIDJOURNEY_BOT_ID) {
      return;
    }

    // Ignorer les messages sans contenu ou sans pièces jointes
    if (!message.content || !message.attachments) {
      console.log('[WebSocket] Message without content or attachments');
      return;
    }

    // Ne traiter que les messages avec des pièces jointes
    if (!message.attachments || message.attachments.length === 0) {
      return;
    }

    console.log('[WebSocket] Processing message');

    // Liste des messages d'erreur spécifiques de Discord/Midjourney
    const errorMessages = [
      'Invalid parameter',
      'Request failed',
      'Job failed',
      'Queue full',
      'Ratelimited',
      'Banned prompt detected',
      'Invalid image URL',
      'Blocked prompt detected'
    ];

    // Vérifier si c'est une vraie erreur
    const hasError = errorMessages.some(errMsg => 
      message.content?.toLowerCase().includes(errMsg.toLowerCase())
    );

    if (hasError) {
      this.emit('error', { 
        generationId: this.generationId,
        error: message.content 
      });
      return;
    }

    // Traitement de la grille
    if (!message.content?.includes('Image #')) {
      console.log('[WebSocket] Processing grid message');
      
      // Créer le message de grille avec toutes les informations nécessaires
      const gridMessage = {
        type: payload.t,
        id: message.id,
        session_id: this.sessionId,
        data: {
          generationId: this.generationId,
          imageUrl: message.attachments[0].url,
          type: 'grid_completed'
        },
        components: message.components // Ajouter les composants pour le traitement des boutons
      };

      // D'abord traiter la grille et sauvegarder l'image
      await this.gridHandler.handleMessage(gridMessage);

      // Ensuite traiter les boutons d'upscale
      if (message.components?.length > 0 && message.components[0]?.components?.some((btn: DiscordButton) => btn.custom_id?.includes('upsample::'))) {
        console.log('[WebSocket] Found upscale buttons in message');
        
        const upscaleButtons = message.components[0].components
          .filter((btn: DiscordButton) => btn.custom_id?.includes('upsample::'))
          .map((btn: DiscordButton) => {
            const parts = btn.custom_id?.split('::') || [];
            const index = parseInt(parts[3]);
            return {
              index,
              customId: btn.custom_id
            } as UpscaleButton;
          })
          .sort((a: UpscaleButton, b: UpscaleButton) => a.index - b.index);

        if (upscaleButtons.length > 0) {
          console.log('[WebSocket] Found upscale buttons');
          
          this.emit('messageIdAvailable', { 
            generationId: this.generationId, 
            messageId: message.id,
            userId: this.userId,
            upscaleButtons
          });
        }
      }
    }

    // Traitement des variations
    if (message.content?.includes('Image #')) {
      console.log('[WebSocket] Processing variation message');
      
      await this.upscaleHandler.handleMessage({
        type: payload.t,
        id: message.id,
        session_id: this.sessionId,
        data: {
          generationId: this.generationId,
          imageUrl: message.attachments[0].url,
          content: message.content,
          type: 'upscale_completed'
        }
      });
    }
  }

  protected startHeartbeat(interval: number) {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    console.log('[WebSocket] Starting heartbeat with interval', interval, 'ms');
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Sending heartbeat with sequence:', this.sequence);
        this.ws.send(JSON.stringify({
          op: DISCORD_CONSTANTS.OPCODES.HEARTBEAT,
          d: this.sequence
        }));
      } else {
        console.log('[WebSocket] Cannot send heartbeat - WebSocket not open (readyState:', this.ws?.readyState, ')');
      }
    }, interval);
  }

  protected cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log('[WebSocket] Heartbeat interval cleared');
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws = null;
      console.log('[WebSocket] WebSocket listeners removed');
    }
    this.sessionId = undefined;
    this._isReady = false;
    this.upscaleButtons = [];
    console.log('[WebSocket] WebSocket cleanup completed');
  }

  public async disconnect(): Promise<void> {
    if (!this.ws) return;
    
    console.log('[WebSocket] Disconnecting WebSocket...');
    try {
      this.ws.close();
      console.log('[WebSocket] WebSocket closed successfully');
      this.cleanup();
      console.log('[WebSocket] WebSocket resources cleaned up');
    } catch (error) {
      console.error('[WebSocket] Error during WebSocket disconnect:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  public async send(message: WebSocketMessage): Promise<void> {
    if (this.isCleaningUp || !this.ws || !this._isReady) {
      return;
    }
    console.log('[WebSocket] Preparing to send message');
    
    try {
      let payload;
      
      if (message.type === 'INTERACTION' && message.data?.type === 'upscale') {
        if (!message.data || !message.data.buttonId || !message.id) {
          throw new Error('Missing required data for upscale interaction: need message.id and message.data.buttonId');
        }
        
        // Construire le payload pour un clic de bouton d'upscale
        payload = getUpsamplePayload({
          messageId: message.id,
          index: parseInt(message.data.buttonId.split(':')[3]),
          guildId: config.discord.serverId,
          channelId: config.discord.channelId,
          customId: message.data.buttonId
        });
      } else {
        // Construire le payload pour une commande /imagine
        payload = getImagePayload({
          prompt: message.d.content.replace('/imagine ', ''),
          channelId: message.d.channel_id,
          guildId: config.discord.serverId,
        });
      }

      console.log('[WebSocket] Sending interaction');

      const response = await fetch('https://discord.com/api/v10/interactions', {
        method: 'POST',
        headers: {
          'Authorization': config.discord.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json() as DiscordErrorResponse;
        console.error('[WebSocket] Error sending interaction:', errorData);
        throw new Error(`Failed to send interaction: ${errorData.message}`);
      }

      console.log('[WebSocket] Interaction sent successfully');
    } catch (error) {
      console.error('[WebSocket] Error sending interaction:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while sending interaction');
    }
  }
}

// Export pour la rétrocompatibilité
export const WebSocketManager = DiscordWebSocket;
