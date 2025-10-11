/**
 * Transforms image URLs from Replit Object Storage to use our proxy endpoint
 * This handles legacy URLs that point directly to storage.replit.com
 */
export function transformImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If it's already a relative URL starting with /api/storage, return as-is
  if (url.startsWith('/api/storage/')) {
    return url;
  }
  
  // If it's a full Replit storage URL, extract the path and use our proxy
  if (url.includes('storage.replit.com')) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Remove empty first element and bucket ID
      const filePath = pathParts.slice(2).join('/');
      return `/api/storage/${filePath}`;
    } catch (error) {
      console.error('Error parsing image URL:', error);
      return url;
    }
  }
  
  // Return as-is for other URLs (external images, data URIs, etc.)
  return url;
}

