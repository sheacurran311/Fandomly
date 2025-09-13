import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function MetaGraphDebugger() {
  const { user, isAuthenticated } = useAuth();
  const [accessToken, setAccessToken] = useState("");
  const [path, setPath] = useState("/me");
  const [method, setMethod] = useState<"GET" | "POST" | "DELETE" | "PUT">("GET");
  const [params, setParams] = useState("{ \"fields\": \"id,name\" }");
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const callEndpoint = async (endpoint: string, qs?: string) => {
    if (!isAuthenticated || !user) {
      setResponse("Please sign in first.");
      return;
    }
    setLoading(true);
    try {
      const url = qs ? `${endpoint}?${qs}` : endpoint;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-dynamic-user-id": user.dynamicUserId,
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        credentials: "include",
      });
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setResponse(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const callPassthrough = async () => {
    if (!isAuthenticated || !user) {
      setResponse("Please sign in first.");
      return;
    }
    setLoading(true);
    try {
      let parsed: any = {};
      try { parsed = params ? JSON.parse(params) : {}; } catch (e) { parsed = {}; }
      const res = await fetch('/api/facebook/graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dynamic-user-id': user.dynamicUserId,
        },
        body: JSON.stringify({ path, method, params: parsed, accessToken })
      });
      const json = await res.json();
      setResponse(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setResponse(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">Meta Graph API Debugger</h1>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Access Token</label>
              <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Paste a Page or User token" className="bg-white/10 text-white border-white/20" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => callEndpoint('/api/facebook/me', `fields=id,name`)} disabled={loading || !accessToken}>/me</Button>
              <Button variant="secondary" onClick={() => callEndpoint('/api/facebook/accounts')} disabled={loading || !accessToken}>/me/accounts</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Generic Passthrough</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-300 mb-1">Path</label>
                <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/me" className="bg-white/10 text-white border-white/20" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="w-full bg-white/10 text-white border-white/20 rounded-md p-2 h-10">
                  <option className="text-black" value="GET">GET</option>
                  <option className="text-black" value="POST">POST</option>
                  <option className="text-black" value="PUT">PUT</option>
                  <option className="text-black" value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Params (JSON)</label>
              <Textarea value={params} onChange={(e) => setParams(e.target.value)} rows={5} className="bg-white/10 text-white border-white/20" />
            </div>
            <div className="flex gap-2">
              <Button onClick={callPassthrough} disabled={loading || !accessToken}>{loading ? 'Calling…' : 'Send'}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs md:text-sm whitespace-pre-wrap break-words text-gray-200 bg-black/30 p-3 rounded-md min-h-[200px]">{response || 'No response yet.'}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


