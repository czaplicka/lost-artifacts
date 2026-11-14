let installedStorage = null;
export function assertIsolation() {
  if (!installedStorage || window.localStorage !== installedStorage.local || window.sessionStorage !== installedStorage.session) throw new Error("Tester wymaga odizolowanego uruchamiacza.");
}
export function createMemoryStorage() {
  const data = new Map();
  const methods = {
    getItem(key) { return data.get(String(key)) ?? null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(String(key)); },
    clear() { data.clear(); },
    key(index) { return [...data.keys()][Number(index) >>> 0] ?? null; }
  };
  return new Proxy(Object.create(null), {
    get(_, key) {
      if (key === 'length') return data.size;
      if (key === Symbol.toStringTag) return 'Storage';
      if (Object.hasOwn(methods, key)) return methods[key];
      return typeof key === 'string' ? data.get(key) : undefined;
    },
    set(_, key, value) { if (typeof key !== 'string') return false; data.set(key, String(value)); return true; },
    deleteProperty(_, key) { data.delete(key); return true; },
    ownKeys() { return [...data.keys()]; },
    has(_, key) { return key === 'length' || Object.hasOwn(methods, key) || data.has(key); },
    getOwnPropertyDescriptor(_, key) {
      if (data.has(key)) return { configurable: true, enumerable: true, writable: true, value: data.get(key) };
    }
  });
}
export function isAllowedRead(url, method = 'GET', base = 'http://localhost/') {
  if (!['GET', 'HEAD'].includes(String(method).toUpperCase())) return false;
  const parsed = new URL(url, base);
  if (!['http:', 'https:', 'blob:', 'data:'].includes(parsed.protocol)) return false;
  return !/\/(?:auth\/v1|functions\/v1)(?:\/|$)|\/rest\/v1\/rpc(?:\/|$)/i.test(parsed.pathname);
}
export function installIsolation(report = () => {}) {
  const local = createMemoryStorage(), session = createMemoryStorage();
  const replace = (object, key, value) => {
    Object.defineProperty(object, key, { value, configurable: false, writable: false });
    if (object[key] !== value) throw new Error('Nie udało się odizolować: ' + key);
  };
  replace(window, 'localStorage', local);
  replace(window, 'sessionStorage', session);
  replace(window, 'BroadcastChannel', undefined);
  window.addEventListener('storage', event => event.stopImmediatePropagation(), true);
  const blocked = detail => {
    report({ type: 'blocked', detail });
    throw new Error('[TEST SESSION] Operacja zablokowana: ' + detail);
  };
  const originalFetch = window.fetch.bind(window);
  replace(window, 'fetch', async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = init.method ?? (input instanceof Request ? input.method : 'GET');
    if (!isAllowedRead(url, method, document.baseURI)) return blocked(method + ' ' + url);
    return originalFetch(input, { ...init, credentials: 'omit' });
  });
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const requests = new WeakMap();
  replace(XMLHttpRequest.prototype, 'open', function(method, url, ...args) {
    if (!isAllowedRead(String(url), method, document.baseURI)) return blocked('XHR ' + method + ' ' + url);
    requests.set(this, String(url));
    return originalOpen.call(this, method, url, ...args);
  });
  replace(XMLHttpRequest.prototype, 'send', function(body = null) {
    if (!requests.has(this)) return blocked('XHR bez zweryfikowanego adresu');
    this.withCredentials = false;
    return originalSend.call(this, body);
  });
  if ('sendBeacon' in navigator) replace(navigator, 'sendBeacon', () => { report({ type: 'blocked', detail: 'sendBeacon' }); return false; });
  const denyConstructor = label => class { constructor() { blocked(label); } };
  for (const key of ['WebSocket', 'Worker', 'SharedWorker']) if (key in window) replace(window, key, denyConstructor(key));
  if ('indexedDB' in window) replace(window, 'indexedDB', undefined);
  replace(window, 'open', () => { report({ type: 'blocked', detail: 'window.open' }); return null; });
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a[href]')) {
      event.preventDefault(); report({ type: 'blocked', detail: 'Nawigacja poza sesję testową' });
    }
  }, true);
  document.addEventListener('submit', event => event.preventDefault(), true);
  if (window.navigation) window.navigation.addEventListener('navigate', event => {
    if (event.cancelable) event.preventDefault();
  });
  installedStorage = Object.freeze({ local, session });
  return installedStorage;
}
