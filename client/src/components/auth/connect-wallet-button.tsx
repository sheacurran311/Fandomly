import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@/components/ui/button";

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

  return (
    <Button
      onClick={handleConnect}
      className={className}
      variant={variant}
      size={size}
    >
      {children}
    </Button>
  );
}