/**
 * Instagram Task Creator Component
 * 
 * Simplified creator interface for Instagram verification tasks:
 * - Comment+Nonce (automatic verification)
 * - Story Mention (automatic verification)
 * - Keyword Comment (automatic verification)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Instagram, Sparkles, MessageSquare, Camera, Hash, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InstagramTaskCreatorProps {
  creatorId: string;
  onTaskCreated?: (task: any) => void;
}

export function InstagramTaskCreator({ creatorId, onTaskCreated }: InstagramTaskCreatorProps) {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'comment' | 'mention' | 'keyword'>('comment');
  const [isCreating, setIsCreating] = useState(false);

  // Comment task state
  const [commentTitle, setCommentTitle] = useState('Comment on Instagram Post');
  const [commentDescription, setCommentDescription] = useState('Comment with your unique code on our Instagram post!');
  const [commentPoints, setCommentPoints] = useState(30);
  const [commentMediaUrl, setCommentMediaUrl] = useState('');
  const [commentMediaId, setCommentMediaId] = useState('');

  // Mention task state
  const [mentionTitle, setMentionTitle] = useState('Mention in Instagram Story');
  const [mentionDescription, setMentionDescription] = useState('Post an Instagram Story mentioning us!');
  const [mentionPoints, setMentionPoints] = useState(75);
  const [mentionHashtag, setMentionHashtag] = useState('');

  // Keyword task state
  const [keywordTitle, setKeywordTitle] = useState('Comment with Keyword');
  const [keywordDescription, setKeywordDescription] = useState('Comment with the special keyword!');
  const [keywordPoints, setKeywordPoints] = useState(30);
  const [keywordMediaUrl, setKeywordMediaUrl] = useState('');
  const [keywordMediaId, setKeywordMediaId] = useState('');
  const [keyword, setKeyword] = useState('');

  function extractInstagramMediaId(url: string): string | null {
    // Extract media ID from Instagram URL
    // Format: https://www.instagram.com/p/MEDIA_ID/ or https://www.instagram.com/reel/MEDIA_ID/
    const match = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[2] : null;
  }

  async function handleCreateCommentTask() {
    if (!commentMediaUrl.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide an Instagram post URL',
        variant: 'destructive'
      });
      return;
    }

    const mediaId = extractInstagramMediaId(commentMediaUrl) || commentMediaId;
    if (!mediaId) {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid Instagram post URL',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/tasks/instagram/comment-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: commentTitle,
          description: commentDescription,
          rewardPoints: commentPoints,
          mediaId,
          mediaUrl: commentMediaUrl
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const data = await response.json();
      
      toast({
        title: '✅ Task Created!',
        description: 'Your comment task is now live. Fans will comment with unique codes for automatic verification.'
      });

      onTaskCreated?.(data.task);

      // Reset form
      setCommentMediaUrl('');
      setCommentMediaId('');

    } catch (error) {
      console.error('Error creating comment task:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateMentionTask() {
    setIsCreating(true);

    try {
      const response = await fetch('/api/tasks/instagram/mention-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: mentionTitle,
          description: mentionDescription,
          rewardPoints: mentionPoints,
          requireHashtag: mentionHashtag || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const data = await response.json();
      
      toast({
        title: '✅ Task Created!',
        description: 'Your Story mention task is now live. Fans will mention you in Stories for automatic verification.'
      });

      onTaskCreated?.(data.task);

      // Reset form
      setMentionHashtag('');

    } catch (error) {
      console.error('Error creating mention task:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateKeywordTask() {
    if (!keywordMediaUrl.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide an Instagram post URL',
        variant: 'destructive'
      });
      return;
    }

    if (!keyword.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a keyword',
        variant: 'destructive'
      });
      return;
    }

    const mediaId = extractInstagramMediaId(keywordMediaUrl) || keywordMediaId;
    if (!mediaId) {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid Instagram post URL',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/tasks/instagram/keyword-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: keywordTitle,
          description: keywordDescription,
          rewardPoints: keywordPoints,
          mediaId,
          mediaUrl: keywordMediaUrl,
          keyword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      const data = await response.json();
      
      toast({
        title: '✅ Task Created!',
        description: `Your keyword task is now live. Fans will comment "${keyword}" for automatic verification.`
      });

      onTaskCreated?.(data.task);

      // Reset form
      setKeywordMediaUrl('');
      setKeywordMediaId('');
      setKeyword('');

    } catch (error) {
      console.error('Error creating keyword task:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-white">Create Instagram Task</CardTitle>
            <CardDescription>Set up automatic verification for Instagram engagement</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="comment" className="data-[state=active]:bg-pink-500/20">
              <MessageSquare className="w-4 h-4 mr-2" />
              Comment
            </TabsTrigger>
            <TabsTrigger value="mention" className="data-[state=active]:bg-pink-500/20">
              <Camera className="w-4 h-4 mr-2" />
              Story
            </TabsTrigger>
            <TabsTrigger value="keyword" className="data-[state=active]:bg-pink-500/20">
              <Hash className="w-4 h-4 mr-2" />
              Keyword
            </TabsTrigger>
          </TabsList>

          {/* Comment + Nonce Task */}
          <TabsContent value="comment" className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <strong>Comment + Unique Code:</strong> Each fan gets a unique code (like FDY-8K27) to comment. Automatic verification via webhook!
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Task Title</Label>
                <Input
                  value={commentTitle}
                  onChange={(e) => setCommentTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Description</Label>
                <Input
                  value={commentDescription}
                  onChange={(e) => setCommentDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Instagram Post URL</Label>
                <Input
                  value={commentMediaUrl}
                  onChange={(e) => setCommentMediaUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/ABC123..."
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  The Instagram post where fans will comment
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Points Reward</Label>
                <Input
                  type="number"
                  value={commentPoints}
                  onChange={(e) => setCommentPoints(parseInt(e.target.value) || 30)}
                  min={1}
                  max={1000}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <Button
                onClick={handleCreateCommentTask}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Comment Task
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Story Mention Task */}
          <TabsContent value="mention" className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                <strong>Story Mention:</strong> Fans post Stories mentioning you. Automatic verification via webhook (max 3 per fan per day).
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Task Title</Label>
                <Input
                  value={mentionTitle}
                  onChange={(e) => setMentionTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Description</Label>
                <Input
                  value={mentionDescription}
                  onChange={(e) => setMentionDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Required Hashtag (Optional)</Label>
                <Input
                  value={mentionHashtag}
                  onChange={(e) => setMentionHashtag(e.target.value)}
                  placeholder="#YourHashtag"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  Require fans to include a specific hashtag in their Story
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Points Reward</Label>
                <Input
                  type="number"
                  value={mentionPoints}
                  onChange={(e) => setMentionPoints(parseInt(e.target.value) || 75)}
                  min={1}
                  max={1000}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <Button
                onClick={handleCreateMentionTask}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Create Mention Task
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Keyword Comment Task */}
          <TabsContent value="keyword" className="space-y-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <strong>Keyword Comment:</strong> All fans use the same keyword. Good for campaigns but less fraud-resistant than unique codes.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Task Title</Label>
                <Input
                  value={keywordTitle}
                  onChange={(e) => setKeywordTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Description</Label>
                <Input
                  value={keywordDescription}
                  onChange={(e) => setKeywordDescription(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Instagram Post URL</Label>
                <Input
                  value={keywordMediaUrl}
                  onChange={(e) => setKeywordMediaUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/ABC123..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Keyword</Label>
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., #Fandomly2025 or LOVE"
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-xs text-gray-400">
                  The keyword fans must include in their comment
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Points Reward</Label>
                <Input
                  type="number"
                  value={keywordPoints}
                  onChange={(e) => setKeywordPoints(parseInt(e.target.value) || 30)}
                  min={1}
                  max={1000}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <Button
                onClick={handleCreateKeywordTask}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Task...
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4 mr-2" />
                    Create Keyword Task
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-white/10">
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300 text-sm">
              <strong>✨ Automatic Verification:</strong> All Instagram tasks use webhook verification. No manual approval needed!
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}

