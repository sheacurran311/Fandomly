import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { ReactNode } from "react";

interface ConnectWalletButtonProps {
  children?: ReactNode;
  className?: string;
}

export default function ConnectWalletButton({ children, className }: ConnectWalletButtonProps) {
  const ButtonContent = () => (
    <span className="flex items-center justify-center w-full h-full text-white font-medium">
      {children || "Connect Wallet"}
    </span>
  );

  return (
    <div className={className || "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"}>
      <DynamicWidget 
        variant="modal"
        buttonClassName="w-full !bg-transparent !border-none !text-white !font-medium !p-0 !rounded-none hover:!bg-transparent"
        innerButtonComponent={ButtonContent}
      />
    </div>
  );
}