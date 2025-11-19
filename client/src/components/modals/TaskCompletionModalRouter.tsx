import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Task } from "@shared/schema";
import TwitterTaskCompletionModal from "./twitter/TwitterTaskCompletionModal";
import InstagramTaskCompletionModal from "./instagram/InstagramTaskCompletionModal";
import YouTubeTaskCompletionModal from "./youtube/YouTubeTaskCompletionModal";
import TikTokTaskCompletionModal from "./tiktok/TikTokTaskCompletionModal";
import PollQuizCompletionModal from "./interactive/PollQuizCompletionModal";
import WebsiteVisitCompletionModal from "./interactive/WebsiteVisitCompletionModal";
import GenericTaskCompletionModal from "./GenericTaskCompletionModal";

interface TaskCompletionModalRouterProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  completionId?: number;
}

/**
 * Router component that displays the appropriate task completion modal
 * based on the platform and task type
 */
export default function TaskCompletionModalRouter({
  task,
  isOpen,
  onClose,
  onSuccess,
  completionId,
}: TaskCompletionModalRouterProps) {

  // Route to platform-specific modal
  const renderModal = () => {
    const platform = task.platform?.toLowerCase();
    const taskType = task.taskType?.toLowerCase();

    // Sprint 4: Interactive task routing
    if (platform === 'interactive') {
      if (taskType === 'poll' || taskType === 'quiz') {
        return (
          <PollQuizCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );
      }

      if (taskType === 'website_visit') {
        return (
          <WebsiteVisitCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );
      }
    }

    switch (platform) {
      case 'twitter':
      case 'x':
        return (
          <TwitterTaskCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );

      case 'instagram':
        return (
          <InstagramTaskCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );

      case 'youtube':
        return (
          <YouTubeTaskCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );

      case 'tiktok':
        return (
          <TikTokTaskCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );

      case 'facebook':
      case 'spotify':
      case 'twitch':
      case 'discord':
        // Platforms without API verification - use generic modal
        return (
          <GenericTaskCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
            platform={platform}
          />
        );

      default:
        // Fallback for non-social tasks (check-in, referral, profile, etc.)
        return (
          <GenericTaskCompletionModal
            task={task}
            onClose={onClose}
            onSuccess={onSuccess}
            completionId={completionId}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {renderModal()}
      </DialogContent>
    </Dialog>
  );
}
