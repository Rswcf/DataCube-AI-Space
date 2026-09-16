import { AsyncLocalStorage } from 'node:async_hooks'

// Next.js server modules read `globalThis.AsyncLocalStorage` (the edge-runtime
// shape). Plain Node only exposes it via `node:async_hooks`, so tests that
// import `next/server` or `next/experimental/testing/server` must install it
// before those modules are evaluated — import this file first.
const g = globalThis as { AsyncLocalStorage?: unknown }
if (!g.AsyncLocalStorage) {
  g.AsyncLocalStorage = AsyncLocalStorage
}
