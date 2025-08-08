import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { ReactNode } from "react";

interface ConnectWalletButtonProps {
  children?: ReactNode;
  className?: string;
}

export default function ConnectWalletButton({ children, className }: ConnectWalletButtonProps) {
  // Override Dynamic's default styling with our custom CSS
  const customStyles = `
    .dynamic-widget-button {
      background-color: hsl(315, 76%, 49%) !important;
      color: white !important;
      font-weight: 500 !important;
      padding: 0.5rem 1.5rem !important;
      border-radius: 0.75rem !important;
      transition: all 0.2s !important;
      border: none !important;
    }
    .dynamic-widget-button:hover {
      background-color: hsl(315, 76%, 39%) !important;
      transform: scale(1.05) !important;
    }
  `;

  return (
    <>
      <style>{customStyles}</style>
      <DynamicWidget />
    </>
  );
}