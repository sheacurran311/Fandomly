import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Particle Network SDK pulls in @aws-sdk and @smithy (for Cognito auth)
 * which use Node.js-only imports (node:fs, node:path, etc.).
 * These code paths are never executed in the browser — the SDK uses them
 * only for optional server-side credential resolution.
 *
 * This plugin stubs these packages at the module level so Rollup can
 * tree-shake them away without build errors.
 */
function serverOnlyStubPlugin(): Plugin {
  const serverOnlyPrefixes = [
    '@aws-sdk/',
    '@smithy/shared-ini-file-loader',
    '@smithy/credential-provider-',
    '@smithy/node-http-handler',
    '@smithy/node-config-provider',
    '@aws-sdk/util-user-agent-node',
    '@aws-sdk/credential-provider-',
    '@aws-sdk/client-cognito-identity',
    '@aws-sdk/client-kms',
    '@aws-sdk/nested-clients',
  ];

  return {
    name: 'server-only-stub',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.startsWith('node:')) {
        return { id: `\0node-stub:${source}`, moduleSideEffects: false };
      }
      for (const prefix of serverOnlyPrefixes) {
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
    include: ['buffer']
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
