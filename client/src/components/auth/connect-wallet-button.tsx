import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

interface ConnectWalletButtonProps {
  className?: string;
  children?: React.ReactNode;
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