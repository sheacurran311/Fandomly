import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ReactNode } from "react";

interface ConnectWalletButtonProps {
  children?: ReactNode;
  className?: string;
  text?: string;
}

export default function ConnectWalletButton({ children, className, text }: ConnectWalletButtonProps) {
  const { setShowAuthFlow } = useDynamicContext();
  const buttonText = text || (typeof children === 'string' ? children : 'Start Now');
  
  const handleClick = () => {
    // Programmatically trigger wallet connection - bypasses any admin dashboard email settings
    setShowAuthFlow(true);
  };
  
  return (
    <button 
      onClick={handleClick}
      className={className || "bg-brand-primary hover:bg-brand-primary/80 text-white font-medium px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105"}
    >
      <span className="text-white font-medium flex items-center justify-center">
        {buttonText}
        {children && typeof children !== 'string' && children}
      </span>
    </button>
  );
}