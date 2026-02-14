import { ReactNode } from "react";
import { useAuthModal } from "@/hooks/use-auth-modal";

interface ConnectWalletButtonProps {
  children?: ReactNode;
  className?: string;
  text?: string;
}

/**
 * Sign In button that opens the auth modal
 * No userType parameter — all users come through the same door
 * and choose their type after authenticating.
 */
export default function ConnectWalletButton({ children, className, text }: ConnectWalletButtonProps) {
  const { openAuthModal } = useAuthModal();
  const buttonText = text || (typeof children === 'string' ? children : 'Sign In');
  
  const handleClick = () => {
    openAuthModal();
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
