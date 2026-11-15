import { supabase } from '../../supabase-client.js';
const $ = id => document.getElementById(id);
const state = { authorised: false, busy: false, page: 1, head: null, hasNext: false, row: null, path: null, detail: null,
  oldUrl: null, newUrl: null, image: null, upload: null, scanToken: null, scanCursor: 0, scanComplete: false, scanSummary: null,
  hits: [], skipped: [], preview: null, scanning: false, cancelled: false };
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function clearApproval() { state.preview = null; $('approval').hidden = true; $('ack').checked = false; }
function disposeMedia() {
  for (const audio of document.querySelectorAll('audio')) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  for (const key of ['oldUrl', 'newUrl']) { if (state[key]) URL.revokeObjectURL(state[key]); state[key] = null; }
  $('media-box').replaceChildren(); $('new-media').replaceChildren(); state.image = null; state.upload = null;
  $('new-file').value = ''; $('new-info').textContent = '';
}
function clearDetail() {
  disposeMedia(); clearApproval(); state.row = null; state.path = null; state.detail = null;
  state.scanToken = null; state.scanCursor = 0; state.scanComplete = false; state.scanSummary = null;
  state.hits = []; state.skipped = []; $('detail').hidden = true; $('uses').replaceChildren(); $('skipped').textContent = ''; $('scan-status').textContent = '';
}
function controls() {
  for (const item of document.querySelectorAll('button,input,select')) item.disabled = state.busy || !state.authorised;
  $('prev').disabled ||= state.page <= 1; $('next').disabled ||= !state.hasNext;
  $('copy').disabled ||= !state.row?.key; $('media').disabled ||= !state.path;
  $('scan').disabled ||= !state.path;
  $('new-file').disabled ||= !state.detail?.replaceable || !state.image;
  $('preview').disabled ||= !state.upload || !state.scanComplete;
  $('publish').disabled ||= !state.preview || !$('ack').checked;
  $('cancel').hidden = !state.scanning; $('cancel').disabled = !state.scanning;
}
async function action(task) {
  if (state.busy || !state.authorised) return; state.busy = true; controls();
  try { await task(); } catch (error) { clearApproval(); status(error.message, true); }
  finally { state.busy = false; controls(); }
}
async function api(body) {
  const { data, error } = await supabase.functions.invoke('asset-library', { body });
  if (error) {
    let message = error.message;
    try { const detail = await error.context.json(); message = detail.error || message; if (detail.candidate) message += ' Commit do sprawdzenia: ' + detail.candidate; } catch {}
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Brak odpowiedzi funkcji asset-library.'); return data;
}
function selected(action, rest = {}) { return { action, id: state.row.id, path: state.path, head: state.head, ...rest }; }
function size(bytes) { return bytes == null ? 'nieznany rozmiar' : (bytes / 1024).toFixed(1) + ' KiB'; }
function line(list, value) { const item = document.createElement('li'); item.textContent = value; list.append(item); }
async function catalog(page = 1) {
  clearDetail(); const result = await api({ action: 'catalog', query: $('query').value.trim(), type: $('type').value, page });
  state.head = result.head; state.page = result.page; state.hasNext = result.hasNext;
  $('rows').replaceChildren(); $('page').textContent = 'Strona ' + state.page;
  $('count').textContent = result.total + ' pozycji · gałąź ' + result.branch;
  for (const row of result.rows) {
    const item = document.createElement('button'); item.className = 'row'; item.type = 'button'; item.dataset.id = row.id;
    item.textContent = (row.type === 'image' ? 'Grafika: ' : 'Dźwięk: ') + (row.key || row.paths[0]);
    const details = document.createElement('small'); details.textContent = (row.paths.join(' | ') || 'Adres zewnętrzny / niestandardowy') + ' · ' + row.files.map(f => size(f.bytes)).join(' / ');
    item.append(details); item.setAttribute('aria-pressed', 'false'); item.onclick = () => void action(() => detail(row)); $('rows').append(item);
  }
  if (!result.rows.length) $('rows').textContent = 'Brak wyników.';
  status('Katalog GitHub · ' + result.head.slice(0, 12));
}
async function detail(row, variant = null) {
  clearDetail(); state.row = row; state.path = variant || row.paths[0];
  if (!state.path) { status('Asset nie ma lokalnego pliku. Zewnętrzne adresy nie są pobierane przez bibliotekę.', true); return; }
  const data = await api(selected('detail')); state.detail = data;
  $('detail').hidden = false; $('title').textContent = row.key || state.path;
  $('variant').replaceChildren(); for (const path of row.paths) $('variant').add(new Option(path, path)); $('variant').value = state.path;
  for (const item of $('rows').children) item.setAttribute('aria-pressed', String(item.dataset.id === row.id));
  $('metadata').textContent = ['Klucz: ' + (row.key || 'brak wpisu w manifestach — możliwe ładowanie dynamiczne'),
    'Typ: ' + row.type, 'Ścieżka: ' + state.path, 'Rozmiar: ' + size(data.bytes), 'Grupy: ' + (row.groups.join(', ') || 'brak'),
    'Deklaracja: ' + (row.declaration || 'plik znaleziony w repozytorium poza manifestami'), 'Wersja: ' + data.head].join('\n');
  $('aliases').replaceChildren(); for (const alias of data.aliases) line($('aliases'), alias.id + ' — ' + alias.declaration);
  if (!data.aliases.length) line($('aliases'), 'Brak deklaracji w podzielonych manifestach. To nie oznacza, że plik jest nieużywany.');
  $('assignments').replaceChildren();
  for (const item of data.bundles) line($('assignments'), item.bundle + ' → ' + item.refs.join(', '));
  for (const item of data.startup) line($('assignments'), 'startup.' + item.group + ' → ' + item.refs.join(', '));
  if (!data.bundles.length && !data.startup.length) line($('assignments'), 'Brak przypisania w bundle/startup. Sprawdź dane i kod.');
  $('static-warning').textContent = data.warning;
  $('replace-note').textContent = data.replaceable ? 'Najpierw wczytaj podgląd i wykonaj skan użyć. Nowy obraz zostanie zapisany statycznie w formacie pliku docelowego.' : 'Podmiana tego formatu jest zablokowana. Dźwięki mają podgląd, ale nie są nadpisywane przez tę wersję biblioteki.';
  status('Wybrano ' + state.path + '. Przypisania w manifestach są gotowe; pełniejsza analiza wymaga skanu danych i kodu.');
}
function bytes64(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
function imageAt(url, host, alt) { const image = document.createElement('img'); image.src = url; image.alt = alt; host.replaceChildren(image); return image; }
async function media() {
  const data = await api(selected('media'));
  if (state.oldUrl) URL.revokeObjectURL(state.oldUrl);
  for (const audio of $('media-box').querySelectorAll('audio')) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  const blob = new Blob([bytes64(data.base64)], { type: data.mime }); state.oldUrl = URL.createObjectURL(blob);
  $('media-box').replaceChildren();
  if (state.row.type === 'image') {
    const image = imageAt(state.oldUrl, $('media-box'), state.path);
    try { await image.decode(); } catch { state.image = null; throw new Error('Przeglądarka nie może zdekodować tego obrazu. Podmiana zablokowana.'); }
    state.image = data.image;
    if (data.image && (image.naturalWidth !== data.image.width || image.naturalHeight !== data.image.height)) {
      state.image = null; status('Obraz ma orientację lub metadane zmieniające rozmiar wyświetlania. Podmiana wymaga ręcznej normalizacji pliku.', true); return;
    }
    if (data.image) $('metadata').textContent += '\nWymiary nagłówka: ' + data.image.width + ' × ' + data.image.height;
  } else {
    const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata'; audio.src = state.oldUrl;
    audio.onerror = () => status('Przeglądarka nie obsługuje pliku lub nie może go odtworzyć.', true);
    $('media-box').append(audio);
  }
  status('Wczytano podgląd z repozytorium. Dźwięk nie uruchamia się automatycznie.');
}
function showHits(hits) {
  for (const hit of hits) {
    if (state.hits.length >= 5000) break;
    state.hits.push(hit); const node = document.createElement('div'); node.className = 'use';
    node.textContent = hit.path + ' · ' + hit.location + '\n' + hit.kind + (hit.label ? ' · ' + hit.label : '') + '\n' + hit.value;
    node.style.whiteSpace = 'pre-wrap'; $('uses').append(node);
  }
}
async function scan() {
  clearApproval(); state.cancelled = false; state.scanning = true; controls();
  if (state.scanComplete) { state.scanToken = null; state.scanCursor = 0; state.scanComplete = false; state.hits = []; state.skipped = []; $('uses').replaceChildren(); }
  try {
    do {
      if (state.cancelled || !state.authorised) break;
      const result = await api(selected('scan', { cursor: state.scanCursor, scanToken: state.scanToken }));
      state.scanCursor = result.next; state.scanToken = result.scanToken; state.scanComplete = result.complete; state.scanSummary = result.summary;
      showHits(result.hits); state.skipped.push(...result.skipped);
      $('skipped').textContent = state.skipped.slice(0, 200).join('\n') + (state.skipped.length > 200 ? '\nLista pominięć skrócona.' : '');
      $('scan-status').textContent = `Przejrzano ${result.next}/${result.total} plików. Trafienia: ${result.summary.hits}. Pominięte: ${result.summary.skipped}. Partie z ograniczoną listą: ${result.summary.limited}.` + (result.summary.hits > state.hits.length ? ' Wyświetlana lista nie obejmuje wszystkich trafień.' : '');
    } while (!state.scanComplete);
    status(state.scanComplete ? 'Skan zakończony. Sprawdź listę użyć i ograniczenia przed podmianą.' : 'Skan przerwany. Ponowne kliknięcie kontynuuje od ostatniej zakończonej partii.');
  } finally { state.scanning = false; }
}
async function chooseImage() {
  clearApproval(); state.upload = null; if (state.newUrl) URL.revokeObjectURL(state.newUrl); state.newUrl = null;
  $('new-media').replaceChildren(); $('new-info').textContent = '';
  const file = $('new-file').files[0]; if (!file) return;
  if (!state.image) throw new Error('Najpierw wczytaj obecny obraz.');
  if (file.size > 4 * 1024 * 1024) throw new Error('Wybrany plik przekracza 4 MiB.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Wybierz PNG, JPEG lub WebP.');
  const bitmap = await createImageBitmap(file);
  let blob;
  try {
    if (bitmap.width !== state.image.width || bitmap.height !== state.image.height) throw new Error(`Wymagane wymiary: ${state.image.width} × ${state.image.height}. Wybrano: ${bitmap.width} × ${bitmap.height}.`);
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Brak obsługi canvas.');
    if (state.image.mime === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(bitmap, 0, 0);
    blob = await new Promise(resolve => canvas.toBlob(resolve, state.image.mime, 0.95));
  } finally { bitmap.close(); }
  if (!blob || blob.type !== state.image.mime) throw new Error('Przeglądarka nie potrafi zakodować formatu docelowego.');
  if (blob.size > 4 * 1024 * 1024) throw new Error('Obraz po zapisaniu przekracza 4 MiB.');
  const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Nie można odczytać nowego obrazu.')); reader.readAsDataURL(blob); });
  state.upload = { base64 }; state.newUrl = URL.createObjectURL(blob); imageAt(state.newUrl, $('new-media'), 'Nowy obraz po konwersji do formatu docelowego');
  $('new-info').textContent = `${file.name} → ${state.image.format}, ${state.image.width} × ${state.image.height}, ${size(blob.size)}. Podgląd pokazuje plik, który zostanie opublikowany.`;
  status(state.scanComplete ? 'Nowy obraz gotowy. Przygotuj podgląd podmiany.' : 'Nowy obraz gotowy. Zakończ skan przypisań.');
}
async function preview() {
  clearApproval(); if (!state.scanComplete || !state.upload) throw new Error('Potrzebny jest nowy obraz i zakończony skan.');
  const result = await api(selected('preview', { base64: state.upload.base64, scanToken: state.scanToken }));
  state.preview = result;
  $('plan').textContent = ['Plik: ' + result.path, 'Gałąź: ' + result.branch, 'Baza: ' + result.head,
    'Klucze korzystające z pliku: ' + (result.aliases.map(a => a.id).join(', ') || 'brak deklaracji w manifestach'),
    'Przypisania bundle: ' + (result.bundles.map(b => b.bundle).join(', ') || 'brak'),
    'Wymiary: ' + result.dimensions.next.width + ' × ' + result.dimensions.next.height,
    'Skanowane pliki: ' + result.scan.cursor + ', trafienia: ' + result.scan.hits + ', pominięte: ' + result.scan.skipped].join('\n');
  $('warnings').replaceChildren(); for (const warning of result.warnings) line($('warnings'), warning);
  $('approval').hidden = false; status('Sprawdź podgląd obecnej i nowej grafiki oraz listę wszystkich wspólnych użyć.');
}
async function publish() {
  if (!state.preview || !$('ack').checked || !state.upload) throw new Error('Najpierw zatwierdź podgląd.');
  if (!confirm('Podmienić wspólny plik ' + state.path + ' na gałęzi ' + state.preview.branch + '?\n\nZmiana obejmie wszystkie jego klucze i przypisania. Powstanie nowy commit.')) return;
  const body = selected('publish', { base64: state.upload.base64, scanToken: state.scanToken, previewToken: state.preview.previewToken });
  clearApproval(); const result = await api(body); await catalog(1); status(result.message + ' Commit: ' + result.commit);
}
$('search').onsubmit = event => { event.preventDefault(); void action(() => catalog(1)); };
$('prev').onclick = () => void action(() => catalog(state.page - 1)); $('next').onclick = () => void action(() => catalog(state.page + 1));
$('variant').onchange = () => { const row = state.row, variant = $('variant').value; void action(() => detail(row, variant)); };
$('copy').onclick = () => void action(async () => { await navigator.clipboard.writeText(state.row.key); status('Skopiowano klucz: ' + state.row.key); });
$('media').onclick = () => void action(media); $('scan').onclick = () => void action(scan); $('cancel').onclick = () => { state.cancelled = true; status('Kończę bieżącą partię skanu…'); };
$('new-file').onchange = () => void action(chooseImage); $('preview').onclick = () => void action(preview); $('publish').onclick = () => void action(publish); $('ack').onchange = controls;
supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { state.authorised = false; state.cancelled = true; clearDetail(); $('workspace').hidden = true; status('Wylogowano. Odśwież po zalogowaniu.', true); controls(); } });
window.addEventListener('pagehide', disposeMedia);
window.addEventListener('message', event => { if (event.source === parent && event.origin === location.origin && event.data?.type === 'asset-library-visibility' && !event.data.visible) for (const audio of document.querySelectorAll('audio')) audio.pause(); });
controls();
try { await api({ action: 'access' }); state.authorised = true; $('workspace').hidden = false; await action(() => catalog(1)); }
catch (error) { status('Nie można otworzyć biblioteki: ' + error.message, true); }
