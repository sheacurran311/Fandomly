import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

type FBProfile = { id: string; name: string; email?: string; picture?: any } | null;

export default function FacebookLoginFan() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("Idle");
  const [token, setToken] = useState<string>("");
  const [profile, setProfile] = useState<FBProfile>(null);
  const [saved, setSaved] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.getLoginStatus((response) => {
        setStatus(response.status);
        if (response.status === 'connected' && response.authResponse) {
          setToken(response.authResponse.accessToken);
        }
      });
    }
  }, []);

  const ensureFanApp = async () => {
    const fanAppId = (window as any).__FB_DEFAULTS__?.FAN_APP_ID || '4233782626946744';
    const reinit = (window as any).reinitializeFacebookApp;
    if (reinit) {
      reinit(fanAppId);
      await new Promise(r => setTimeout(r, 150));
    }
  };

  const loginFan = async () => {
    await ensureFanApp();
    setStatus('Connecting…');
    window.FB.login((response: any) => {
      setStatus(response.status);
      if (response.status === 'connected') {
        setToken(response.authResponse.accessToken);
        fetchMe();
      }
    }, { scope: 'public_profile,email' });
  };

  const fetchMe = () => {
    window.FB.api('/me', 'GET', { fields: 'id,name,email,picture' }, function(res: any) {
      setProfile(res && !res.error ? { id: res.id, name: res.name, email: res.email, picture: res.picture } : null);
    });
  };

  const saveToBackend = async () => {
    if (!user) {
      alert('Sign in first.');
      return;
    }
    try {
      const payload = {
        userId: user.id,
        facebookData: {
          id: profile?.id,
          name: profile?.name,
          email: profile?.email,
          picture: profile?.picture?.data?.url,
          importedAt: new Date().toISOString()
        }
      };
      const res = await fetch('/api/auth/facebook-profile-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      setSaved(json);
      alert('Saved fan Facebook profile');
    } catch (e: any) {
      alert('Failed to save: ' + (e?.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">Facebook Login (Fan)</h1>
        <p className="text-gray-300">Fans connect with minimal scopes. We store basic profile only (no photos import).</p>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={loginFan}>Connect with Facebook (Fan)</Button>
              <Button variant="secondary" disabled={!profile} onClick={saveToBackend}>Save Profile</Button>
            </div>
            <div className="text-sm text-gray-300">Status: <span className="text-white">{status}</span></div>
            <div className="text-xs text-gray-400 break-words">Token: {token ? `${token.slice(0, 10)}…` : '—'}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-words text-gray-200 bg-black/30 p-3 rounded-md min-h-[100px]">{JSON.stringify(profile, null, 2) || '—'}</pre>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-words text-gray-200 bg-black/30 p-3 rounded-md min-h-[100px]">{saved ? JSON.stringify(saved, null, 2) : '—'}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


