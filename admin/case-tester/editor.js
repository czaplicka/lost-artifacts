import { supabase } from '../../supabase-client.js';
import { loadSplitManifest } from '../../managers/ManifestLoader.js';
import { MAIN_STORY_STAGES } from '../../MainStoryData.js';
import { STARTS, validateOptions } from './presets.js';
const $ = id => document.getElementById(id);
let catalog = null, frame = null, channel = null, lastOptions = null, lastUser = null, busy = false, visible = true;
const logLines = [];
function log(text) {
  logLines.push(new Date().toLocaleTimeString() + ' ' + text);
  if (logLines.length > 150) logLines.shift();
  $('log').textContent = logLines.join('\n');
}
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
function option(select, value, text) { select.add(new Option(String(text), String(value))); }
function cityId(city) { return String(city.id ?? city.city); }
async function checkAccess() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) throw new Error('Zaloguj się w panelu administratora.');
  const access = await supabase.functions.invoke('city-editor-online', { body: { action: 'access' } });
  if (access.error || access.data?.ok !== true || access.data?.error) throw new Error(access.data?.error || access.error?.message || 'Brak uprawnień administratora.');
  if (lastUser && lastUser !== data.session.user.id) { stop(); throw new Error('Zmieniło się konto. Odśwież tester.'); }
  lastUser = data.session.user.id;
}
async function readJson(url) {
  const response = await fetch(new URL(url, document.baseURI), { cache: 'no-cache' });
  if (!response.ok) throw new Error('Nie można wczytać ' + url + ': HTTP ' + response.status);
  return response.json();
}
async function loadCatalog() {
  const manifest = await loadSplitManifest(await readJson('assets/manifests/index.json'));
  const pairs = await Promise.all(['suspects', 'missions', 'locations'].map(async key => {
    const entry = manifest.json.find(item => item.key === key);
    if (!entry) throw new Error('Brak wpisu w manifeście: ' + key);
    const items = await readJson(entry.url);
    if (!Array.isArray(items) || !items.length) throw new Error('Pusta lub niepoprawna lista: ' + key);
    return [key, items];
  }));
  catalog = Object.fromEntries(pairs);
  option($('thiefId'), '', 'Losowy');
  for (const thief of catalog.suspects) option($('thiefId'), thief.id, thief.name || thief.id);
  option($('crimeCityId'), '', 'Dowolne zgodne ze sprawą');
  for (const city of catalog.locations.filter(item => item.isCrimeCity === true)) option($('crimeCityId'), cityId(city), city.city);
  option($('startCityId'), '', 'Miasto przestępstwa');
  for (const city of catalog.locations) option($('startCityId'), cityId(city), city.city);
  for (const start of STARTS) option($('start'), start.id, start.label);
  for (const stage of MAIN_STORY_STAGES) option($('storyStage'), stage.id, stage.title + ' [' + stage.id + ']');
  updateMissions(); updateCityControl();
}
function updateMissions() {
  const old = $('missionIndex').value;
  const selectedCity = catalog.locations.find(item => cityId(item) === $('crimeCityId').value);
  $('missionIndex').replaceChildren(); option($('missionIndex'), '', 'Losowa');
  catalog.missions.forEach((mission, index) => {
    if (selectedCity && mission.city !== selectedCity.city) return;
    if (!catalog.locations.some(city => city.isCrimeCity === true && city.city === mission.city)) return;
    const artifact = typeof mission.artifact === 'string' ? mission.artifact : mission.artifact?.name || mission.artifact?.label;
    option($('missionIndex'), index, (mission.title || mission.name || artifact || mission.id || 'Sprawa ' + (index + 1)) + ' — ' + mission.city);
  });
  if ([...$('missionIndex').options].some(item => item.value === old)) $('missionIndex').value = old;
}
function updateCityControl() { $('startCityId').disabled = $('start').value !== 'city'; }
function readOptions() {
  return validateOptions({
    caseNumber: $('caseNumber').value, thiefId: $('thiefId').value,
    crimeCityId: $('crimeCityId').value, missionIndex: $('missionIndex').value,
    start: $('start').value, startCityId: $('startCityId').value,
    storyStage: $('storyStage').value, flags: JSON.parse($('flags').value || '{}')
  });
}
function send(type, data = {}) { frame?.contentWindow?.postMessage({ type, channel, ...data }, location.origin); }
function stop() {
  frame?.remove(); frame = null; channel = null;
  $('session').hidden = true; $('stop').disabled = true; $('fullscreen').disabled = true;
}
async function run(options) {
  if (busy) return;
  busy = true; $('run').disabled = true; $('restart').disabled = true;
  try {
    await checkAccess(); stop();
    lastOptions = structuredClone(options); channel = crypto.randomUUID();
    frame = document.createElement('iframe');
    frame.title = 'Mark Agency — odizolowana sesja testowa';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock');
    frame.allow = 'autoplay; fullscreen'; frame.allowFullscreen = true;
    frame.src = new URL('./runner.html#' + channel, import.meta.url).href;
    $('viewport').append(frame); $('session').hidden = false;
    $('stop').disabled = false; $('fullscreen').disabled = false;
    status('Uruchamiam osobną sesję testową…');
    log('Start: ' + JSON.stringify(lastOptions));
  } catch (error) { status(error.message, true); log(error.message); }
  finally { busy = false; $('run').disabled = false; $('restart').disabled = !lastOptions; }
}
window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  if (event.source === parent && event.data?.type === 'case-tester-visibility') {
    visible = event.data.visible === true; send(visible ? 'resume' : 'pause'); return;
  }
  if (!frame || event.source !== frame.contentWindow || event.data?.channel !== channel) return;
  const data = event.data;
  if (data.type === 'ready') send('start', { options: lastOptions });
  if (data.type === 'running') { status('Sesja testowa działa. Normalny zapis nie został wczytany.'); log(data.detail); if (!visible) send('pause'); }
  if (data.type === 'error') { status(data.detail, true); log('BŁĄD: ' + data.detail); }
  if (data.type === 'blocked' || data.type === 'info') log(data.detail);
});
$('config').addEventListener('submit', event => { event.preventDefault(); try { void run(readOptions()); } catch (error) { status(error.message, true); } });
$('restart').onclick = () => { if (lastOptions) void run(structuredClone(lastOptions)); };
$('stop').onclick = () => { stop(); status('Test zakończony. Stan testowy usunięty z pamięci.'); };
$('fullscreen').onclick = () => void $('session').requestFullscreen().catch(error => status(error.message, true));
$('crimeCityId').onchange = updateMissions; $('start').onchange = updateCityControl;
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (lastUser && session?.user && session.user.id !== lastUser)) {
    stop(); $('config').hidden = true; status('Sesja administratora zakończona lub zmieniona. Odśwież panel.', true);
  }
});
try { await checkAccess(); await loadCatalog(); $('config').hidden = false; status('Wybierz ustawienia i uruchom test.'); }
catch (error) { status(error.message, true); }
