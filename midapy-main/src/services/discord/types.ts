export interface DiscordAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url: string;
  width: number;
  height: number;
  content_type: string;
}

export interface DiscordComponent {
  type: number;
  custom_id?: string;
}

export interface DiscordComponentRow {
  type: number;
  components: DiscordComponent[];
}

export interface DiscordMessage {
  id: string;
  type: number;
  content: string;
  channel_id: string;
  attachments: DiscordAttachment[];
  components?: DiscordComponentRow[];
  referenced_message?: {
    id: string;
  };
}

export interface MidjourneyCommandOptions {
  prompt: string;
  guildId: string;
  channelId: string;
}

export const MIDJOURNEY_BOT_ID = "936929561302675456";
export const MIDJOURNEY_COMMAND_ID = "938956540159881230";
export const MIDJOURNEY_COMMAND_VERSION = "1237876415471554623";
