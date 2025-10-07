import { useEffect, useRef } from "react";
import { TwitterSDKManager } from "@/lib/twitter";

export default function XCallback() {
  const ranRef = useRef(false);
  
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let mounted = true;
    const run = async () => {
      console.log('[X-Callback] Starting Twitter OAuth callback processing...');
      console.log('[X-Callback] URL search params:', window.location.search);
      console.log('[X-Callback] Has opener window:', !!(window as any).opener);
      
      const search = new URLSearchParams(window.location.search);
      const state = search.get('state') || undefined;

      let result = await TwitterSDKManager.handleCallbackFromWindow();
      console.log('[X-Callback] handleCallbackFromWindow result:', result);

      // If duplicate-callback was blocked, try to reuse the cached success
      if (!result?.success && state) {
        try {
          const cached = sessionStorage.getItem(`tw_cb_result_${state}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.success) {
              console.log('[X-Callback] Reusing cached success result for state');
              result = parsed;
            }
          } else {
            // brief wait to allow first run to store the result
            await new Promise(r => setTimeout(r, 300));
            const cached2 = sessionStorage.getItem(`tw_cb_result_${state}`);
            if (cached2) {
              const parsed2 = JSON.parse(cached2);
              if (parsed2?.success) {
                console.log('[X-Callback] Reusing cached success result after wait');
                result = parsed2;
              }
            }
          }
        } catch {}
      }

      // Strip ?code&state after we've processed them to avoid re-trigger
      try {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      } catch {}

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


