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
 * Particle's thresh-sig package lazily fetches its WASM file using
 * `new URL("../wasm/thresh_sig_wasm_bg.wasm", import.meta.url)`.
 * Once the package is pre-bundled into `.vite/deps`, that relative URL points
 * at a non-existent location and our app catch-all returns `index.html`,
 * causing silent WASM init failure and later `__wbindgen_malloc` crashes.
 *
 * Rewrite the fetch target to a stable app route that we serve explicitly in
 * both dev and production. Also rethrow init errors so failures are visible.
 */
function patchParticleThreshSigPlugin(): Plugin {
  return {
    name: 'patch-particle-thresh-sig',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@particle-network/thresh-sig')) return null;
      if (!code.includes('thresh_sig_wasm_bg.wasm')) return null;

      const patched = code
        .replace(
          'new URL("../wasm/thresh_sig_wasm_bg.wasm", import.meta.url)',
          '"/particle-wasm/thresh_sig_wasm_bg.wasm"'
        )
        .replace(
          /} catch \(e\) {\s*}\s*context\.initializing = false;/,
          '} catch (e) {\n      console.error("[Particle] Failed to initialize thresh-sig wasm", e);\n      throw e;\n    }\n    context.initializing = false;'
        );

      return { code: patched, map: null };
    },
  };
}

/**
 * Stubs Node.js built-in protocol imports (node:fs, node:http, etc.) that
 * @smithy and @aws-sdk packages reference. The smithy/AWS packages themselves
 * are NOT stubbed — only their node: dependencies. This allows the AWS SDK
 * chain (needed by Particle for Cognito/KMS wallet creation) to load and
 * export its named symbols correctly, while the Node.js-only code paths
 * (file I/O, HTTP via node:http, etc.) are replaced with no-ops.
 *
 * Uses CJS Proxy so that any named import (e.g. `import { readFileSync }
 * from "node:fs"`) resolves to a no-op function instead of failing with
 * "No matching export".
 */
function serverOnlyStubPlugin(): Plugin {
  return {
    name: 'server-only-stub',
    enforce: 'pre',
    resolveId(source) {
      if (source.startsWith('node:')) {
        return { id: `\0node-stub:${source}`, moduleSideEffects: false };
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0node-stub:')) {
        // CJS Proxy: any named import resolves to a no-op function.
        // esbuild/Rollup handle CJS→ESM interop by reading properties
        // off module.exports at runtime, so the Proxy getter fires.
        return [
          'var handler = { get: function(_, p) {',
          '  if (p === "__esModule") return true;',
          '  if (typeof p !== "string") return undefined;',
          '  return function() { return {}; };',
          '} };',
          'module.exports = new Proxy({}, handler);',
        ].join('\n');
      }
      return null;
    },
  };
}

function patchAwsBrowserRuntimePlugin(): Plugin {
  return {
    name: 'patch-aws-browser-runtime',
    enforce: 'pre',
    load(id) {
      if (
        id.endsWith('/node_modules/@aws-sdk/client-cognito-identity/dist-es/runtimeConfig.js') ||
        id.endsWith(
          '/node_modules/@aws-sdk/nested-clients/dist-es/submodules/cognito-identity/runtimeConfig.js'
        )
      ) {
        return null;
      }
      return null;
    },
    async transform(code, id) {
      if (
        id.endsWith('/node_modules/@aws-sdk/client-cognito-identity/dist-es/runtimeConfig.js') ||
        id.endsWith(
          '/node_modules/@aws-sdk/nested-clients/dist-es/submodules/cognito-identity/runtimeConfig.js'
        )
      ) {
        const browserPath = id.replace('runtimeConfig.js', 'runtimeConfig.browser.js');
        const { readFile } = await import('node:fs/promises');
        const browserCode = await readFile(browserPath, 'utf8');
        return { code: browserCode, map: null };
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    patchParticleEvmProviderPlugin(),
    patchParticleThreshSigPlugin(),
    patchAwsBrowserRuntimePlugin(),
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
    'process.version': JSON.stringify('v20.0.0'),
    'process.browser': JSON.stringify(true),
    'process.versions': {},
    __LANDING_ONLY__: JSON.stringify(process.env.LANDING_ONLY === 'true'),
  },
  optimizeDeps: {
    // Force React into a single pre-bundled chunk so all dep chunks (Particle, styled-components)
    // share exactly one React copy. Without this, esbuild may resolve separate React copies
    // inside pre-bundled dep chunks, causing "Invalid hook call" at render time.
    include: [
      'react',
      'react-dom',
      'buffer',
      'process',
      'stream-browserify',
      'readable-stream',
      'crypto-browserify',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
        'process.version': '"v20.0.0"',
        'process.browser': 'true',
      },
      plugins: [
        // Stub node: built-in imports (node:fs, node:http, etc.) during dep
        // pre-bundling. The @smithy and @aws-sdk packages themselves are NOT
        // stubbed so they can export their named symbols correctly.
        // Uses CJS Proxy so any named import resolves to a no-op function.
        {
          name: 'stub-node-builtins-in-deps',
          setup(build: any) {
            build.onResolve({ filter: /^node:/ }, (args: any) => ({
              path: args.path,
              namespace: 'node-builtin-stub',
            }));
            build.onLoad({ filter: /.*/, namespace: 'node-builtin-stub' }, () => ({
              contents: [
                'var handler = { get: function(_, p) {',
                '  if (p === "__esModule") return true;',
                '  if (typeof p !== "string") return undefined;',
                '  return function() { return {}; };',
                '} };',
                'module.exports = new Proxy({}, handler);',
              ].join('\n'),
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
        {
          name: 'patch-aws-cognito-runtime-config-browser',
          setup(build: any) {
            build.onLoad(
              {
                filter:
                  /@aws-sdk[\/\\]client-cognito-identity[\/\\]dist-es[\/\\]runtimeConfig\.js$|@aws-sdk[\/\\]nested-clients[\/\\]dist-es[\/\\]submodules[\/\\]cognito-identity[\/\\]runtimeConfig\.js$/,
              },
              async (args: any) => {
                const { readFileSync } = await import('node:fs');
                const browserPath = args.path.replace('runtimeConfig.js', 'runtimeConfig.browser.js');
                return {
                  contents: readFileSync(browserPath, 'utf8'),
                  loader: 'js',
                };
              }
            );
          },
        },
        {
          name: 'patch-particle-thresh-sig',
          setup(build: any) {
            build.onLoad(
              { filter: /@particle-network[\/\\]thresh-sig[\/\\].*[\/\\]esm[\/\\]index\.js$/ },
              async (args: any) => {
                const { readFileSync } = await import('node:fs');
                const src = readFileSync(args.path, 'utf8');
                const patched = src
                  .replace(
                    'new URL("../wasm/thresh_sig_wasm_bg.wasm", import.meta.url)',
                    '"/particle-wasm/thresh_sig_wasm_bg.wasm"'
                  )
                  .replace(
                    /} catch \(e\) {\s*}\s*context\.initializing = false;/,
                    '} catch (e) {\n      console.error("[Particle] Failed to initialize thresh-sig wasm", e);\n      throw e;\n    }\n    context.initializing = false;'
                  );
                return { contents: patched, loader: 'js' };
              }
            );
          },
        },
      ],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@reown') || id.includes('@walletconnect')) {
              return 'vendor-walletconnect';
            }
            if (id.includes('@particle-network')) {
              return 'vendor-particle';
            }
            if (id.includes('lottie-web') || id.includes('lottie-react')) {
              return 'vendor-lottie';
            }
            if (id.includes('@aws-sdk') || id.includes('@smithy')) {
              return 'vendor-aws';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (
              id.includes('react-dom') ||
              id.includes('/react/') ||
              id.includes('react/index') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react';
            }
          }
        },
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
