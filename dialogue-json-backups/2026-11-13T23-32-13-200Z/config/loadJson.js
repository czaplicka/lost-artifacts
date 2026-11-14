// config/loadJson.js

const requests = new Map();

const JSON_LOAD_TIMEOUT_MS = 15000;

export function loadJson(path, baseUrl) {
  const url = new URL(path, baseUrl).href;

  if (requests.has(url)) {
    return requests.get(url);
  }

  const request = fetchJson(url);

  requests.set(url, request);

  // Nieudane żądanie nie blokuje kolejnej próby.
  void request.catch(() => {
    if (requests.get(url) === request) {
      requests.delete(url);
    }
  });

  return request;
}

async function fetchJson(url) {
  const controller = new AbortController();

  const timer = window.setTimeout(() => {
    controller.abort();
  }, JSON_LOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    const reason =
      error?.name === 'AbortError'
        ? `Loading exceeded ${JSON_LOAD_TIMEOUT_MS} ms.`
        : error?.message || String(error);

    throw new Error(
      `[loadJson] Could not load "${url}": ${reason}`
    );
  } finally {
    window.clearTimeout(timer);
  }
}