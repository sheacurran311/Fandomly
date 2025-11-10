/**
 * Instagram Task Card Component
 * 
 * Displays Instagram tasks (comment+nonce, story mention) with:
 * - Task instructions
 * - Nonce code display (for comment tasks)
 * - "Open Instagram" button
 * - Auto-refresh verification status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Instagram, ExternalLink, Copy, CheckCircle, Clock, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { InstagramUsernameModal, useInstagramUsername } from './instagram-username-modal';
import { cn } from '@/lib/utils';

interface InstagramTaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    taskType: 'comment_code' | 'mention_story' | 'keyword_comment';
    pointsReward: number;
    status: string;
    expiresAt?: string;
    requirements?: {
      mediaUrl?: string;
      mediaId?: string;
      keyword?: string;
      creatorUsername?: string;
      requireHashtag?: string;
    };
  };
  onComplete?: () => void;
}

export function InstagramTaskCard({ task, onComplete }: InstagramTaskCardProps) {
  const { username, isConnected, refresh: refreshUsername } = useInstagramUsername();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskVerified, setTaskVerified] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copiedNonce, setCopiedNonce] = useState(false);

  // Poll for task completion
  useEffect(() => {
    if (taskStarted && !taskCompleted) {
      const interval = setInterval(() => {
        checkTaskStatus();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [taskStarted, taskCompleted]);

  // Check initial task status
  useEffect(() => {
    checkTaskStatus();
  }, []);

  async function checkTaskStatus() {
    try {
      setIsChecking(true);
      const response = await fetch(`/api/tasks/instagram/${task.id}/status`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTaskStarted(data.started);
        setTaskCompleted(data.completed);
        setTaskVerified(data.verified);
        
        if (data.nonce) {
          setNonce(data.nonce);
        }

        if (data.completed && data.verified) {
          onComplete?.();
        }
      }
    } catch (err) {
      console.error('Error checking task status:', err);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleStartTask() {
    // Check if username is saved
    if (!isConnected) {
      setShowUsernameModal(true);
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/instagram/${task.id}/start`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'Instagram username required') {
          setShowUsernameModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to start task');
      }

      const data = await response.json();
      setTaskStarted(true);
      setNonce(data.nonce);
      setInstructions(data.instructions);

      console.log('[Instagram Task] Started:', data);

    } catch (err) {
      console.error('Error starting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to start task');
    } finally {
      setIsStarting(false);
    }
  }

  function handleCopyNonce() {
    if (nonce) {
      navigator.clipboard.writeText(nonce);
      setCopiedNonce(true);
      setTimeout(() => setCopiedNonce(false), 2000);
    }
  }

  function handleOpenInstagram() {
    if (task.requirements?.mediaUrl) {
      window.open(task.requirements.mediaUrl, '_blank');
    }
  }

  function getTaskIcon() {
    switch (task.taskType) {
      case 'comment_code':
        return '💬';
      case 'mention_story':
        return '📸';
      case 'keyword_comment':
        return '🔖';
      default:
        return '✨';
    }
  }

  function getTaskTypeLabel() {
    switch (task.taskType) {
      case 'comment_code':
        return 'Comment Task';
      case 'mention_story':
        return 'Story Mention';
      case 'keyword_comment':
        return 'Keyword Comment';
      default:
        return 'Instagram Task';
    }
  }

  return (
    <>
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-pink-500/30 transition-all">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{getTaskIcon()}</div>
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  {task.title}
                  {taskCompleted && (
                    <Badge variant="success" className="ml-2">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {taskStarted && !taskCompleted && (
                    <Badge variant="secondary" className="ml-2">
                      <Clock className="w-3 h-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-400 flex items-center gap-2 mt-1">
                  <Instagram className="w-3 h-3" />
                  {getTaskTypeLabel()}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                +{task.pointsReward}
              </div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-300">{task.description}</p>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {taskCompleted && taskVerified ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400">
                <strong>Task Verified!</strong> Your points have been awarded.
              </AlertDescription>
            </Alert>
          ) : taskStarted ? (
            <div className="space-y-4">
              {/* Nonce Code Display (for comment tasks) */}
              {task.taskType === 'comment_code' && nonce && (
                <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Your Verification Code</span>
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/40 rounded px-4 py-3">
                      <code className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 tracking-wider">
                        {nonce}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyNonce}
                      className="flex-shrink-0"
                    >
                      {copiedNonce ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">📝 Instructions</h4>
                <ol className="space-y-2 text-sm text-gray-300">
                  {task.taskType === 'comment_code' && (
                    <>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">1.</span>
                        <span>Copy your unique code above</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">2.</span>
                        <span>Click "Open Instagram Post" below</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">3.</span>
                        <span>Comment <strong>exactly</strong>: <code className="bg-black/40 px-2 py-1 rounded text-pink-400">{nonce}</code></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">4.</span>
                        <span>Come back here - we'll verify automatically! ✨</span>
                      </li>
                    </>
                  )}
                  {task.taskType === 'mention_story' && (
                    <>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">1.</span>
                        <span>Open Instagram app</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">2.</span>
                        <span>Create a Story post</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">3.</span>
                        <span>Mention <strong>@{task.requirements?.creatorUsername}</strong></span>
                      </li>
                      {task.requirements?.requireHashtag && (
                        <li className="flex gap-2">
                          <span className="text-blue-400 font-bold">4.</span>
                          <span>Include <strong>{task.requirements.requireHashtag}</strong></span>
                        </li>
                      )}
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">{task.requirements?.requireHashtag ? '5' : '4'}.</span>
                        <span>We'll verify automatically when your Story is live! ✨</span>
                      </li>
                    </>
                  )}
                </ol>
              </div>

              {/* Checking Status */}
              {isChecking && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking verification status...</span>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex gap-2">
          {taskCompleted && taskVerified ? (
            <Button disabled className="flex-1" variant="outline">
              <CheckCircle className="w-4 h-4 mr-2" />
              Task Complete
            </Button>
          ) : taskStarted ? (
            <>
              <Button
                onClick={handleOpenInstagram}
                className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
              >
                <Instagram className="w-4 h-4 mr-2" />
                Open Instagram {task.taskType === 'comment_code' ? 'Post' : 'App'}
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
              <Button
                onClick={checkTaskStatus}
                variant="outline"
                size="icon"
                disabled={isChecking}
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleStartTask}
              disabled={isStarting}
              className="flex-1"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Task
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Instagram Username Modal */}
      <InstagramUsernameModal
        open={showUsernameModal}
        onOpenChange={setShowUsernameModal}
        onSuccess={() => {
          refreshUsername();
          setShowUsernameModal(false);
          // Auto-start task after username saved
          setTimeout(() => handleStartTask(), 500);
        }}
        required={true}
      />
    </>
  );
}

