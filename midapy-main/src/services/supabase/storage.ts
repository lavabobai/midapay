import { supabase } from '@/config';
import { config } from '@/config';

export class SupabaseStorageService {
  /**
   * Downloads an image from a URL and returns it as a Buffer
   */
  public static async downloadImage(url: string): Promise<Buffer | null> {
    try {
      console.log('[SupabaseStorageService] 🔄 Downloading image from:', url);
      const response = await fetch(url, {
        headers: {
          'Accept': 'image/webp,image/png,image/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }
      
      console.log('[SupabaseStorageService] 📝 Response headers:', {
        contentType,
        contentLength: response.headers.get('content-length')
      });
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Vérifier la signature du fichier
      const fileSignature = buffer.slice(0, 4).toString('hex');
      console.log('[SupabaseStorageService] 📝 File signature:', fileSignature);
      
      // Signatures valides
      const validSignatures = {
        png: '89504e47', // Signature PNG
        webp: '52494646'  // Signature WEBP (RIFF)
      };
      
      if (!Object.values(validSignatures).includes(fileSignature)) {
        throw new Error(`Invalid image signature: ${fileSignature}. Expected one of: ${Object.values(validSignatures).join(', ')}`);
      }
      
      console.log('[SupabaseStorageService] ✅ Image downloaded successfully');
      return buffer;
    } catch (error) {
      console.error('[SupabaseStorageService] ❌ Error downloading image:', error);
      return null;
    }
  }

  /**
   * Uploads an image to Supabase storage and returns the public URL
   */
  public static async uploadImage(
    path: string,
    file: Buffer,
    options?: {
      contentType?: string;
      cacheControl?: string;
    }
  ): Promise<string | null> {
    try {
      console.log('[SupabaseStorage] 📤 Uploading image to:', path);
      
      // Log buffer info before upload
      console.log('[SupabaseStorage] 📝 Upload buffer info:', {
        length: file.length,
        type: file.constructor.name,
        firstBytes: file.slice(0, 4).toString('hex')
      });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(config.storage.bucket)
        .upload(path, file, {
          contentType: options?.contentType || 'image/png',
          cacheControl: options?.cacheControl || '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('[SupabaseStorage] ❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('[SupabaseStorage] ✅ Upload successful:', uploadData);

      const { data: urlData } = await supabase.storage
        .from(config.storage.bucket)
        .getPublicUrl(path);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('[SupabaseStorage] 🔗 Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('[SupabaseStorage] ❌ Error uploading image:', error);
      return null;
    }
  }
}
