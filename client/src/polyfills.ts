/**
 * Runtime polyfills that must execute before app modules import Particle SDK
 * dependencies. This keeps Buffer/process available during client bootstrap
 * without relying on brittle inline scripts.
 */
import { Buffer } from 'buffer';
import process from 'process';

if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}

if (typeof globalThis.process === 'undefined') {
  (globalThis as typeof globalThis & { process: typeof process }).process = process;
}

// readable-stream and other legacy browserified deps expect these fields to exist.
if (typeof globalThis.process.version !== 'string') {
  (
    globalThis as typeof globalThis & {
      process: typeof process & { version: string };
    }
  ).process.version = 'v20.0.0';
}

if (typeof globalThis.process.browser !== 'boolean') {
  (
    globalThis as typeof globalThis & {
      process: typeof process & { browser: boolean };
    }
  ).process.browser = true;
}

export { Buffer, process };
