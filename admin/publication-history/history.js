import { supabase } from '../../supabase-client.js';
const $ = id => document.getElementById(id);
const state = { busy: false, authorised: false, page: 1, anchor: null, hasNext: false, branch: null,
  selected: null, file: null, detailPage: 1, detailMore: false, preview: null };
const text = value => value === null ? '(plik nie istnieje)' : String(value ?? '');
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function resetApproval() { state.preview = null; $('approval').hidden = true; $('ack').checked = false; }
function resetFile() { state.file = null; $('file-panel').hidden = true; $('versions-panel').hidden = true; resetApproval(); }
function controls() {
  for (const item of document.querySelectorAll('button,input')) item.disabled = state.busy || !state.authorised;
  $('prev').disabled ||= state.page <= 1; $('next').disabled ||= !state.hasNext;
  $('versions').disabled ||= !state.file?.allowed;
  $('preview').disabled ||= !state.file?.allowed || state.file?.status === 'renamed' || state.selected?.parents.length !== 1;
  $('publish').disabled ||= !state.preview || !$('ack').checked;
}
async function action(task) {
  if (state.busy || !state.authorised) return;
  state.busy = true; controls();
  try { await task(); } catch (error) { resetApproval(); status(error.message, true); }
  finally { state.busy = false; controls(); }
}
async function api(body) {
  const { data, error } = await supabase.functions.invoke('publication-history', { body });
  if (error) {
    let message = error.message;
    try { const detail = await error.context.json(); message = detail.error || message; if (detail.candidate) message += ' Commit do sprawdzenia: ' + detail.candidate; } catch {}
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Brak odpowiedzi funkcji publication-history.');
  return data;
}
function date(value) { return value ? new Date(value).toLocaleString('pl-PL') : 'brak daty'; }
function button(className, title, subtitle, callback) {
  const element = document.createElement('button'); element.type = 'button'; element.className = className;
  const heading = document.createElement('span'); heading.textContent = title; element.append(heading);
  if (subtitle) { const small = document.createElement('small'); small.textContent = subtitle; element.append(small); }
  element.onclick = () => void action(callback); return element;
}
async function list(page = 1, refresh = false) {
  resetFile(); state.selected = null; $('files').replaceChildren(); $('commit-info').textContent = 'Wybierz commit.'; $('more-files').hidden = true;
  const result = await api({ action: 'list', page, path: $('path').value.trim(), anchor: refresh ? null : state.anchor });
  state.page = result.page; state.anchor = result.anchor; state.hasNext = result.hasNext; state.branch = result.branch;
  $('page').textContent = 'Strona ' + state.page; $('commits').replaceChildren();
  for (const commit of result.commits) {
    const item = button('commit', commit.message.split('\n')[0], commit.sha.slice(0, 12) + ' · ' + commit.author + ' · ' + date(commit.date), () => detail(commit.sha));
    item.dataset.sha = commit.sha; item.setAttribute('aria-pressed', 'false'); $('commits').append(item);
  }
  if (!result.commits.length) $('commits').textContent = 'Brak commitów dla tego filtra.';
  status('Gałąź: ' + result.branch + ' · historia do ' + result.anchor.slice(0, 12));
}
async function detail(source, append = false) {
  resetFile();
  const result = await api({ action: 'detail', source, page: append ? state.detailPage + 1 : 1 });
  state.selected = result.commit; state.detailPage = result.page; state.detailMore = result.hasNext;
  if (!append) $('files').replaceChildren();
  for (const item of $('commits').children) item.setAttribute('aria-pressed', String(item.dataset.sha === source));
  const commit = result.commit;
  $('commit-info').textContent = [commit.message, '', 'SHA: ' + commit.sha, 'Autor Git: ' + commit.author,
    'Committer Git: ' + commit.committer, 'Data zapisu commitu: ' + date(commit.date), 'Data autora: ' + date(commit.authorDate),
    ...(commit.actorId ? ['Operator zadeklarowany w opisie: ' + (commit.actorName || '') + ' [' + commit.actorId + ']'] : ['Operator starego panelu: brak odrębnego zapisu.'])].join('\n');
  for (const file of result.files) {
    const item = button('file', file.path, file.status + ' · +' + file.additions + ' / −' + file.deletions + (file.allowed ? '' : ' · poza zakresem cofania'), async () => {
      resetApproval(); state.file = file; $('file-panel').hidden = false; $('versions-panel').hidden = true;
      $('file-title').textContent = file.path;
      $('patch').textContent = file.patch || 'GitHub nie udostępnił tekstowego diffu. Możesz sprawdzić wersje pliku, jeśli jego format jest obsługiwany.';
      $('patch-note').textContent = file.patchTruncated ? 'Diff skrócony do 50 000 znaków. Sprawdź pełne wersje przed cofnięciem.' : 'Diff dotyczy wybranego commitu, nie późniejszych zmian.';
      for (const node of $('files').children) node.setAttribute('aria-pressed', String(node === item));
      status('Wybrano plik: ' + file.path);
    });
    item.setAttribute('aria-pressed', 'false'); $('files').append(item);
  }
  $('more-files').hidden = !result.hasNext;
  status('Wybrano commit ' + source.slice(0, 12) + '. Wybierz plik.');
}
async function versions() {
  const data = await api({ action: 'version', source: state.selected.sha, path: state.file.path });
  for (const key of ['before', 'after', 'current']) $(key).textContent = text(data[key]);
  $('versions-panel').hidden = false; status('Wczytano wersje. Obecna gałąź: ' + data.head.slice(0, 12));
}
async function preview() {
  resetApproval();
  const result = await api({ action: 'preview', source: state.selected.sha, path: state.file.path });
  state.preview = { ...result, source: state.selected.sha, path: state.file.path };
  $('context').textContent = result.branch + ' · baza ' + result.head.slice(0, 12) + ' · cofana zmiana ' + state.selected.sha.slice(0, 12) +
    (result.merged ? ' · zachowano niezależne późniejsze zmiany JSON' : ' · wynik odpowiada wersji sprzed tej zmiany');
  $('warnings').replaceChildren();
  for (const warning of result.warnings) { const li = document.createElement('li'); li.textContent = warning; $('warnings').append(li); }
  $('live').textContent = text(result.current); $('result').textContent = text(result.content);
  $('approval').hidden = false; status('Podgląd gotowy. Przeczytaj porównanie i ostrzeżenia.');
}
async function publish() {
  const approved = state.preview;
  if (!approved || !$('ack').checked) throw new Error('Najpierw sprawdź podgląd.');
  if (!confirm('Utworzyć nowy commit na gałęzi ' + approved.branch + '?\n\nPlik: ' + approved.path + '\nCofana zmiana: ' + approved.source + '\nBaza: ' + approved.head + '\n\nPozostałe pliki nie zostaną zmienione.')) return;
  // No automatic retries: the first request may have reached GitHub despite a network timeout.
  resetApproval();
  const result = await api({ action: 'publish', source: approved.source, path: approved.path, previewToken: approved.previewToken });
  await list(1, true);
  status(result.message + ' Commit: ' + result.commit);
}
$('filters').onsubmit = event => { event.preventDefault(); void action(() => list(1, true)); };
$('prev').onclick = () => void action(() => list(state.page - 1));
$('next').onclick = () => void action(() => list(state.page + 1));
$('more-files').onclick = () => void action(() => detail(state.selected.sha, true));
$('versions').onclick = () => void action(versions); $('preview').onclick = () => void action(preview);
$('publish').onclick = () => void action(publish); $('ack').onchange = controls;
$('path').oninput = () => { resetApproval(); };
supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {
    state.authorised = false; resetApproval(); $('workspace').hidden = true;
    $('commits').replaceChildren(); $('files').replaceChildren(); status('Wylogowano. Odśwież po zalogowaniu.', true); controls();
  }
});
controls();
try { await api({ action: 'access' }); state.authorised = true; $('workspace').hidden = false; await action(() => list(1, true)); }
catch (error) { status('Nie można otworzyć historii: ' + error.message, true); }
