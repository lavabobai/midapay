// Import using ES6 import
import { DiscordWebSocket, WebSocketManager } from './core/websocket-manager';

console.log('[websocket/index.ts] Imported WebSocketManager:', WebSocketManager);
console.log('[websocket/index.ts] WebSocketManager type:', typeof WebSocketManager);
console.log('[websocket/index.ts] WebSocketManager prototype:', WebSocketManager?.prototype);
console.log('[websocket/index.ts] Is WebSocketManager a constructor?', WebSocketManager?.prototype?.constructor === WebSocketManager);

// Re-export
export * from './core/websocket-manager';
export * from './core/types';
export * from './handlers/grid-handler';
export * from './handlers/upscale-handler';
