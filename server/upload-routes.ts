import { Router, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { uploadImage, deleteImage, generateImageFilename } from "./storage-client";
import { authenticateUser, type AuthenticatedRequest } from "./middleware/rbac";

const router = Router();

// Configure multer for memory storage (we'll process before uploading)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

/**
 * Image validation and processing
 */
interface ImageValidationOptions {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: { width: number; height: number; tolerance?: number };
}

async function validateAndProcessImage(
  buffer: Buffer,
  options: ImageValidationOptions = {}
): Promise<{ ok: boolean; buffer?: Buffer; error?: string; metadata?: any }> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return { ok: false, error: 'Could not determine image dimensions' };
    }
    
    // Relaxed validation - only check minimums if specified, no maximums or aspect ratios
    if (options.minWidth && metadata.width < options.minWidth) {
      return { ok: false, error: `Image width must be at least ${options.minWidth}px` };
    }
    if (options.minHeight && metadata.height < options.minHeight) {
      return { ok: false, error: `Image height must be at least ${options.minHeight}px` };
    }
    
    // Note: Removed maxWidth, maxHeight, and aspectRatio validation
    // Frontend will handle cropping to desired dimensions
    
    // Optimize the image (convert to WebP for better compression)
    const processedBuffer = await image
      .webp({ quality: 85 })
      .toBuffer();
    
    return { ok: true, buffer: processedBuffer, metadata };
  } catch (error) {
    console.error('Image validation error:', error);
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : 'Failed to process image' 
    };
  }
}

/**
 * POST /api/upload/avatar
 * Upload a profile avatar image
 */
router.post('/avatar', authenticateUser, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    // Validate and process avatar image (relaxed - cropping handled on frontend)
    const validation = await validateAndProcessImage(req.file.buffer, {
      minWidth: 50,
      minHeight: 50
    });
    
    if (!validation.ok || !validation.buffer) {
      return res.status(400).json({ error: validation.error || 'Invalid image' });
    }
    
    // Generate unique filename
    const filename = generateImageFilename(userId, req.file.originalname, 'avatar');
    
    // Upload to Replit Object Storage
    const uploadResult = await uploadImage(
      validation.buffer,
      filename,
      'image/webp'
    );
    
    if (!uploadResult.ok) {
      return res.status(500).json({ error: uploadResult.error || 'Upload failed' });
    }
    
    res.json({
      success: true,
      url: uploadResult.url,
      filename,
      metadata: {
        width: validation.metadata?.width,
        height: validation.metadata?.height,
        format: 'webp'
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload avatar' 
    });
  }
});

/**
 * POST /api/upload/banner
 * Upload a profile banner image
 */
router.post('/banner', authenticateUser, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    // Validate and process banner image (relaxed - cropping handled on frontend)
    const validation = await validateAndProcessImage(req.file.buffer, {
      minWidth: 200,
      minHeight: 100
    });
    
    if (!validation.ok || !validation.buffer) {
      return res.status(400).json({ error: validation.error || 'Invalid image' });
    }
    
    // Generate unique filename
    const filename = generateImageFilename(userId, req.file.originalname, 'banner');
    
    // Upload to Replit Object Storage
    const uploadResult = await uploadImage(
      validation.buffer,
      filename,
      'image/webp'
    );
    
    if (!uploadResult.ok) {
      return res.status(500).json({ error: uploadResult.error || 'Upload failed' });
    }
    
    res.json({
      success: true,
      url: uploadResult.url,
      filename,
      metadata: {
        width: validation.metadata?.width,
        height: validation.metadata?.height,
        format: 'webp'
      }
    });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload banner' 
    });
  }
});

/**
 * DELETE /api/upload/image
 * Delete an uploaded image
 */
router.delete('/image', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    // Security: Ensure user can only delete their own images
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-]/g, '_');
    if (!filename.includes(sanitizedUserId)) {
      return res.status(403).json({ error: 'Unauthorized to delete this image' });
    }
    
    const deleteResult = await deleteImage(filename);
    
    if (!deleteResult.ok) {
      return res.status(500).json({ error: deleteResult.error || 'Delete failed' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete image' 
    });
  }
});

export default router;
