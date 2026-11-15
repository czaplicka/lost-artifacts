export const MAX_IMAGE = 4 * 1024 * 1024, MAX_MEDIA = 8 * 1024 * 1024, MAX_SOURCE = 512 * 1024;
export const check = (value, message) => { if (!value) throw new Error(message); };
const mediaExt = /\.(png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|m4a|aac|flac|opus)$/i;
export function localPath(value) {
  if (typeof value !== 'string' || value.length > 500 || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null;
  let path; try { path = decodeURIComponent(value.split(/[?#]/)[0]); } catch { return null; }
  path = path.replace(/^\.\//, '').replace(/^\//, '');
  if (!path.startsWith('assets/') || /[\\\x00-\x1f\x7f]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return path;
}
export function mediaType(path) {
  if (!mediaExt.test(path)) return null;
  return /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(path) ? 'image' : 'audio';
}
export function canReplace(path) { return !!localPath(path) && /\.(png|jpe?g|webp)$/i.test(path); }
export function sourceCandidate(path) {
  return /\.(js|mjs|json|html|css)$/i.test(path) &&
    !/^(?:admin|supabase|tests|tools|scripts|reports|node_modules|\.git)\//.test(path) &&
    !/^assets\/(?:vendor|manifests)\//.test(path) && !/(?:^|\/)(?:package-lock\.json|dialogue-migration-report\.json)$/.test(path) && !/\.min\.(js|css)$/.test(path);
}
export function makeCatalog(index, parts, tree) {
  check(index?.version === 2 && Array.isArray(index.files) && parts.length === index.files.length, 'Niepoprawny manifest podzielony.');
  const byPath = new Map(tree.filter(entry => entry.type === 'blob' && ['100644', '100755'].includes(entry.mode)).map(entry => [entry.path, entry]));
  const rows = [], ids = new Set(), registered = new Set();
  parts.forEach((part, position) => {
    check(Array.isArray(part?.assets), 'Brak assets w ' + index.files[position]);
    for (const asset of part.assets) {
      if (!['image', 'audio'].includes(asset.type)) continue;
      check(typeof asset.key === 'string' && asset.key.length > 0 && asset.key.length <= 200, 'Asset bez klucza lub ze zbyt długim kluczem.');
      const id = asset.type + ':' + asset.key; check(!ids.has(id), 'Powtórzony klucz manifestu: ' + id); ids.add(id);
      const urls = Array.isArray(asset.url) ? asset.url : [asset.url]; check(urls.length <= 32, 'Zbyt wiele wariantów jednego assetu.');
      const paths = [...new Set(urls.map(localPath).filter(Boolean))];
      paths.forEach(path => registered.add(path));
      rows.push({ id, type: asset.type, key: asset.key, paths, groups: Array.isArray(asset.groups) ? asset.groups : [],
        declaration: index.files[position], external: urls.length !== urls.map(localPath).filter(Boolean).length,
        files: paths.map(path => ({ path, bytes: byPath.get(path)?.size ?? null, exists: byPath.has(path) })) });
    }
  });
  for (const entry of byPath.values()) {
    if (!entry.path.startsWith('assets/') || !mediaType(entry.path) || registered.has(entry.path)) continue;
    rows.push({ id: 'file:' + entry.path, key: null, type: mediaType(entry.path), paths: [entry.path], groups: [], declaration: null, external: false,
      files: [{ path: entry.path, bytes: entry.size ?? null, exists: true }] });
  }
  check(rows.length <= 20000, 'Katalog przekracza limit 20 000 pozycji.');
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}
export function assignments(rows, index, path) {
  const aliases = rows.filter(row => row.paths.includes(path) && row.key !== null).map(row => ({ id: row.id, key: row.key, declaration: row.declaration }));
  const ids = new Set(aliases.map(row => row.id)), bundles = [], startup = [];
  for (const [bundle, refs] of Object.entries(index.bundles || {})) if (Array.isArray(refs)) {
    const matching = refs.filter(ref => ids.has(ref)); if (matching.length) bundles.push({ bundle, refs: matching });
  }
  for (const [group, refs] of Object.entries(index.startup || {})) if (Array.isArray(refs)) {
    const matching = refs.filter(ref => ids.has(ref)); if (matching.length) startup.push({ group, refs: matching });
  }
  return { aliases, bundles, startup };
}
export function scanSource(path, text, targetPath, aliases, cap = 200) {
  const keys = new Set(aliases.flatMap(item => [item.key, item.id]));
  const hits = []; let total = 0, work = 0;
  function add(kind, location, value, label = '') {
    total++;
    if (hits.length < cap) hits.push({ path, kind, location, value: String(value).slice(0, 220), label: String(label).slice(0, 120) });
  }
  if (path.endsWith('.json')) {
    const doc = JSON.parse(text);
    function walk(value, pointer = '', label = '', depth = 0) {
      check(++work <= 100000 && depth < 80, 'Zbyt złożony JSON.');
      if (typeof value === 'string') {
        if (localPath(value) === targetPath) add('ścieżka w JSON', pointer || '/', value, label);
        else if (keys.has(value)) add('klucz w JSON', pointer || '/', value, label);
      } else if (value && typeof value === 'object') {
        const context = Array.isArray(value) ? label : value.name || value.title || value.city || value.id || label;
        for (const [key, child] of Object.entries(value)) {
          const next = pointer + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1');
          if (!Array.isArray(value) && keys.has(key)) add('nazwa pola JSON — możliwe użycie', next, key, context);
          walk(child, next, context, depth + 1);
        }
      }
    }
    walk(doc);
  } else {
    text.split('\n').forEach((line, index) => {
      if (line.includes(targetPath) || line.includes(encodeURI(targetPath))) add('ścieżka w tekście', 'linia ' + (index + 1), line.trim());
      else if ([...keys].some(key => ['"', "'", '`'].some(quote => line.includes(quote + key + quote)))) add('dosłowny klucz — możliwe użycie', 'linia ' + (index + 1), line.trim());
    });
  }
  return { hits, total, limited: total > hits.length };
}
const ascii = (bytes, start, n) => String.fromCharCode(...bytes.slice(start, start + n));
const u16 = (b, p) => b[p] * 256 + b[p + 1];
const le16 = (b, p) => b[p] + b[p + 1] * 256;
const le24 = (b, p) => b[p] + b[p + 1] * 256 + b[p + 2] * 65536;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff; for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
export function inspectImage(bytes, path) {
  check(bytes instanceof Uint8Array && bytes.length >= 24 && bytes.length <= MAX_MEDIA, 'Nieprawidłowy rozmiar obrazu.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, format;
  if (ascii(bytes, 1, 3) === 'PNG' && bytes[0] === 137 && ascii(bytes, 4, 4) === '\r\n\x1a\n') {
    format = 'png'; let p = 8, first = true, data = false, end = false;
    while (p + 12 <= bytes.length) {
      const size = view.getUint32(p), kind = ascii(bytes, p + 4, 4); check(p + 12 + size <= bytes.length, 'Ucięty PNG.');
      check(crc32(bytes.subarray(p + 4, p + 8 + size)) === view.getUint32(p + 8 + size), 'Błędna suma kontrolna PNG.');
      if (first) { check(kind === 'IHDR' && size === 13, 'Brak nagłówka IHDR.'); width = view.getUint32(p + 8); height = view.getUint32(p + 12); first = false; }
      check(kind !== 'acTL', 'Animowany PNG nie jest podmieniany przez tę bibliotekę.');
      if (kind === 'IDAT' && size > 0) data = true;
      p += size + 12;
      if (kind === 'IEND') { check(size === 0 && p === bytes.length, 'Dane poza końcem PNG.'); end = true; break; }
    }
    check(data && end, 'Niepełny PNG.');
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    format = 'jpeg'; let p = 2, foundScan = false;
    check(bytes.at(-2) === 255 && bytes.at(-1) === 217, 'Brak końca JPEG.');
    while (p + 4 <= bytes.length) {
      check(bytes[p] === 255, 'Nieprawidłowy marker JPEG.');
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 217) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      const size = u16(bytes, p); check(size >= 2 && p + size <= bytes.length, 'Ucięty JPEG.');
      if ([192, 193, 194].includes(marker)) { check(size >= 8, 'Błędny SOF JPEG.'); height = u16(bytes, p + 3); width = u16(bytes, p + 5); }
      if (marker === 218) { foundScan = true; break; }
      p += size;
    }
    check(foundScan && width && height, 'Nieobsługiwany lub niepełny JPEG.');
  } else if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    format = 'webp'; check(view.getUint32(4, true) + 8 === bytes.length, 'Błędny rozmiar WebP.');
    let p = 12, image = false;
    while (p + 8 <= bytes.length) {
      const kind = ascii(bytes, p, 4), size = view.getUint32(p + 4, true), q = p + 8;
      check(q + size + (size % 2) <= bytes.length, 'Ucięty WebP.');
      check(!['ANIM', 'ANMF'].includes(kind), 'Animowany WebP jest zablokowany.');
      if (kind === 'VP8X') { check(size >= 10 && !(bytes[q] & 2), 'Nieobsługiwany WebP.'); width = le24(bytes, q + 4) + 1; height = le24(bytes, q + 7) + 1; }
      if (kind === 'VP8 ') { check(size >= 10 && ascii(bytes, q + 3, 3) === '\x9d\x01\x2a', 'Nieprawidłowy strumień VP8.'); width ??= le16(bytes, q + 6) & 16383; height ??= le16(bytes, q + 8) & 16383; image = true; }
      if (kind === 'VP8L') { check(size >= 5 && bytes[q] === 47, 'Nieprawidłowy strumień VP8L.'); width ??= 1 + bytes[q + 1] + ((bytes[q + 2] & 63) << 8); height ??= 1 + (bytes[q + 2] >> 6) + (bytes[q + 3] << 2) + ((bytes[q + 4] & 15) << 10); image = true; }
      p = q + size + (size % 2);
    }
    check(image && p === bytes.length, 'Niepełny WebP.');
  } else throw new Error('Dozwolone są prawdziwe pliki PNG, JPEG i WebP.');
  const expected = /\.png$/i.test(path) ? 'png' : /\.jpe?g$/i.test(path) ? 'jpeg' : /\.webp$/i.test(path) ? 'webp' : null;
  check(expected === format, 'Format danych nie pasuje do rozszerzenia pliku docelowego.');
  check(Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 && width <= 8192 && height <= 8192 && width * height <= 16777216, 'Nieobsługiwane lub zbyt duże wymiary obrazu.');
  return { width, height, format, mime: { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[format], bytes: bytes.length };
}
export function validateReplacement(oldBytes, nextBytes, path) {
  check(canReplace(path), 'Podmiana obsługuje tylko istniejące PNG, JPEG i WebP w assets/.');
  check(nextBytes.length <= MAX_IMAGE, 'Nowy obraz przekracza 4 MiB.');
  const old = inspectImage(oldBytes, path), next = inspectImage(nextBytes, path);
  check(old.width === next.width && old.height === next.height, `Zachowaj wymiary ${old.width} × ${old.height}. Nowy obraz ma ${next.width} × ${next.height}.`);
  return { old, next };
}
