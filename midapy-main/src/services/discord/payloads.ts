import { MidjourneyCommandOptions, MIDJOURNEY_BOT_ID, MIDJOURNEY_COMMAND_ID, MIDJOURNEY_COMMAND_VERSION } from './types';

export const getImagePayload = ({ prompt, guildId, channelId }: MidjourneyCommandOptions) => ({
  type: 2,
  application_id: MIDJOURNEY_BOT_ID,
  guild_id: guildId,
  channel_id: channelId,
  session_id: Math.random().toString(36).substring(7),
  data: {
    version: MIDJOURNEY_COMMAND_VERSION,
    id: MIDJOURNEY_COMMAND_ID,
    name: "imagine",
    type: 1,
    options: [
      {
        type: 3,
        name: "prompt",
        value: prompt
      }
    ],
    application_command: {
      id: MIDJOURNEY_COMMAND_ID,
      type: 1,
      application_id: MIDJOURNEY_BOT_ID,
      version: MIDJOURNEY_COMMAND_VERSION,
      name: "imagine",
      description: "Create images with Midjourney",
      options: [
        {
          type: 3,
          name: "prompt",
          description: "The prompt to imagine",
          required: true
        }
      ]
    },
    attachments: []
  }
});

export const getUpsamplePayload = ({ 
  messageId, 
  index, 
  guildId, 
  channelId, 
  customId 
}: {
  messageId: string;
  index: number;
  guildId: string;
  channelId: string;
  customId?: string;
}) => ({
  type: 3,
  application_id: MIDJOURNEY_BOT_ID,
  guild_id: guildId,
  channel_id: channelId,
  message_id: messageId,
  session_id: Math.random().toString(36).substring(7),
  message_flags: 0,
  data: {
    component_type: 2,
    custom_id: customId || `MJ::JOB::upsample::${index}::${messageId.split('_').pop()?.split('.')[0] || messageId}`
  }
});
