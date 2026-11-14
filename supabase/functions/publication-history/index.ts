import { createClient } from 'npm:@supabase/supabase-js@2';
import { check, requirePath, requireSha, allowedPath, MAX_BYTES, planUndo, actorLabel, commitMessage } from './engine.mjs';
const OWNER = 'czaplicka', REPO = 'lost-artifacts';
const ORIGIN = Deno.env.get('CITY_EDITOR_ORIGIN') || 'https://markagency.silentshields.pl';
const enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false, autoRefreshToken: false } });
function response(code, data) {
  return new Response(JSON.stringify(data), { status: code, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin'
  } });
}
async function authenticate(req) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  check(jwt, 'Zaloguj się w panelu.');
  const { data, error } = await db.auth.getUser(jwt);
  check(!error && data.user?.id && data.user.email_confirmed_at, 'Sesja wygasła albo konto nie ma potwierdzonego adresu.');
  const access = await db.from('city_editor_admins').select('user_id').eq('user_id', data.user.id).eq('enabled', true).maybeSingle();
  check(!access.error && access.data, 'Brak uprawnień administratora.');
  return data.user;
}
async function readBody(req) {
  const reader = req.body?.getReader(); check(reader, 'Brak żądania.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const value = await reader.read(); if (value.done) break;
      size += value.value.length; check(size <= 16384, 'Żądanie przekracza 16 KiB.'); chunks.push(value.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(dec.decode(all));
}
function encode64(bytes) { let text = ''; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text); }
function decode64(text) { return Uint8Array.from(atob(text.replace(/\s/g, '')), c => c.charCodeAt(0)); }
async function digest(text) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))].map(v => v.toString(16).padStart(2, '0')).join(''); }
async function signingKey() {
  const secret = Deno.env.get('CITY_EDITOR_GITHUB_TOKEN'); check(secret, 'Brak CITY_EDITOR_GITHUB_TOKEN.');
  return crypto.subtle.importKey('raw', enc.encode('publication-history-preview-v1:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(payload) {
  const body = encode64(enc.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), enc.encode(body));
  return body + '.' + encode64(new Uint8Array(signature));
}
async function verify(token) {
  check(typeof token === 'string' && token.length < 8192, 'Nieprawidłowy podgląd.');
  const [body, signature, ...extra] = token.split('.');
  check(body && signature && !extra.length && await crypto.subtle.verify('HMAC', await signingKey(), decode64(signature), enc.encode(body)), 'Podpis podglądu jest nieprawidłowy.');
  const payload = JSON.parse(dec.decode(decode64(body)));
  check(Number.isFinite(payload.exp) && payload.exp > Date.now(), 'Podgląd wygasł. Przygotuj nowy.'); return payload;
}
async function github() {
  const token = Deno.env.get('CITY_EDITOR_GITHUB_TOKEN'); check(token, 'Brak CITY_EDITOR_GITHUB_TOKEN.');
  async function call(path, method = 'GET', body = null, optional = false) {
    const result = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}` + path, {
      method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000)
    });
    if (optional && result.status === 404) return null;
    check(result.ok, 'GitHub HTTP ' + result.status + '. Sprawdź uprawnienia, limit API i ochronę gałęzi.');
    return result.json();
  }
  const repo = await call('');
  const branch = Deno.env.get('CITY_EDITOR_BRANCH') || repo.default_branch;
  check(/^[A-Za-z0-9_./-]+$/.test(branch) && !branch.includes('..'), 'Nieprawidłowa gałąź.');
  const refPath = 'heads/' + branch.split('/').map(encodeURIComponent).join('/');
  const ref = await call('/git/ref/' + refPath), head = ref.object.sha;
  const cache = new Map();
  async function read(path, sha) {
    requirePath(path); requireSha(sha);
    const key = sha + ':' + path; if (cache.has(key)) return cache.get(key);
    const file = await call('/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + sha, 'GET', null, true);
    if (!file) { cache.set(key, null); return null; }
    check(file.type === 'file' && !file.submodule_git_url, 'Nieobsługiwany typ pliku.');
    check(file.size <= MAX_BYTES, 'Plik przekracza limit podglądu 256 KiB.');
    // Git Contents reports symlinks as files in some responses: verify the tree entry.
    const gitCommit = await call('/git/commits/' + sha);
    let treeSha = gitCommit.tree.sha, entry = null;
    const parts = path.split('/');
    for (let n = 0; n < parts.length; n++) {
      const tree = await call('/git/trees/' + treeSha);
      check(!tree.truncated, 'Niepełne drzewo Git.');
      entry = tree.tree.find(item => item.path === parts[n]);
      check(entry, 'Brak wpisu w drzewie Git.');
      if (n < parts.length - 1) { check(entry.type === 'tree', 'Nieprawidłowy katalog.'); treeSha = entry.sha; }
    }
    check(entry.type === 'blob' && ['100644', '100755'].includes(entry.mode) && entry.sha === file.sha, 'Symlinki i nietypowe pliki nie są obsługiwane.');
    const blob = file.encoding === 'base64' ? file : await call('/git/blobs/' + file.sha);
    check(blob.encoding === 'base64', 'Plik nie jest tekstem base64.');
    const bytes = decode64(blob.content); check(bytes.length <= MAX_BYTES, 'Plik jest zbyt duży.');
    const text = dec.decode(bytes); check(!text.includes('\u0000'), 'Plik binarny nie jest obsługiwany.');
    const value = { sha: file.sha, mode: entry.mode, text }; cache.set(key, value); return value;
  }
  async function ancestor(sha) {
    requireSha(sha); if (sha === head) return;
    const compare = await call('/compare/' + sha + '...' + head);
    check(['ahead', 'identical'].includes(compare.status), 'Wybrany commit nie należy do historii aktywnej gałęzi.');
  }
  return { call, branch, head, refPath, read, ancestor };
}
function summary(commit) {
  const message = commit.commit.message;
  return { sha: commit.sha, message, url: commit.html_url,
    author: commit.author?.login || commit.commit.author?.name || 'Nieznany',
    committer: commit.committer?.login || commit.commit.committer?.name || 'Nieznany',
    authorDate: commit.commit.author?.date || null, date: commit.commit.committer?.date || null,
    actorId: message.match(/^Admin-Actor-ID: ([0-9a-f-]{36})$/m)?.[1] || null,
    actorName: message.match(/^Admin-Actor-Name: (.+)$/m)?.[1] || null,
    parents: commit.parents?.map(item => item.sha) || [] };
}
async function changedFile(gh, source, path) {
  requireSha(source); requirePath(path); await gh.ancestor(source);
  let selected = null, count = 0, first = null;
  for (let page = 1; page <= 30; page++) {
    const detail = await gh.call('/commits/' + source + '?per_page=100&page=' + page);
    first ||= detail; const entries = detail.files || []; count += entries.length;
    selected ||= entries.find(file => file.filename === path || file.previous_filename === path);
    if (entries.length < 100) return { detail: first, selected, count };
  }
  throw new Error('Commit przekracza limit 3000 plików. Użyj narzędzi Git.');
}
async function prepare(gh, source, path) {
  const { detail, selected, count } = await changedFile(gh, source, path);
  check(selected, 'Ten commit nie zmienia wskazanego pliku.');
  check(detail.parents?.length === 1, 'Cofanie commitów scalających i początkowego jest zablokowane.');
  check(selected.status !== 'renamed' && !selected.previous_filename, 'Automatyczne cofanie zmiany nazwy jest zablokowane.');
  const [before, after, current] = await Promise.all([gh.read(path, detail.parents[0].sha), gh.read(path, source), gh.read(path, gh.head)]);
  const plan = planUndo({ path, before: before?.text ?? null, after: after?.text ?? null, current: current?.text ?? null });
  check(!(plan.content === null && !current), 'Plik jest już usunięty.');
  return { plan, current, mode: current?.mode || before?.mode || '100644', count };
}
Deno.serve(async req => {
  if (req.headers.get('Origin') && req.headers.get('Origin') !== ORIGIN) return response(403, { error: 'Niedozwolone pochodzenie.' });
  if (req.method === 'OPTIONS') return response(200, { ok: true });
  if (req.method !== 'POST') return response(405, { error: 'Użyj POST.' });
  try {
    const user = await authenticate(req), input = await readBody(req);
    if (input.action === 'access') return response(200, { ok: true });
    const gh = await github();
    if (input.action === 'list') {
      const page = Number(input.page || 1); check(Number.isSafeInteger(page) && page >= 1 && page <= 1000, 'Nieprawidłowa strona.');
      if (input.path) requirePath(input.path);
      const anchor = input.anchor || gh.head; await gh.ancestor(anchor);
      const query = new URLSearchParams({ sha: anchor, page: String(page), per_page: '20' });
      if (input.path) query.set('path', input.path);
      const commits = await gh.call('/commits?' + query);
      return response(200, { branch: gh.branch, head: gh.head, anchor, page, hasNext: commits.length === 20, commits: commits.map(summary) });
    }
    if (input.action === 'detail') {
      requireSha(input.source); await gh.ancestor(input.source);
      const page = Number(input.page || 1); check(Number.isSafeInteger(page) && page >= 1 && page <= 30, 'Nieprawidłowa strona.');
      const detail = await gh.call('/commits/' + input.source + '?per_page=100&page=' + page);
      return response(200, { commit: summary(detail), page, hasNext: detail.files?.length === 100,
        files: (detail.files || []).map(file => ({ path: file.filename, status: file.status, additions: file.additions,
          deletions: file.deletions, previousPath: file.previous_filename || null, patch: file.patch?.slice(0, 50000) || null,
          patchTruncated: !!file.patch && file.patch.length > 50000, allowed: allowedPath(file.filename) })) });
    }
    if (input.action === 'version') {
      const { detail, selected } = await changedFile(gh, input.source, input.path); check(selected, 'Commit nie zmienia pliku.');
      const beforePath = selected.previous_filename || input.path;
      const [before, after, current] = await Promise.all([
        detail.parents[0] ? gh.read(beforePath, detail.parents[0].sha) : null,
        gh.read(input.path, input.source), gh.read(input.path, gh.head)
      ]);
      return response(200, { head: gh.head, before: before?.text ?? null, after: after?.text ?? null, current: current?.text ?? null });
    }
    check(['preview', 'publish'].includes(input.action), 'Nieznana operacja.');
    requireSha(input.source); requirePath(input.path);
    const approval = input.action === 'publish' ? await verify(input.previewToken) : null;
    if (approval) {
      check(approval.user === user.id && approval.head === gh.head && approval.branch === gh.branch && approval.source === input.source && approval.path === input.path,
        'Podgląd nie pasuje do konta albo repozytorium zmieniło się. Przygotuj nowy podgląd.');
    }
    const prepared = await prepare(gh, input.source, input.path), { plan, current, mode, count } = prepared;
    const bound = { user: user.id, head: gh.head, branch: gh.branch, source: input.source, path: input.path,
      result: await digest(JSON.stringify({ content: plan.content, mode })), oldBlob: current?.sha || null };
    if (input.action === 'preview') {
      const operation = crypto.randomUUID(), date = new Date().toISOString();
      return response(200, { head: gh.head, branch: gh.branch, ...plan, current: current?.text ?? null,
        previewToken: await sign({ ...bound, operation, date, exp: Date.now() + 600000 }),
        warnings: [ 'Zmieniony będzie wyłącznie ten plik. Pozostałe pliki wskazanego commitu nie zostaną cofnięte.',
          ...(count > 1 ? ['Wybrany commit zmieniał ' + count + ' plików. Sprawdź powiązania — cofnięcie pojedynczego pliku może wymagać ręcznej weryfikacji.'] : []),
          'Poprawny JSON nie gwarantuje zgodności z logiką gry. Nie migrujemy zapisów ani szkiców.',
          'Commit na GitHubie nie jest potwierdzeniem wdrożenia na hosting.' ] });
    }
    for (const [key, value] of Object.entries(bound)) check(approval[key] === value, 'Treść lub kontekst podglądu zmieniły się.');
    check(typeof approval.operation === 'string' && /^[a-f0-9-]{36}$/i.test(approval.operation), 'Brak identyfikatora operacji.');
    const parent = await gh.call('/git/commits/' + gh.head);
    const entry = { path: input.path, mode, type: 'blob', ...(plan.content === null ? { sha: null } : { content: plan.content }) };
    const tree = await gh.call('/git/trees', 'POST', { base_tree: parent.tree.sha, tree: [entry] });
    const commit = await gh.call('/git/commits', 'POST', {
      message: commitMessage({ path: input.path, source: input.source, operation: approval.operation, user }),
      tree: tree.sha, parents: [gh.head], author: { name: actorLabel(user), email: user.id + '@admin.invalid', date: approval.date }
    });
    try { await gh.call('/git/refs/' + gh.refPath, 'PATCH', { sha: commit.sha, force: false }); }
    catch {
      // A timeout can happen after GitHub accepted the update. Confirm ancestry before reporting success.
      try {
        const ref = await gh.call('/git/ref/' + gh.refPath);
        if (ref.object.sha !== commit.sha) {
          const compare = await gh.call('/compare/' + commit.sha + '...' + ref.object.sha);
          check(['ahead', 'identical'].includes(compare.status), 'Nie opublikowano.');
        }
      } catch {
        return response(409, { error: 'Nie potwierdzono publikacji. Sprawdź historię przed ponowieniem. Możliwy równoległy zapis.', candidate: commit.sha });
      }
    }
    return response(200, { ok: true, commit: commit.sha, url: `https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`,
      message: 'Utworzono nowy commit. Historia gałęzi i pozostałe pliki pozostały zachowane. Hosting nie został zweryfikowany.' });
  } catch (error) { return response(400, { error: error.message || 'Błąd historii publikacji.' }); }
});
