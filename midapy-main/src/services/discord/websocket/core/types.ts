import { EventEmitter } from 'events';

export interface DiscordButton {
  type: number;
  style: number;
  custom_id: string;
  label: string;
  disabled?: boolean;
}

export interface DiscordActionRow {
  type: number;
  components: DiscordButton[];
}

export interface UpscaleButton {
  index: number;
  customId: string;
}

export interface DiscordErrorResponse {
  code?: number;
  message: string;
  errors?: Record<string, any>;
}

export interface WebSocketMessage {
  op?: number;
  t?: string;
  d?: any;
  s?: number;
  type?: string;
  id?: string;
  content?: string;
  author?: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
  };
  attachments?: {
    id: string;
    url: string;
    proxy_url: string;
    filename: string;
    width: number;
    height: number;
    size: number;
    content_type: string;
  }[];
  data?: {
    type?: string;
    generationId?: string;
    imageUrl?: string;
    index?: number;
    buttonId?: string;
    content?: string;
    messageId?: string;
  };
  components?: DiscordActionRow[];
  session_id?: string;
  error?: DiscordErrorResponse;
}

export interface WebSocketEvents {
  gridCompleted: (data: { generationId: string; gridImageUrl: string }) => void;
  upscaleCompleted: (data: { generationId: string; upscaleNumber: number; upscaleUrl: string }) => void;
  error: (data: { error: string; generationId: string }) => void;
  ready: () => void;
  close: (code: number) => void;
}

export interface IWebSocketManager extends EventEmitter {
  isReady: boolean;
  connect(token: string): Promise<void>;
  disconnect(): Promise<void>;
  send(message: WebSocketMessage): Promise<void>;
  markForCleanup(): void;
  on<K extends keyof WebSocketEvents>(event: K, listener: WebSocketEvents[K]): this;
  emit<K extends keyof WebSocketEvents>(event: K, ...args: Parameters<WebSocketEvents[K]>): boolean;
  removeAllListeners<K extends keyof WebSocketEvents>(event?: K): this;
}
