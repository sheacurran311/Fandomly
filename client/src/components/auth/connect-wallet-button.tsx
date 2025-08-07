import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";

interface ConnectWalletButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ConnectWalletButton({
  className = "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105",
  children = "Connect Wallet",
}: ConnectWalletButtonProps) {
  return (
    <DynamicConnectButton
      buttonClassName={className}
    >
      <div className="flex items-center justify-center w-full h-full">
        {children}
      </div>
    </DynamicConnectButton>
  );
}