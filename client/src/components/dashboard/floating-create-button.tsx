import { useState } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Target, Megaphone } from 'lucide-react';

interface FloatingCreateButtonProps {
  userType: 'creator' | 'fan';
}

export default function FloatingCreateButton({ userType }: FloatingCreateButtonProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (userType !== 'creator') {
    return null;
  }

  const handleCreateTask = () => {
    setIsOpen(false);
    setLocation('/creator-dashboard/tasks/create');
  };

  const handleCreateCampaign = () => {
    setIsOpen(false);
    setLocation('/creator-dashboard/campaign-builder');
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-20 right-6 z-50',
          'w-14 h-14 rounded-full',
          'shadow-2xl shadow-brand-primary/50',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'hover:scale-110 hover:shadow-brand-primary/70',
          'active:scale-95',
          'group'
        )}
        style={{
          background: 'radial-gradient(circle, #14feee, #e10698)',
        }}
        data-testid="floating-create-button"
        aria-label="Create new item"
      >
        <Plus className="h-7 w-7 text-white group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Create Options Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-brand-dark-bg border-white/10">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-xl text-center sm:text-left">
              Create New
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-center sm:text-left">
              Choose what you&apos;d like to create
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Button
              onClick={handleCreateTask}
              className={cn(
                'h-auto p-4 sm:p-6 flex items-start gap-3 sm:gap-4 bg-white/5 hover:bg-brand-primary/20',
                'border border-white/10 hover:border-brand-primary/50',
                'transition-all duration-200'
              )}
              data-testid="button-create-task"
            >
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white mb-1 text-sm sm:text-base">New Task</div>
                <div className="text-xs sm:text-sm text-gray-400 leading-snug">
                  Create a social media task for fans to complete
                </div>
              </div>
            </Button>

            <Button
              onClick={handleCreateCampaign}
              className={cn(
                'h-auto p-4 sm:p-6 flex items-start gap-3 sm:gap-4 bg-white/5 hover:bg-brand-primary/20',
                'border border-white/10 hover:border-brand-primary/50',
                'transition-all duration-200'
              )}
              data-testid="button-create-campaign"
            >
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white mb-1 text-sm sm:text-base">
                  New Campaign
                </div>
                <div className="text-xs sm:text-sm text-gray-400 leading-snug">
                  Launch a campaign with multiple tasks and rewards
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
