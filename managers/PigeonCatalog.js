import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// Only these catalog entries may become pigeon loot. Never sample the whole catalog.
const ALLOWED = new Map([
  [__dialogueText("managers/PigeonCatalog.js", "t_77b137edca3b3f77daf1"), 'postcard'],
  [__dialogueText("managers/PigeonCatalog.js", "t_118f7d5a299aac4fe4eb"), 'energy_drink'],
  [__dialogueText("managers/PigeonCatalog.js", "t_600d11f87c435e5585c2"), 'sandwich'],
  [__dialogueText("managers/PigeonCatalog.js", "t_fb1d71ee5a712b63d6b3"), 'souvenir_tokyo_lucky_cat'],
  [__dialogueText("managers/PigeonCatalog.js", "t_d6e969fbdb60835e2d1e"), 'souvenir_islamabad_truck']
]);
let catalog = null, loading = null, error = '', failedAt = 0;
const clone = value => JSON.parse(JSON.stringify(value));
function resolveFrom(source, ref) {
  if (!ALLOWED.has(ref)) return null;
  const [category, key] = ref.split('.');
  const item = source?.[category]?.[key];
  if (!item || item.id !== ALLOWED.get(ref) || !item.name || item.type !== 'item' || item.stackable !== true ||
      item.metadata?.pigeonFeed === true || item.metadata?.unlocksArea || item.metadata?.access) return null;
  return clone(item);
}
export function getPigeonCatalogStatus() {
  return { ready: catalog !== null, loading: loading !== null, error };
}
export function loadPigeonCatalog({ retry = false } = {}) {
  if (catalog) return Promise.resolve(true);
  if (loading) return loading;
  if (!retry && error && Date.now() - failedAt < 5000) return Promise.resolve(false);
  loading = (async () => {
    try {
      const response = await fetch('assets/data/ItemsCatalog.json');
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const source = await response.json();
      for (const ref of ALLOWED.keys()) if (!resolveFrom(source, ref)) throw Error(`Missing or invalid pigeon item: ${ref}`);
      catalog = source; error = ''; return true;
    } catch (failure) {
      error = __dialogueText("managers/PigeonCatalog.js", "t_6439c45e187a4539abcb");
      failedAt = Date.now(); console.error('[PigeonCatalog]', failure); return false;
    } finally { loading = null; }
  })();
  return loading;
}
export function getPigeonCatalogItem(ref) { return catalog ? resolveFrom(catalog, ref) : null; }
