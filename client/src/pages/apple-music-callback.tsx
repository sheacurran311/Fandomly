/**
 * Apple Music Callback Page
 *
 * Unlike Spotify/Discord (redirect-based OAuth), Apple Music uses MusicKit JS
 * for inline authorization. This callback page handles edge cases where MusicKit
 * may redirect back to the app after authorization.
 *
 * In the primary flow, AppleMusicAPI.secureLogin() handles everything inline
 * and this page is only reached if the user navigates here directly.
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function AppleMusicCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If opened as a popup (from social connections flow), notify the opener
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: 'apple-music-auth-result', result: { success: true } },
          window.location.origin
        );
        window.close();
        return;
      } catch {
        // Opener may have been closed
      }
    }

    // If navigated here directly, redirect to the social connections page
    const timer = setTimeout(() => {
      setLocation('/fan-dashboard/social');
    }, 1000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Processing Apple Music connection...</p>
      </div>
    </div>
  );
}
