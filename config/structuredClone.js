import clone from '../assets/vendor/structured-clone/index.js';

// Preserve native support; only install the fallback when missing.
// The fallback does not implement transfer semantics.
if (typeof globalThis.structuredClone !== 'function') {
  Object.defineProperty(globalThis, 'structuredClone', {
    configurable: true,
    writable: true,
    value: clone
  });
}
