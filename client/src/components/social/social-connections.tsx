import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Twitter, Facebook, Music2 } from "lucide-react";

export default function SocialConnections() {
  // Placeholder UI only; backend endpoints exist but integrations TBD
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Connect Socials</CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        <Button variant="outline" className="justify-start border-white/20 text-white"><Twitter className="h-4 w-4 mr-2"/>Connect X (Twitter)</Button>
        <Button variant="outline" className="justify-start border-white/20 text-white"><Instagram className="h-4 w-4 mr-2"/>Connect Instagram</Button>
        <Button variant="outline" className="justify-start border-white/20 text-white"><Facebook className="h-4 w-4 mr-2"/>Connect Facebook</Button>
        <Button variant="outline" className="justify-start border-white/20 text-white"><Music2 className="h-4 w-4 mr-2"/>Connect TikTok</Button>
      </CardContent>
    </Card>
  );
}


