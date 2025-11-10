import type { Express } from "express";
import { authenticateUser, AuthenticatedRequest } from "./middleware/rbac";
import {
  verifySpotifyFollowArtist,
  verifySpotifyFollowPlaylist,
  updateTaskCompletion
} from "./services/social-verification-service";

/**
 * Spotify Task Verification Routes
 * Handles verification of Spotify tasks: artist follows, playlist follows
 */

export function registerSpotifyTaskRoutes(app: Express) {
  
  /**
   * POST /api/tasks/verify/spotify/follow-artist
   * Verify user follows an artist on Spotify
   */
  app.post('/api/tasks/verify/spotify/follow-artist', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { artistId, taskCompletionId } = req.body;
      
      if (!artistId) {
        return res.status(400).json({ error: 'artistId is required' });
      }
      
      console.log('[Spotify Verify] Artist follow verification requested:', {
        userId,
        artistId,
        taskCompletionId
      });
      
      // Verify the follow
      const result = await verifySpotifyFollowArtist(userId, artistId);
      
      // Update task completion if provided
      if (taskCompletionId && result.verified) {
        await updateTaskCompletion(taskCompletionId, result, 'api_poll');
      }
      
      res.json({
        success: result.verified,
        verified: result.verified,
        message: result.message,
        proof: result.proof,
        error: result.error
      });
    } catch (error) {
      console.error('[Spotify Verify] Artist follow verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Spotify artist follow',
        message: String(error)
      });
    }
  });
  
  /**
   * POST /api/tasks/verify/spotify/follow-playlist
   * Verify user follows a playlist on Spotify
   */
  app.post('/api/tasks/verify/spotify/follow-playlist', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { playlistId, taskCompletionId } = req.body;
      
      if (!playlistId) {
        return res.status(400).json({ error: 'playlistId is required' });
      }
      
      console.log('[Spotify Verify] Playlist follow verification requested:', {
        userId,
        playlistId,
        taskCompletionId
      });
      
      // Verify the follow
      const result = await verifySpotifyFollowPlaylist(userId, playlistId);
      
      // Update task completion if provided
      if (taskCompletionId && result.verified) {
        await updateTaskCompletion(taskCompletionId, result, 'api_poll');
      }
      
      res.json({
        success: result.verified,
        verified: result.verified,
        message: result.message,
        proof: result.proof,
        error: result.error
      });
    } catch (error) {
      console.error('[Spotify Verify] Playlist follow verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify Spotify playlist follow',
        message: String(error)
      });
    }
  });
}

