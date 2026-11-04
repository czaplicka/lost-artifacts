// Only these catalog entries may become pigeon loot. Never sample the whole catalog.
const ALLOWED = new Map([
  ['souvenirs.postcard', 'postcard'],
  ['consumables.energyDrink', 'energy_drink'],
  ['consumables.sandwich', 'sandwich'],
  ['souvenirs.tokyoLuckyCat', 'souvenir_tokyo_lucky_cat'],
  ['souvenirs.islamabadTruck', 'souvenir_islamabad_truck']
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
      error = 'Item catalog unavailable. Your pigeon and its find are safe. Please try again.';
      failedAt = Date.now(); console.error('[PigeonCatalog]', failure); return false;
    } finally { loading = null; }
  })();
  return loading;
}
export function getPigeonCatalogItem(ref) { return catalog ? resolveFrom(catalog, ref) : null; }
