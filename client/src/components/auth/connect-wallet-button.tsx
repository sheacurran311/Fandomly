import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

interface ConnectWalletButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ConnectWalletButton({
  className,
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