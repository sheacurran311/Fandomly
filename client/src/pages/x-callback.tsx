import { useEffect } from "react";
import { TwitterSDKManager } from "@/lib/twitter";

export default function XCallback() {
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      console.log('[X-Callback] Starting Twitter OAuth callback processing...');
      console.log('[X-Callback] URL search params:', window.location.search);
      console.log('[X-Callback] Has opener window:', !!(window as any).opener);
      
      const result = await TwitterSDKManager.handleCallbackFromWindow();
      console.log('[X-Callback] handleCallbackFromWindow result:', result);

      if ((window as any).opener) {
        try {
          console.log('[X-Callback] Posting result to opener:', result);
          (window as any).opener.postMessage({ type: "twitter-oauth-result", result }, window.location.origin);
          (window as any).opener.twitterCallbackData = result; // fallback
          console.log('[X-Callback] Posted to opener, closing popup...');
        } catch (error) {
          console.error('[X-Callback] Error posting to opener:', error);
        }
        window.close();
        return;
      }

      if (!mounted) return;
      // Not a popup: minimal UX – navigate user back to dashboards based on state
      try {
        const state = result.state || "";
        if (state.includes("_creator_")) {
          window.location.replace("/creator-dashboard/social");
        } else if (state.includes("_fan_")) {
          window.location.replace("/fan-dashboard/social");
        } else {
          window.location.replace("/");
        }
      } catch {
        window.location.replace("/");
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark-bg flex items-center justify-center">
      <div className="text-white">Processing X authorization…</div>
    </div>
  );
}


