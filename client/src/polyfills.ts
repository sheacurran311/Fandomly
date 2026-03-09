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

export { Buffer, process };
