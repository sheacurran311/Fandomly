/**
 * Dynamic SDK Provider Stub
 * 
 * The Dynamic SDK has been replaced with a custom JWT-based authentication system.
 * This file is kept as a stub for backward compatibility with any imports.
 */
import { ReactNode } from "react";

interface DynamicProviderProps {
  children: ReactNode;
}

/**
 * @deprecated Dynamic SDK has been removed. Use AuthProvider instead.
 */
export default function DynamicProvider({ children }: DynamicProviderProps) {
  // Dynamic SDK removed - just pass through children
  return <>{children}</>;
}
