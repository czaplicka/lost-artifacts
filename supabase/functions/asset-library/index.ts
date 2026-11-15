import { createClient } from 'npm:@supabase/supabase-js@2';
import { check, MAX_IMAGE, MAX_MEDIA, MAX_SOURCE, localPath, mediaType, canReplace, sourceCandidate, makeCatalog, assignments, scanSource, inspectImage, validateReplacement } from './engine.mjs';
const OWNER = 'czaplicka', REPO = 'lost-artifacts';
const ORIGIN = Deno.env.get('CITY_EDITOR_ORIGIN') || 'https://markagency.silentshields.pl';
const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false, autoRefreshToken: false } });
const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
const snapshots = new Map(), BATCH = 16;
function response(status, data) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin'
  } });
}
async function auth(req) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''); check(jwt, 'Zaloguj się.');
  const { data, error } = await db.auth.getUser(jwt);
  check(!error && data.user?.id && data.user.email_confirmed_at, 'Nieprawidłowa sesja lub niepotwierdzony e-mail.');
  const role = await db.from('city_editor_admins').select('user_id').eq('user_id', data.user.id).eq('enabled', true).maybeSingle();
  check(!role.error && role.data, 'Brak uprawnień administratora.'); return data.user;
}
async function readBody(req) {
  const reader = req.body?.getReader(); check(reader, 'Brak żądania.'); const chunks = []; let size = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length;
    check(size <= 6 * 1024 * 1024, 'Żądanie przekracza 6 MiB.'); chunks.push(chunk.value); } }
  finally { await reader.cancel().catch(() => {}); }
  const data = new Uint8Array(size); let p = 0; for (const chunk of chunks) { data.set(chunk, p); p += chunk.length; }
  return JSON.parse(dec.decode(data));
}
function b64(bytes) { let text = ''; for (let p = 0; p < bytes.length; p += 8192) text += String.fromCharCode(...bytes.subarray(p, p + 8192)); return btoa(text); }
function un64(value, max = MAX_MEDIA) {
  check(typeof value === 'string' && value.length <= Math.ceil(max / 3) * 4 && value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value), 'Nieprawidłowe base64 lub zbyt duży plik.');
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0)); check(bytes.length <= max, 'Plik jest zbyt duży.'); return bytes;
}
async function digest(bytes) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof bytes === 'string' ? enc.encode(bytes) : bytes))].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function hmacKey() {
  const token = Deno.env.get('CITY_EDITOR_GITHUB_TOKEN'); check(token, 'Brak CITY_EDITOR_GITHUB_TOKEN.');
  return crypto.subtle.importKey('raw', enc.encode('asset-library-v1:' + token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(payload) { const body = b64(enc.encode(JSON.stringify(payload))), sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body)); return body + '.' + b64(new Uint8Array(sig)); }
async function verify(token, purpose) {
  check(typeof token === 'string' && token.length < 8192, 'Brak lub nieprawidłowy podpis.');
  const [body, sig, ...extra] = token.split('.');
  check(body && sig && !extra.length && await crypto.subtle.verify('HMAC', await hmacKey(), un64(sig, 128), enc.encode(body)), 'Nieprawidłowy podpis.');
  const data = JSON.parse(dec.decode(un64(body, 6000)));
  check(data.purpose === purpose && Number.isFinite(data.exp) && data.exp > Date.now(), 'Podgląd lub skan wygasł. Wykonaj go ponownie.'); return data;
}
async function parallel(items, limit, task) {
  const out = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const i = cursor++; out[i] = await task(items[i], i); }
  })); return out;
}
async function github() {
  const token = Deno.env.get('CITY_EDITOR_GITHUB_TOKEN'); check(token, 'Brak CITY_EDITOR_GITHUB_TOKEN.');
  async function call(path, method = 'GET', body = null) {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}` + path, { method,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    check(r.ok, 'GitHub HTTP ' + r.status + '. Sprawdź limit API, token i ochronę gałęzi.'); return r.json();
  }
  const repo = await call(''), branch = Deno.env.get('CITY_EDITOR_BRANCH') || repo.default_branch;
  check(/^[A-Za-z0-9_./-]+$/.test(branch) && !branch.includes('..'), 'Nieprawidłowa gałąź.');
  const refPath = 'heads/' + branch.split('/').map(encodeURIComponent).join('/');
  const ref = await call('/git/ref/' + refPath), head = ref.object.sha;
  async function snapshot() {
    if (snapshots.has(head)) return snapshots.get(head);
    const commit = await call('/git/commits/' + head), tree = await call('/git/trees/' + commit.tree.sha + '?recursive=1');
    check(!tree.truncated, 'GitHub zwrócił niepełne drzewo. Operacja zablokowana — nie pokazujemy niepełnej listy jako kompletnej.');
    const entries = tree.tree.filter(e => e.type === 'blob' && ['100644', '100755'].includes(e.mode));
    const map = new Map(entries.map(e => [e.path, e]));
    const result = { head, tree: commit.tree.sha, entries, map, sources: entries.filter(e => sourceCandidate(e.path)).sort((a, b) => a.path.localeCompare(b.path)), catalog: null };
    check(result.sources.length <= 10000, 'Skan przekracza limit 10 000 plików źródłowych.');
    if (snapshots.size >= 2) snapshots.delete(snapshots.keys().next().value);
    snapshots.set(head, result); return result;
  }
  async function bytes(entry, max = MAX_MEDIA) {
    check(entry && entry.type === 'blob' && ['100644', '100755'].includes(entry.mode) && entry.size <= max, 'Plik nie istnieje, ma nieobsługiwany typ lub przekracza limit rozmiaru.');
    const blob = await call('/git/blobs/' + entry.sha); check(blob.encoding === 'base64', 'Nieobsługiwany format Git blob.');
    return un64(blob.content.replace(/\s/g, ''), max);
  }
  async function text(snap, path, max = MAX_SOURCE) { return dec.decode(await bytes(snap.map.get(path), max)); }
  async function catalog(snap) {
    if (snap.catalog) return snap.catalog;
    const index = JSON.parse(await text(snap, 'assets/manifests/index.json', 2 * 1024 * 1024));
    check(Array.isArray(index.files) && index.files.length <= 100, 'Nieprawidłowa lista części manifestu.');
    for (const p of index.files) check(/^assets\/manifests\/[A-Za-z0-9_./-]+\.json$/.test(p) && !p.includes('..'), 'Nieprawidłowa ścieżka manifestu.');
    const parts = await parallel(index.files, 4, async p => JSON.parse(await text(snap, p, 2 * 1024 * 1024)));
    snap.catalog = { index, rows: makeCatalog(index, parts, snap.entries) }; return snap.catalog;
  }
  return { call, branch, head, refPath, snapshot, bytes, text, catalog };
}
function select(rows, input, snap) {
  const row = rows.find(row => row.id === input.id); check(row, 'Asset już nie istnieje. Odśwież katalog.');
  const path = input.path || row.paths[0]; check(row.paths.includes(path) && localPath(path) === path, 'Wybierz lokalny plik tego assetu.');
  const entry = snap.map.get(path); check(entry && mediaType(path), 'Plik nie istnieje lub nie jest obsługiwanym medium.'); return { row, path, entry };
}
function boundTo(data, gh, user, path) { check(data.user === user.id && data.head === gh.head && data.branch === gh.branch && data.path === path, 'Zmieniło się konto, repozytorium lub plik. Powtórz skan i podgląd.'); }
const staticWarning = 'Skan jest statyczny: użycia budowane dynamicznie, komentarze, pliki pominięte i zasoby spoza repozytorium wymagają ręcznej oceny. Brak trafień nie oznacza, że plik jest nieużywany.';
Deno.serve(async req => {
  if (req.headers.get('Origin') && req.headers.get('Origin') !== ORIGIN) return response(403, { error: 'Niedozwolone pochodzenie.' });
  if (req.method === 'OPTIONS') return response(200, { ok: true });
  if (req.method !== 'POST') return response(405, { error: 'Użyj POST.' });
  try {
    const user = await auth(req), input = await readBody(req);
    if (input.action === 'access') return response(200, { ok: true });
    const gh = await github();
    if (input.head) check(input.head === gh.head, 'Repozytorium zmieniło się. Odśwież bibliotekę i ponownie wybierz asset.');
    const snap = await gh.snapshot(), { index, rows } = await gh.catalog(snap);
    if (input.action === 'catalog') {
      const page = Number(input.page || 1), query = String(input.query || '').trim().toLocaleLowerCase();
      check(Number.isSafeInteger(page) && page > 0 && page <= 1000 && query.length <= 200, 'Nieprawidłowy filtr.');
      const matches = rows.filter(row => (!input.type || row.type === input.type) && (!query || [row.key, row.id, ...row.paths, ...row.groups].join(' ').toLocaleLowerCase().includes(query)));
      return response(200, { head: gh.head, branch: gh.branch, page, total: matches.length, hasNext: matches.length > page * 80, rows: matches.slice((page - 1) * 80, page * 80) });
    }
    const { row, path, entry } = select(rows, input, snap), uses = assignments(rows, index, path);
    if (input.action === 'detail') return response(200, { row, path, head: gh.head, bytes: entry.size, replaceable: canReplace(path), ...uses,
      sourceCount: snap.sources.length, warning: staticWarning });
    if (input.action === 'media') {
      check(!/\.(svg|ico)$/i.test(path), 'Ten format nie ma automatycznego podglądu w bibliotece.');
      const bytes = await gh.bytes(entry);
      const ext = path.split('.').at(-1).toLowerCase();
      const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp3: 'audio/mpeg', ogg: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac' }[ext];
      let image = null; if (canReplace(path)) image = inspectImage(bytes, path);
      return response(200, { base64: b64(bytes), mime, image, head: gh.head });
    }
    if (input.action === 'scan') {
      check(uses.aliases.length <= 200, 'Zbyt wiele aliasów do jednego automatycznego skanu.');
      const cursor = Number(input.cursor || 0);
      check(Number.isSafeInteger(cursor) && cursor >= 0 && cursor <= snap.sources.length, 'Nieprawidłowy etap skanu.');
      let previous = { hits: 0, skipped: 0, limited: 0, exp: Date.now() + 1800000 };
      if (cursor > 0) { previous = await verify(input.scanToken, 'scan'); boundTo(previous, gh, user, path); check(previous.cursor === cursor, 'Pominięto fragment skanu.'); }
      const chunk = snap.sources.slice(cursor, cursor + BATCH);
      const results = await parallel(chunk, 4, async item => {
        if (item.size > MAX_SOURCE) return { skipped: item.path + ' — ponad 512 KiB', hits: [], total: 0, limited: false };
        const sourceBytes = await gh.bytes(item, MAX_SOURCE);
        try { return scanSource(item.path, dec.decode(sourceBytes), path, uses.aliases); }
        catch (error) { return { skipped: item.path + ' — ' + error.message, hits: [], total: 0, limited: false }; }
      });
      const allHits = results.flatMap(r => r.hits), shown = allHits.slice(0, 200), next = cursor + chunk.length;
      const receipt = { purpose: 'scan', user: user.id, head: gh.head, branch: gh.branch, path, cursor: next,
        hits: previous.hits + results.reduce((n, r) => n + r.total, 0), skipped: previous.skipped + results.filter(r => r.skipped).length,
        limited: previous.limited + results.filter(r => r.limited).length + (allHits.length > shown.length ? 1 : 0), exp: previous.exp };
      return response(200, { hits: shown, skipped: results.filter(r => r.skipped).map(r => r.skipped), next, total: snap.sources.length,
        complete: next === snap.sources.length, scanToken: await sign(receipt), summary: receipt });
    }
    check(['preview', 'publish'].includes(input.action), 'Nieznana operacja.');
    check(canReplace(path) && row.type === 'image', 'Ta wersja obsługuje podmianę wyłącznie PNG, JPEG i WebP.');
    const scanned = await verify(input.scanToken, 'scan'); boundTo(scanned, gh, user, path);
    check(scanned.cursor === snap.sources.length, 'Najpierw zakończ skan przypisań.');
    const approved = input.action === 'publish' ? await verify(input.previewToken, 'replace') : null;
    if (approved) boundTo(approved, gh, user, path);
    const nextBytes = un64(input.base64, MAX_IMAGE), oldBytes = await gh.bytes(entry), dimensions = validateReplacement(oldBytes, nextBytes, path);
    const hash = await digest(nextBytes), oldHash = await digest(oldBytes); check(hash !== oldHash, 'Nowy plik jest identyczny z obecnym.');
    const bound = { purpose: 'replace', user: user.id, head: gh.head, branch: gh.branch, path, blob: entry.sha, mode: entry.mode, hash, scan: await digest(input.scanToken) };
    if (input.action === 'preview') {
      const warnings = [
        'Podmieniasz wspólny plik. Zmiana obejmie wszystkie poniższe klucze, przypisania i bezpośrednie odwołania do ścieżki.',
        staticWarning,
        ...(scanned.skipped || scanned.limited ? [`Skan: ${scanned.skipped} plików pominiętych, ${scanned.limited} partii z ograniczoną listą trafień. Zakres nie jest pełny.`] : []),
        ...(/sprite|atlas|tile/i.test(path) ? ['Plik może być arkuszem klatek lub teksturą zależną od mapy. Te same wymiary nie gwarantują poprawnego układu klatek ani hotspotów.'] : []),
        'Nie zmieniamy kluczy, manifestów, JSON-ów ani innych plików. Nowa grafika trafi pod dotychczasową ścieżkę.',
        'Hosting i cache przeglądarki mogą nadal pokazywać starszy plik do czasu wdrożenia i odświeżenia.'
      ];
      return response(200, { path, head: gh.head, branch: gh.branch, dimensions, ...uses, scan: scanned, warnings,
        previewToken: await sign({ ...bound, operation: crypto.randomUUID(), date: new Date().toISOString(), exp: Date.now() + 600000 }) });
    }
    for (const [key, value] of Object.entries(bound)) check(approved[key] === value, 'Podgląd nie pasuje do danych. Przygotuj nowy.');
    check(/^[a-f0-9-]{36}$/i.test(approved.operation), 'Nieprawidłowa operacja.');
    const blob = await gh.call('/git/blobs', 'POST', { encoding: 'base64', content: b64(nextBytes) });
    const tree = await gh.call('/git/trees', 'POST', { base_tree: snap.tree, tree: [{ path, mode: entry.mode, type: 'blob', sha: blob.sha }] });
    const name = String(user.user_metadata?.full_name || user.user_metadata?.name || 'Admin ' + user.id.slice(0, 8)).replace(/[\r\n\x00-\x1f\x7f]/g, ' ').slice(0, 100);
    const commit = await gh.call('/git/commits', 'POST', {
      message: 'Asset library: replace ' + path + '\n\nHistory-Operation: ' + approved.operation + '\nAdmin-Actor-ID: ' + user.id + '\nAdmin-Actor-Name: ' + name,
      tree: tree.sha, parents: [gh.head], author: { name: name || 'Admin', email: user.id + '@admin.invalid', date: approved.date }
    });
    try { await gh.call('/git/refs/' + gh.refPath, 'PATCH', { sha: commit.sha, force: false }); }
    catch {
      try {
        const ref = await gh.call('/git/ref/' + gh.refPath);
        if (ref.object.sha !== commit.sha) {
          const comparison = await gh.call('/compare/' + commit.sha + '...' + ref.object.sha);
          check(['ahead', 'identical'].includes(comparison.status), 'Nie potwierdzono commitu.');
        }
      } catch { return response(409, { error: 'Publikacja niepotwierdzona. Sprawdź historię GitHuba przed ponowieniem. Możliwy równoległy zapis.', candidate: commit.sha }); }
    }
    return response(200, { ok: true, commit: commit.sha, message: 'Podmieniono jeden plik przez nowy commit. Wdrożenie na hosting nie jest potwierdzone.' });
  } catch (error) { return response(400, { error: error.message || 'Błąd biblioteki assetów.' }); }
});
