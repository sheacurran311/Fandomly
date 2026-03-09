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

const browserProcess = globalThis.process as typeof process & {
  version?: string;
  browser?: boolean;
};

// readable-stream and other legacy browserified deps expect these fields to exist.
if (typeof browserProcess.version !== 'string') {
  browserProcess.version = 'v20.0.0';
}

if (typeof browserProcess.browser !== 'boolean') {
  browserProcess.browser = true;
}

export { Buffer, process };
