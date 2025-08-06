import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConnectWalletButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ConnectWalletButton({
  className,
  children = "Connect Wallet",
  variant = "default",
  size = "default"
}: ConnectWalletButtonProps) {
  const { setShowAuthFlow, user } = useDynamicContext();

  const handleConnect = () => {
    if (user) {
      // User is already connected
      return;
    }
    setShowAuthFlow(true);
  };

  const defaultClassName = "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105";

  return (
    <Button
      onClick={handleConnect}
      className={cn(defaultClassName, className)}
      variant={variant}
      size={size}
    >
      {children}
    </Button>
  );
}