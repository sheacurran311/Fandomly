/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task } from '@shared/schema';
import {
  ExternalLink,
  CheckCircle2,
  Heart,
  UserPlus,
  Share2,
  ImageIcon,
  Hash,
  Copy,
  MessageSquare,
} from 'lucide-react';
import TaskCompletionModalLayout, { ModalHint, ProofSection } from '../TaskCompletionModalLayout';
import { invalidateTaskCompletionQueries } from '@/hooks/useTaskCompletion';
import { getTaskVerificationInfo } from '@shared/taskTemplates';

interface TikTokTaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: string;
}

export default function TikTokTaskCompletionModal({
  task,
  onClose,
  onSuccess,
  completionId,
}: TikTokTaskCompletionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const settings = task.customSettings as any;
  const taskType = task.taskType as string;

  // Determine verification tier for this task type
  const verificationInfo = useMemo(() => getTaskVerificationInfo(taskType), [taskType]);
  const isT2 = verificationInfo.tier === 'T2';

  // For T2 tasks, extract hashtags or generate a verification code
  const requiredHashtags: string[] = settings?.requiredHashtags || [];
  const verificationCode = useMemo(() => {
    if (!isT2) return '';
    // Generate a simple unique code for comment tasks
    if (taskType === 'tiktok_comment' || taskType === 'tiktok_comment_code') {
      return settings?.requiredText || `FAN-${task.id.slice(0, 6).toUpperCase()}`;
    }
    // For post tasks, use hashtags
    return '';
  }, [isT2, taskType, task.id, settings?.requiredText]);

  // Submit task completion mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('platform', 'tiktok');
      formData.append('taskType', task.taskType || '');
      formData.append('proofUrl', proofUrl);
      formData.append('targetData', JSON.stringify(settings));

      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const endpoint = completionId
        ? `/api/task-completions/${completionId}/verify`
        : `/api/tasks/${task.id}/complete`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all task completion related queries across the app
      invalidateTaskCompletionQueries(queryClient);

      toast({
        title: 'Task Submitted!',
        description: data.verified ? 'Your task has been verified' : 'Your task is being reviewed',
      });

      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Get task-specific content
  const getTaskContent = () => {
    const username = settings?.username;
    const videoUrl = settings?.videoUrl || settings?.contentUrl;
    const profileUrl = username ? `https://tiktok.com/@${username.replace('@', '')}` : null;

    switch (taskType) {
      case 'tiktok_follow':
        return {
          icon: <UserPlus className="h-5 w-5" />,
          title: 'Follow on TikTok',
          description: username
            ? `Follow @${username.replace('@', '')} to complete this task`
            : 'Follow the required account on TikTok',
          targetUrl: profileUrl,
          actionText: `Follow @${username?.replace('@', '') || 'account'}`,
        };

      case 'tiktok_like':
        return {
          icon: <Heart className="h-5 w-5" />,
          title: 'Like TikTok Video',
          description: 'Like the specified video to earn points',
          targetUrl: videoUrl,
          actionText: 'Open Video to Like',
        };

      case 'tiktok_share':
        return {
          icon: <Share2 className="h-5 w-5" />,
          title: 'Share TikTok Video',
          description: 'Share the specified video',
          targetUrl: videoUrl,
          actionText: 'Open Video to Share',
        };

      case 'tiktok_comment':
      case 'tiktok_comment_code':
        return {
          icon: <MessageSquare className="h-5 w-5" />,
          title: 'Comment on Video',
          description: verificationCode
            ? `Leave a comment including "${verificationCode}" on the specified video`
            : 'Leave a comment on the specified video',
          targetUrl: videoUrl,
          actionText: 'Open Video to Comment',
        };

      case 'tiktok_post':
        return {
          icon: <Hash className="h-5 w-5" />,
          title: 'Create TikTok Post',
          description:
            requiredHashtags.length > 0
              ? `Create a TikTok post with ${requiredHashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(', ')}`
              : 'Create a TikTok post about this creator',
          targetUrl: `https://tiktok.com/upload`,
          actionText: 'Create TikTok Post',
        };

      default:
        return {
          icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          ),
          title: 'Complete TikTok Task',
          description: task.description || 'Complete the required TikTok action',
          targetUrl: videoUrl || profileUrl,
          actionText: 'Open TikTok',
        };
    }
  };

  const content = getTaskContent();

  return (
    <TaskCompletionModalLayout
      platform="tiktok"
      icon={content.icon}
      taskName={content.title}
      taskDescription={content.description}
      pointsReward={task.pointsToReward || 0}
      steps={[{ label: 'Action' }, { label: 'Proof' }, { label: 'Submit' }]}
      currentStep={screenshotFile || proofUrl ? 2 : 0}
      onCancel={onClose}
      onSubmit={() => submitMutation.mutate()}
      submitLabel="Submit Task"
      isSubmitting={submitMutation.isPending}
      canSubmit={!!proofUrl || !!screenshotFile}
    >
      {/* Action Button */}
      {content.targetUrl && (
        <Button
          onClick={() => window.open(content.targetUrl!, '_blank')}
          className="w-full bg-cyan-400 hover:bg-cyan-500 text-black font-semibold"
          size="lg"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {content.actionText}
        </Button>
      )}

      {/* T2: Code/Hashtag verification */}
      {isT2 &&
        (taskType === 'tiktok_comment' || taskType === 'tiktok_comment_code') &&
        verificationCode && (
          <ProofSection title="Verification Code">
            <div className="space-y-2">
              <p className="text-xs text-white/50">Include this code in your comment:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 font-mono text-sm">
                  {verificationCode}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cyan-400 hover:text-white hover:bg-cyan-400/20"
                  onClick={() => {
                    navigator.clipboard.writeText(verificationCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                >
                  {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </ProofSection>
        )}

      {isT2 && taskType === 'tiktok_post' && requiredHashtags.length > 0 && (
        <ProofSection title="Required Hashtags">
          <div className="space-y-2">
            <p className="text-xs text-white/50">Include these hashtags in your TikTok post:</p>
            <div className="flex flex-wrap gap-2">
              {requiredHashtags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-sm font-medium"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        </ProofSection>
      )}

      {/* Proof URL (always shown for T2 tasks — needed for verification) */}
      {isT2 && (
        <ProofSection title="Your TikTok Link">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">
              {taskType === 'tiktok_post'
                ? 'Link to your TikTok post'
                : 'Link to the video you commented on'}
            </Label>
            <Input
              placeholder="https://tiktok.com/@username/video/..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </ProofSection>
      )}

      {/* T3: Screenshot Upload (for follow, like, share — manual verification) */}
      {!isT2 && (
        <ProofSection title="Upload Proof">
          <div className="space-y-3">
            <Label className="text-xs text-white/50">Screenshot (recommended)</Label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-white/10 hover:border-cyan-400/30 bg-white/[0.02] hover:bg-cyan-400/5 cursor-pointer transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {screenshotFile ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{screenshotFile.name}</span>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-white/20" />
                  <span className="text-sm text-white/40">Click to upload screenshot</span>
                  <span className="text-xs text-white/20">PNG, JPG up to 10MB</span>
                </>
              )}
            </label>

            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">TikTok Video URL (if applicable)</Label>
              <Input
                placeholder="https://tiktok.com/@username/video/..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
          </div>
        </ProofSection>
      )}

      {/* Verification notice */}
      <ModalHint>
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {isT2
            ? 'Your submission will be automatically verified using the code or hashtag you included.'
            : 'TikTok uses smart detection. Your submission will be automatically verified or reviewed by the creator.'}
        </span>
      </ModalHint>
    </TaskCompletionModalLayout>
  );
}
