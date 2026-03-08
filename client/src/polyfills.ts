/**
 * Global polyfills — imported first via esbuild inject and main.tsx.
 * Ensures Buffer is available before any Particle SDK crypto modules
 * (ripemd160 → hash-base → readable-stream) execute.
 */
import { Buffer } from 'buffer';
import process from 'process';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = process;
}

export { Buffer, process };
