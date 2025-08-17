import { config, supabase } from '@/config';

class StorageService {
  private readonly bucket = config.storage.bucket;

  async uploadImage(imageUrl: string, path: string): Promise<string> {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from(this.bucket)
        .upload(path, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from(this.bucket)
        .getPublicUrl(path);

      return publicUrl;

    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async deleteImage(path: string): Promise<void> {
    try {
      const { error } = await supabase
        .storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  getImagePath(generationId: string, type: 'grid' | 'upscale', index?: number): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const base = `${timestamp}/${generationId}`;
    
    if (type === 'grid') {
      return `${base}/grid.png`;
    } else {
      return `${base}/upscale_${index}.png`;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
