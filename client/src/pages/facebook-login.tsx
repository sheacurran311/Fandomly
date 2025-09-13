import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type FBUser = { id: string; name: string; email?: string } | null;
type FBPage = {
  id: string;
  name: string;
  access_token?: string;
  followers_count?: number;
  fan_count?: number;
};

export default function FacebookLogin() {
  const [status, setStatus] = useState<string>("Idle");
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<FBUser>(null);
  const [pages, setPages] = useState<FBPage[]>([]);
  const [currentAppId, setCurrentAppId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.getLoginStatus((response) => {
        setStatus(response.status);
        if (response.status === 'connected' && response.authResponse) {
          setToken(response.authResponse.accessToken);
        }
      });
      setCurrentAppId((window as any).__FB_CURRENT_APP_ID__ || "");
    }
  }, []);

  const ensureAppId = async (appId: string) => {
    try {
      const reinit = (window as any).reinitializeFacebookApp;
      if (reinit) {
        reinit(appId);
        // small delay to allow SDK to settle
        await new Promise(r => setTimeout(r, 150));
        setCurrentAppId((window as any).__FB_CURRENT_APP_ID__ || "");
        return (window as any).__FB_CURRENT_APP_ID__ === appId;
      }
    } catch {}
    return false;
  };

  const fetchMe = () => {
    window.FB.api('/me', 'GET', { fields: 'id,name,email' }, function(res: any) {
      setUser(res && !res.error ? { id: res.id, name: res.name, email: res.email } : null);
    });
  };

  const fetchPages = () => {
    window.FB.api('/me/accounts', 'GET', {
      fields: 'id,name,access_token,followers_count,fan_count,instagram_business_account'
    }, function(res: any) {
      if (res && res.data && !res.error) setPages(res.data as FBPage[]);
      else setPages([]);
    });
  };

  const loginFan = () => {
    // Ensure SDK is initialized with Fan App ID
    if (typeof window !== 'undefined' && (window as any).reinitializeFacebookApp && (window as any).__FB_DEFAULTS__) {
      (window as any).reinitializeFacebookApp((window as any).__FB_DEFAULTS__.FAN_APP_ID);
    }
    setStatus('Connecting…');
    window.FB.login((response: any) => {
      setStatus(response.status);
      if (response.status === 'connected') {
        setToken(response.authResponse.accessToken);
        fetchMe();
      }
    }, { scope: 'public_profile,email' });
  };

  const loginCreator = async () => {
    // Ensure SDK is initialized with Creator App ID
    const creatorAppId = (window as any).__FB_DEFAULTS__?.CREATOR_APP_ID;
    if (creatorAppId) {
      await ensureAppId(creatorAppId);
    }
    setStatus('Connecting…');
    window.FB.login((response: any) => {
      setStatus(response.status);
      if (response.status === 'connected') {
        setToken(response.authResponse.accessToken);
        fetchMe();
        fetchPages();
      }
    }, { scope: 'public_profile,email,pages_show_list,pages_read_engagement,business_management,instagram_basic' });
  };

  const logout = () => {
    window.FB.logout(() => {
      setStatus('disconnected');
      setToken('');
      setUser(null);
      setPages([]);
    });
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">Facebook Login (Minimal)</h1>
        <p className="text-gray-300">Simple end-to-end with the JS SDK. Fans: no photo import. Creators: Page access via /me/accounts.</p>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={loginFan}>Connect with Facebook (Fan)</Button>
              <Button onClick={loginCreator} variant="secondary">Connect with Facebook (Creator)</Button>
              <Button onClick={logout} variant="ghost">Logout</Button>
            </div>
            <div className="text-sm text-gray-300">Status: <span className="text-white">{status}</span></div>
            <div className="text-xs text-gray-400">Current App ID: <span className="text-white">{currentAppId || '—'}</span></div>
            <div className="text-xs text-gray-400 break-words">Token: {token ? `${token.slice(0, 10)}…` : '—'}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">User</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-words text-gray-200 bg-black/30 p-3 rounded-md min-h-[100px]">{JSON.stringify(user, null, 2) || '—'}</pre>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Creator Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pages.length}
                onClick={async () => {
                  try {
                    const mapped = pages.map((p) => ({
                      id: p.id,
                      name: p.name,
                      access_token: (p as any).access_token,
                      followers_count: p.followers_count,
                      fan_count: p.fan_count,
                      instagram_business_account: (p as any).instagram_business_account
                    }));
                    // You likely want the current creatorId from backend; for now, fetch by dynamic user backref
                    // Get creator by current user
                    const meRes = await fetch('/api/auth/user/' + (window as any).dynamicUserId, { credentials: 'include' });
                    const me = await meRes.json();
                    const creatorId = me?.creator?.id || me?.id;
                    await fetch(`/api/creators/${creatorId}/facebook-pages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        pages: mapped.map(p => ({
                          id: p.id,
                          name: p.name,
                          access_token: p.access_token,
                          followers_count: p.followers_count,
                          fan_count: p.fan_count,
                          instagram_business_account: p.instagram_business_account
                        }))
                      })
                    });
                    alert('Saved pages to backend');
                  } catch (e: any) {
                    alert('Failed to save pages: ' + (e?.message || 'Unknown error'));
                  }
                }}
              >
                Save Pages to Backend
              </Button>
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words text-gray-2 00 bg-black/30 p-3 rounded-md min-h-[100px]">{pages.length ? JSON.stringify(pages, null, 2) : '—'}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


