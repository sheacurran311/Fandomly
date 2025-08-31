import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { ReactNode } from "react";

interface ConnectWalletButtonProps {
  children?: ReactNode;
  className?: string;
  text?: string;
}

export default function ConnectWalletButton({ children, className, text }: ConnectWalletButtonProps) {
  // Dynamic widget handles all authentication - no custom email verification
  // All customizations should be done in Dynamic admin dashboard
  return (
    <DynamicWidget 
      buttonClassName={className || "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"}
    />
  );
}