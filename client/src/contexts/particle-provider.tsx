/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { isParticleAuthEnabled, createParticleConfig } from '@/lib/particle-config';
import { ConnectKitProvider } from '@particle-network/connectkit';

interface ParticleProviderProps {
  children: ReactNode;
}

interface ConnectKitBoundaryState {
  failed: boolean;
}

/**
 * Inner error boundary scoped to ConnectKitProvider only.
 *
 * ConnectKitProvider (from @particle-network/connectkit) uses styled-components
 * which can throw a non-Error object `{}` during initial render in some
 * environments (duplicate React copies, partial window.ethereum, etc.).
 *
 * When that happens we catch it here, log a warning, and fall back to
 * rendering children WITHOUT the ConnectKit context.  The rest of the app
 * continues to work; wallet features are simply unavailable.
 *
 * This prevents the crash from bubbling up to the root ErrorBoundary and
 * showing a blank "Something went wrong" screen to the user.
 */
class ConnectKitBoundary extends Component<ParticleProviderProps, ConnectKitBoundaryState> {
  state: ConnectKitBoundaryState = { failed: false };

  static getDerivedStateFromError(): ConnectKitBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: any, info: ErrorInfo) {
    console.warn(
      '[Particle] ConnectKitProvider failed to render — wallet features disabled.',
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.failed) {
      return <>{this.props.children}</>;
    }
    return this.props.children;
  }
}

function ConnectKitWrapper({ config, children }: { config: ReturnType<typeof createParticleConfig>; children: ReactNode }) {
  return (
    <ConnectKitBoundary>
      <ConnectKitProvider config={config}>{children}</ConnectKitProvider>
    </ConnectKitBoundary>
  );
}

export function ParticleProvider({ children }: ParticleProviderProps) {
  const enabled = isParticleAuthEnabled();

  const config = useMemo(() => {
    if (!enabled) return null;
    try {
      return createParticleConfig();
    } catch (err) {
      console.error('[Particle] Config creation failed:', err);
      return null;
    }
  }, [enabled]);

  if (!config) {
    return <>{children}</>;
  }

  return <ConnectKitWrapper config={config}>{children}</ConnectKitWrapper>;
}
