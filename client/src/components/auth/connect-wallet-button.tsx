import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

interface ConnectWalletButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function ConnectWalletButton({
  className,
  children,
}: ConnectWalletButtonProps) {
  return (
    <div className={className}>
      <DynamicWidget />
    </div>
  );
}