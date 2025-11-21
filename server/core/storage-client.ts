import { Client } from "@replit/object-storage";

/**
 * Replit Object Storage Client Configuration
 * Bucket: FandomlyCreatorImages
 * Bucket ID: replit-objstore-b86a50a0-f1f5-4ba0-80ed-68fd70de5783
 */

const BUCKET_ID = "replit-objstore-b86a50a0-f1f5-4ba0-80ed-68fd70de5783";

// Create singleton client instance
let storageClient: Client | null = null;
let clientInitialized = false;

export async function getStorageClient(): Promise<Client> {
  if (!storageClient) {
    storageClient = new Client();
    clientInitialized = true;
  }
  
  return storageClient;
}

/**
 * Upload an image file to Replit Object Storage
 * @param buffer - Image file buffer
 * @param filename - Destination filename (with path)
 * @param contentType - MIME type of the image
 * @returns URL to access the uploaded image
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const client = await getStorageClient();
    
    // Upload the image
    const result = await client.uploadFromBytes(filename, buffer);
    
    if (!result.ok) {
      console.error("Upload failed:", result.error);
      return { ok: false, error: result.error?.message || "Upload failed" };
    }
    
    // Generate the public URL for the uploaded image
    // Use our own server endpoint to proxy the image from Replit storage
    const url = `/api/storage/${filename}`;
    
    return { ok: true, url };
  } catch (error) {
    console.error("Upload error:", error);
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown upload error" 
    };
  }
}

/**
 * Delete an image from Replit Object Storage
 * @param filename - Path to the file to delete
 */
export async function deleteImage(filename: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getStorageClient();
    const result = await client.delete(filename);
    
    if (!result.ok) {
      console.error("Delete failed:", result.error);
      return { ok: false, error: result.error?.message || "Delete failed" };
    }
    
    return { ok: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown delete error" 
    };
  }
}

/**
 * Check if an image exists in storage
 * @param filename - Path to check
 */
export async function imageExists(filename: string): Promise<boolean> {
  try {
    const client = await getStorageClient();
    const result = await client.exists(filename);
    return result.ok ? result.value : false;
  } catch (error) {
    console.error("Exists check error:", error);
    return false;
  }
}

/**
 * List all images in a directory
 * @param prefix - Directory prefix to list
 */
export async function listImages(prefix?: string): Promise<string[]> {
  try {
    const client = await getStorageClient();
    const result = await client.list({ prefix });
    
    if (!result.ok) {
      console.error("List failed:", result.error);
      return [];
    }
    
    return result.value.map(obj => obj.name);
  } catch (error) {
    console.error("List error:", error);
    return [];
  }
}

/**
 * Generate a unique filename for an uploaded image
 * @param userId - User ID for namespacing
 * @param originalFilename - Original filename
 * @param type - Image type (avatar, banner, etc.)
 */
export function generateImageFilename(
  userId: string,
  originalFilename: string,
  type: 'avatar' | 'banner'
): string {
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-]/g, '_');
  
  return `${type}s/${sanitizedUserId}/${timestamp}.${extension}`;
}

/**
 * Upload a video file to Replit Object Storage
 * @param buffer - Video file buffer
 * @param filename - Destination filename (with path)
 * @param contentType - MIME type of the video
 * @returns URL to access the uploaded video
 */
export async function uploadVideo(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const client = await getStorageClient();
    
    // Upload the video
    const result = await client.uploadFromBytes(filename, buffer);
    
    if (!result.ok) {
      console.error("Video upload failed:", result.error);
      return { ok: false, error: result.error?.message || "Upload failed" };
    }
    
    // Generate the public URL for the uploaded video
    const url = `/api/storage/videos/${filename}`;
    
    return { ok: true, url };
  } catch (error) {
    console.error("Video upload error:", error);
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown upload error" 
    };
  }
}

/**
 * Generate a unique filename for an uploaded video
 * @param userId - User ID for namespacing
 * @param originalFilename - Original filename
 * @param type - Video type (reward, sample, fulfillment)
 */
export function generateVideoFilename(
  userId: string,
  originalFilename: string,
  type: 'reward' | 'sample' | 'fulfillment'
): string {
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'mp4';
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-]/g, '_');
  
  return `videos/${type}s/${sanitizedUserId}/${timestamp}.${extension}`;
}
