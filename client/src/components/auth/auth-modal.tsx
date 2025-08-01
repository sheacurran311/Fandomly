import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-brand-dark-purple/90 backdrop-blur-lg border-brand-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center gradient-text">
            Connect Your Wallet
          </DialogTitle>
          <p className="text-gray-300 text-center">
            Choose your preferred authentication method to get started
          </p>
        </DialogHeader>
        <div className="mt-6">
          <DynamicWidget />
        </div>
      </DialogContent>
    </Dialog>
  );
}
