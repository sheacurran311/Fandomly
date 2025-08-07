import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
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
  const defaultClassName = "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105";

  return (
    <div className={cn(defaultClassName, className)}>
      <DynamicConnectButton>
        <div className="w-full h-full flex items-center justify-center">
          {children}
        </div>
      </DynamicConnectButton>
    </div>
  );
}