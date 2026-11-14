export const MAX_BYTES = 262144;
export const check = (value, message) => { if (!value) throw new Error(message); };
export function allowedPath(path) {
  return typeof path === 'string' && path.length < 350 && !path.includes('..') && !path.includes('\\') &&
    /^(?:assets\/(?:data|manifests)\/[A-Za-z0-9_./-]+\.json|config\/Travel[A-Za-z0-9_./-]*\.(?:js|json)|ui\/DestinationMeta\.js)$/.test(path);
}
export function requirePath(path) { check(allowedPath(path), 'Plik poza zakresem historii treści administratora.'); return path; }
export function requireSha(sha) { check(typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha), 'Nieprawidłowy SHA commitu.'); return sha; }
const MISSING = Symbol('missing');
const record = value => value !== MISSING && value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => value === MISSING ? MISSING : structuredClone(value);
function equal(a, b, depth = 0) {
  check(depth < 80, 'Zbyt głęboka struktura JSON.');
  if (a === b) return true;
  if (a === MISSING || b === MISSING || a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key], depth + 1));
}
function idList(items) {
  if (!Array.isArray(items)) return null;
  const ids = [], values = new Map();
  for (const item of items) {
    if (!record(item) || !['string', 'number'].includes(typeof item.id)) return null;
    if (typeof item.id === 'number' && !Number.isFinite(item.id)) return null;
    const id = typeof item.id + ':' + item.id;
    if (values.has(id)) return null;
    ids.push(id); values.set(id, item);
  }
  return { ids, values };
}
export function reverseJsonChange(before, after, current) {
  let work = 0;
  const get = (object, key) => Object.hasOwn(object, key) ? object[key] : MISSING;
  const conflict = path => { throw new Error('Konflikt późniejszych zmian: ' + (path || '(cały plik)') + '. Niczego nie opublikowano.'); };
  function merge(old, changed, live, path = '', depth = 0) {
    check(++work <= 100000 && depth < 70, 'Struktura jest zbyt złożona do automatycznego cofnięcia.');
    if (equal(old, changed)) return clone(live);
    if (equal(live, changed)) return clone(old);
    if (equal(live, old)) return clone(live);
    if (old === MISSING || changed === MISSING || live === MISSING) return conflict(path);
    if (record(old) && record(changed) && record(live)) {
      const out = Object.create(null);
      for (const key of Object.keys(live)) out[key] = clone(live[key]);
      for (const key of new Set([...Object.keys(old), ...Object.keys(changed)])) {
        const result = merge(get(old, key), get(changed, key), get(live, key), path + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1'), depth + 1);
        if (result === MISSING) delete out[key]; else out[key] = result;
      }
      return out;
    }
    const a = idList(old), b = idList(changed), c = idList(live);
    if (a && b && c) {
      const commonA = a.ids.filter(id => b.values.has(id)), commonB = b.ids.filter(id => a.values.has(id));
      if (!equal(commonA, commonB)) return conflict(path + '/(kolejność elementów)');
      const out = new Map(c.values);
      for (const id of new Set([...a.ids, ...b.ids])) {
        const value = merge(a.values.has(id) ? a.values.get(id) : MISSING, b.values.has(id) ? b.values.get(id) : MISSING,
          c.values.has(id) ? c.values.get(id) : MISSING, path + '/[' + id + ']', depth + 1);
        if (value === MISSING) out.delete(id); else out.set(id, value);
      }
      const order = c.ids.filter(id => out.has(id));
      for (let index = 0; index < a.ids.length; index++) {
        const id = a.ids[index];
        if (!out.has(id) || order.includes(id)) continue;
        const prev = a.ids.slice(0, index).reverse().find(key => order.includes(key));
        const next = a.ids.slice(index + 1).find(key => order.includes(key));
        if (prev && next && order.indexOf(prev) >= order.indexOf(next)) return conflict(path + '/(miejsce przywrócenia elementu)');
        if (next) order.splice(order.indexOf(next), 0, id);
        else if (prev) order.splice(order.indexOf(prev) + 1, 0, id);
        else order.push(id);
      }
      return order.map(id => clone(out.get(id)));
    }
    return conflict(path);
  }
  return merge(before, after, current);
}
export function planUndo({ path, before, after, current }) {
  requirePath(path);
  check(before !== after, 'Wybrany commit nie zmienił zawartości tego pliku.');
  check(current !== before, 'Ta zmiana jest już cofnięta albo plik ma już poprzednią zawartość.');
  let content;
  if (current === after) content = before;
  else {
    check(before !== null && after !== null && current !== null, 'Konflikt dodania lub usunięcia pliku. Późniejszej wersji nie nadpisano.');
    check(path.endsWith('.json'), 'Plik kodu został później zmieniony. Automatyczne cofnięcie zablokowane, aby nie nadpisać cudzej pracy.');
    let old, changed, live;
    try { old = JSON.parse(before); changed = JSON.parse(after); live = JSON.parse(current); }
    catch { throw new Error('Niepoprawny JSON — automatyczne scalanie zablokowane.'); }
    const result = reverseJsonChange(old, changed, live);
    check(!equal(result, live), 'Brak zmian do cofnięcia — wskazana zmiana jest już odwrócona.');
    content = JSON.stringify(result, null, 2) + '\n';
  }
  if (content !== null && path.endsWith('.json')) {
    try { JSON.parse(content); } catch { throw new Error('Wynik nie jest poprawnym JSON-em.'); }
  }
  if (content !== null) check(new TextEncoder().encode(content).length <= MAX_BYTES, 'Wynik przekracza limit 256 KiB.');
  return { content, deleted: content === null, merged: current !== after };
}
export function actorLabel(user) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || 'Admin ' + user.id.slice(0, 8);
  return String(name).replace(/[\r\n\x00-\x1f\x7f]/g, ' ').trim().slice(0, 100) || 'Admin';
}
export function commitMessage({ path, source, operation, user }) {
  return 'Admin history: undo ' + source.slice(0, 12) + ' in ' + path + '\n\n' +
    'Cofnięto wyłącznie zmianę wybranego pliku; pozostałe pliki bez zmian.\n\n' +
    'History-Operation: ' + operation + '\nAdmin-Actor-ID: ' + user.id + '\nAdmin-Actor-Name: ' + actorLabel(user);
}
