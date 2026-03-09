import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
// @ts-ignore - installed in production, may be missing locally
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Patches @particle-network/evm-connectors (and related) to use optional
 * chaining when calling provider.on(). Some environments (Replit preview,
 * certain browser extensions) expose a partial window.ethereum that is
 * missing the EventEmitter interface. Without this patch the injected-wallet
 * connector's setup() throws "provider.on is not a function" and corrupts
 * the ConnectKitProvider context.
 */
function patchParticleEvmProviderPlugin(): Plugin {
  return {
    name: 'patch-particle-evm-provider',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@particle-network') && !id.includes('evm-connector')) return null;
      if (!code.includes('provider.on(') && !code.includes('provider.removeListener(')) return null;
      const patched = code
        .replace(/\bprovider\.on\(/g, 'provider?.on?.(')
        .replace(/\bprovider\.removeListener\(/g, 'provider?.removeListener?.(')
        .replace(/\bprovider\.off\(/g, 'provider?.off?.(');
      return { code: patched, map: null };
    },
  };
}

/**
 * Stubs Node.js-only built-in imports (node:fs, node:path, etc.) that some
 * @smithy packages reference. These code paths are never executed in the
 * browser -- they're for Node.js-only credential resolution.
 *
 * IMPORTANT: Do NOT stub @aws-sdk/* packages here. Particle SDK's auth-core
 * dynamically imports @aws-sdk/client-kms, @aws-sdk/credential-providers,
 * and @aws-sdk/client-cognito-identity at runtime for wallet key management.
 * Stubbing them breaks wallet creation with "fromCognitoIdentity is not a function".
 */
function serverOnlyStubPlugin(): Plugin {
  // Only stub Node.js-specific smithy packages that use node:fs, node:os, etc.
  // Do NOT stub @aws-sdk/* -- Particle needs them for Cognito/KMS at runtime.
  const nodeOnlySmithyPrefixes = [
    '@smithy/shared-ini-file-loader',
    '@smithy/node-http-handler',
    '@smithy/node-config-provider',
  ];

  return {
    name: 'server-only-stub',
    enforce: 'pre',
    resolveId(source) {
      if (source.startsWith('node:')) {
        return { id: `\0node-stub:${source}`, moduleSideEffects: false };
      }
      for (const prefix of nodeOnlySmithyPrefixes) {
        if (source.startsWith(prefix) || source === prefix) {
          return { id: `\0server-stub:${source}`, moduleSideEffects: false };
        }
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0node-stub:') || id.startsWith('\0server-stub:')) {
        return 'export default {}; export var __esModule = true;';
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    patchParticleEvmProviderPlugin(),
    serverOnlyStubPlugin(),
    nodePolyfills({
      include: ['process', 'buffer', 'util', 'stream', 'events', 'crypto'],
      globals: { process: true, Buffer: true, global: true },
      protocolImports: false,
    }),
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    // Force all packages to use the same React instance.
    // Without this, Vite's dep optimization may bundle separate React copies
    // for packages that list React as a peerDependency (e.g. Particle Network),
    // causing "Invalid hook call" warnings.
    dedupe: ['react', 'react-dom'],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.versions': {},
    __LANDING_ONLY__: JSON.stringify(process.env.LANDING_ONLY === 'true'),
  },
  optimizeDeps: {
    // Force React into a single pre-bundled chunk so all dep chunks (Particle, styled-components)
    // share exactly one React copy. Without this, esbuild may resolve separate React copies
    // inside pre-bundled dep chunks, causing "Invalid hook call" at render time.
    include: ['react', 'react-dom', 'buffer', 'process'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        // Stub only Node.js-specific smithy packages during dep pre-bundling.
        // Do NOT stub @aws-sdk/* -- Particle SDK needs them for Cognito/KMS.
        {
          name: 'stub-node-only-smithy-in-deps',
          setup(build: any) {
            const nodeOnlyFilter = /^@smithy\/(hash-node|shared-ini-file-loader|node-http-handler|node-config-provider|util-body-length-node|util-user-agent-node)/;
            build.onResolve({ filter: nodeOnlyFilter }, (args: any) => ({
              path: args.path,
              namespace: 'node-only-stub',
            }));
            build.onLoad({ filter: /.*/, namespace: 'node-only-stub' }, () => ({
              contents: 'export default {};',
              loader: 'js',
            }));
          },
        },
        // Patch Particle EVM connector provider.on() to use optional chaining
        {
          name: 'patch-particle-evm-provider',
          setup(build: any) {
            build.onLoad({ filter: /evm-connectors/ }, async (args: any) => {
              const { readFileSync } = await import('node:fs');
              const src = readFileSync(args.path, 'utf8');
              const patched = src
                .replace(/\bprovider\.on\(/g, 'provider?.on?.(')
                .replace(/\bprovider\.removeListener\(/g, 'provider?.removeListener?.(')
                .replace(/\bprovider\.off\(/g, 'provider?.off?.(');
              return { contents: patched, loader: 'js' };
            });
          },
        },
      ],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
  server: {
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
