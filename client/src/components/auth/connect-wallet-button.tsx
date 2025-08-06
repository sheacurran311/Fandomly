import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

interface ConnectWalletButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ConnectWalletButton({
  className = "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105",
  children = "Connect Wallet",
}: ConnectWalletButtonProps) {
  return (
    <DynamicConnectButton
      buttonClassName={className}
    >
      {children}
    </DynamicConnectButton>
  );
}