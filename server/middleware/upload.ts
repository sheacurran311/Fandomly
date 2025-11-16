import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure upload directories exist
const UPLOAD_DIRS = {
  screenshots: path.join(process.cwd(), 'uploads', 'screenshots'),
  avatars: path.join(process.cwd(), 'uploads', 'avatars'),
  banners: path.join(process.cwd(), 'uploads', 'banners'),
};

// Create directories if they don't exist
Object.values(UPLOAD_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const screenshotStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    cb(null, UPLOAD_DIRS.screenshots);
  },
  filename: (req: Request, file, cb) => {
    // Generate unique filename: timestamp-userId-originalname
    const userId = (req as any).user?.id || 'anonymous';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .substring(0, 50);

    const filename = `${timestamp}-${userId}-${basename}${ext}`;
    cb(null, filename);
  },
});

// File filter for images only
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`));
  }
};

// Screenshot upload middleware
export const uploadScreenshot = multer({
  storage: screenshotStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Single file upload
  },
  fileFilter: imageFileFilter,
});

// Multiple screenshots upload (for tasks that need multiple proof images)
export const uploadMultipleScreenshots = multer({
  storage: screenshotStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // Max 5 files
  },
  fileFilter: imageFileFilter,
});

/**
 * Get public URL for uploaded file
 */
export function getFileUrl(filename: string, type: 'screenshot' | 'avatar' | 'banner'): string {
  // If using cloud storage (S3, Cloudinary), return cloud URL
  // For now, return local path that will be served by Express static middleware
  return `/uploads/${type}s/${filename}`;
}

/**
 * Delete uploaded file
 */
export function deleteFile(filepath: string): void {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

/**
 * Validate and sanitize proof URL
 */
export function validateProofUrl(url: string, platform: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: true }; // URL is optional
  }

  try {
    const urlObj = new URL(url);
    const validDomains: Record<string, string[]> = {
      twitter: ['twitter.com', 'x.com', 't.co'],
      instagram: ['instagram.com', 'instagr.am'],
      youtube: ['youtube.com', 'youtu.be'],
      tiktok: ['tiktok.com', 'vm.tiktok.com'],
      facebook: ['facebook.com', 'fb.com', 'fb.me'],
      spotify: ['spotify.com', 'open.spotify.com'],
      twitch: ['twitch.tv', 'www.twitch.tv'],
    };

    const allowedDomains = validDomains[platform.toLowerCase()];
    if (allowedDomains && !allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return {
        valid: false,
        error: `Invalid URL for ${platform}. Expected domain: ${allowedDomains.join(' or ')}`,
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Extract content ID from social media URL
 */
export function extractContentId(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);

    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        // Format: twitter.com/username/status/1234567890
        const twitterMatch = urlObj.pathname.match(/\/status\/(\d+)/);
        return twitterMatch ? twitterMatch[1] : null;

      case 'instagram':
        // Format: instagram.com/p/ABC123/ or instagram.com/reel/ABC123/
        const igMatch = urlObj.pathname.match(/\/(p|reel)\/([^\/]+)/);
        return igMatch ? igMatch[2] : null;

      case 'youtube':
        // Format: youtube.com/watch?v=ABC123 or youtu.be/ABC123
        const ytParam = urlObj.searchParams.get('v');
        if (ytParam) return ytParam;
        const ytMatch = urlObj.pathname.match(/\/([^\/]+)$/);
        return ytMatch ? ytMatch[1] : null;

      case 'tiktok':
        // Format: tiktok.com/@username/video/1234567890
        const ttMatch = urlObj.pathname.match(/\/video\/(\d+)/);
        return ttMatch ? ttMatch[1] : null;

      case 'facebook':
        // Format: facebook.com/username/posts/1234567890
        const fbMatch = urlObj.pathname.match(/\/posts\/(\d+)/);
        return fbMatch ? fbMatch[1] : null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Extract username from social media URL
 */
export function extractUsername(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);

    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        // Format: twitter.com/username/...
        const twitterMatch = urlObj.pathname.match(/^\/([^\/]+)/);
        return twitterMatch ? twitterMatch[1] : null;

      case 'instagram':
        // Format: instagram.com/username/
        const igMatch = urlObj.pathname.match(/^\/([^\/]+)/);
        return igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel'
          ? igMatch[1]
          : null;

      case 'tiktok':
        // Format: tiktok.com/@username/...
        const ttMatch = urlObj.pathname.match(/^\/@([^\/]+)/);
        return ttMatch ? ttMatch[1] : null;

      case 'youtube':
        // Format: youtube.com/@username or youtube.com/c/username
        const ytMatch = urlObj.pathname.match(/^\/@?([^\/]+)/);
        return ytMatch ? ytMatch[1] : null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}
