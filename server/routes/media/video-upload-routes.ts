import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateUser, type AuthenticatedRequest } from '../../middleware/rbac';
import { uploadVideo, generateVideoFilename } from '../../core/storage-client';

const router = Router();

// Configure multer for video uploads (max 100MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

/**
 * POST /api/upload/video
 * Upload a video file for rewards (creator sample videos)
 */
router.post('/video', authenticateUser, upload.single('video'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    // Generate unique filename
    const filename = generateVideoFilename(userId, req.file.originalname, 'sample');
    
    // Upload to Replit Object Storage
    const uploadResult = await uploadVideo(
      req.file.buffer,
      filename,
      req.file.mimetype
    );
    
    if (!uploadResult.ok) {
      return res.status(500).json({ error: uploadResult.error || 'Upload failed' });
    }
    
    res.json({
      success: true,
      url: uploadResult.url,
      filename,
      metadata: {
        size: req.file.size,
        mimeType: req.file.mimetype,
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload video' 
    });
  }
});

/**
 * POST /api/upload/reward-video
 * Upload a custom video for fan reward fulfillment
 */
router.post('/reward-video', authenticateUser, upload.single('video'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    const redemptionId = req.body.redemptionId;
    if (!redemptionId) {
      return res.status(400).json({ error: 'Redemption ID required' });
    }
    
    // Generate unique filename for fulfillment video
    const filename = generateVideoFilename(userId, req.file.originalname, 'fulfillment');
    
    // Upload to Replit Object Storage
    const uploadResult = await uploadVideo(
      req.file.buffer,
      filename,
      req.file.mimetype
    );
    
    if (!uploadResult.ok) {
      return res.status(500).json({ error: uploadResult.error || 'Upload failed' });
    }
    
    res.json({
      success: true,
      url: uploadResult.url,
      filename,
      redemptionId,
      metadata: {
        size: req.file.size,
        mimeType: req.file.mimetype,
      }
    });
  } catch (error) {
    console.error('Reward video upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload reward video' 
    });
  }
});

export default router;

