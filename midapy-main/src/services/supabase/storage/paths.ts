export const STORAGE_CONSTANTS = {
  BUCKET_NAME: 'generations',
  CONTENT_TYPE: 'image/png',
  CACHE_CONTROL: '3600'
} as const;

export function getGridPath(generationId: string): string {
  return `${generationId}/grid.png`;
}

export function getUpscalePath(generationId: string, upscaleNumber: number): string {
  return `${generationId}/upscale_${upscaleNumber}.png`;
}
