/**
 * Storage Routes - File and media storage proxy endpoints
 * Extracted from main.ts for better modularity
 */

import type { Express } from "express";
import express from "express";
import path from 'path';
import { getJWKS } from "../../services/auth/jwt-service";

export function registerStorageRoutes(app: Express) {
  // Serve static files for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Proxy images from Replit Object Storage
  app.get('/api/storage/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0]; // Get everything after /api/storage/
      const { getStorageClient } = await import('../../core/storage-client');
      const client = await getStorageClient();
      
      const result = await client.downloadAsBytes(filename);
      
      if (!result.ok || !result.value) {
        console.error('Image not found:', filename, result.error);
        return res.status(404).json({ error: 'Image not found' });
      }
      
      // The Replit SDK returns the buffer wrapped in an array
      // Access the actual buffer from result.value[0]
      const resultValue: any = result.value;
      const imageBuffer = Array.isArray(resultValue) ? resultValue[0] : resultValue;
      
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        console.error('Invalid buffer format for:', filename);
        return res.status(500).json({ error: 'Invalid image data' });
      }
      
      // Determine content type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      
      res.setHeader('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error serving image from storage:', error);
      res.status(500).json({ error: 'Failed to load image' });
    }
  });

  // Proxy videos from Replit Object Storage
  app.get('/api/storage/videos/*', async (req, res) => {
    try {
      const filename = (req.params as any)[0]; // Get everything after /api/storage/videos/
      const { getStorageClient } = await import('../../core/storage-client');
      const client = await getStorageClient();
      
      const result = await client.downloadAsBytes(filename);
      
      if (!result.ok || !result.value) {
        console.error('Video not found:', filename, result.error);
        return res.status(404).json({ error: 'Video not found' });
      }
      
      const resultValue: any = result.value;
      const videoBuffer = Array.isArray(resultValue) ? resultValue[0] : resultValue;
      
      if (!videoBuffer || !Buffer.isBuffer(videoBuffer)) {
        console.error('Invalid buffer format for:', filename);
        return res.status(500).json({ error: 'Invalid video data' });
      }
      
      // Determine content type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
      };
      
      res.setHeader('Content-Type', contentTypes[ext || 'mp4'] || 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(videoBuffer);
    } catch (error) {
      console.error('Error serving video from storage:', error);
      res.status(500).json({ error: 'Failed to load video' });
    }
  });
  
  // JWKS endpoint for Crossmint JWT validation
  app.get('/.well-known/jwks.json', (req, res) => {
    try {
      const jwks = getJWKS();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.json(jwks);
    } catch (error) {
      console.error('Error serving JWKS:', error);
      res.status(500).json({ error: 'Failed to generate JWKS' });
    }
  });
}
