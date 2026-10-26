const TYPES = new Set(['image', 'audio', 'json', 'tilemap', 'video', 'css', 'html']);
const DEFAULT_GROUP = {
  image: 'backgrounds', audio: 'audio', json: 'json', tilemap: 'tilemaps',
  video: 'videos', css: 'css', html: 'html'
};
const IMAGE_GROUPS = new Set([
  'backgrounds', 'sidequests', 'npcPortraits', 'ui', 'artifacts', 'newspapers',
  'suspects', 'wantedPosters', 'suspectThumbnails', 'csi', 'portraits'
]);
const idOf = asset => `${asset.type}:${asset.key}`;
const fail = message => { throw new Error(`[Manifest] ${message}`); };

export function compileManifest(index, parts) {
  if (index?.version !== 2 || !Array.isArray(index.files)) {
    fail('Invalid index. Run node tools/split-manifest.cjs first.');
  }
  if (parts.length !== index.files.length) fail('Incomplete manifest parts.');
  const catalog = new Map();
  const groupById = new Map();
  const textureKeys = new Set();
  const manifest = { bundleVersion: 1, assetCatalog: [], bundles: {}, startup: {} };
  for (const group of IMAGE_GROUPS) manifest[group] = [];
  for (const group of Object.values(DEFAULT_GROUP)) manifest[group] ??= [];

  parts.forEach((part, i) => {
    if (!Array.isArray(part?.assets)) fail(`Missing assets array in ${index.files[i]}.`);
    for (const source of part.assets) {
      const { groups, ...asset } = source;
      if (!TYPES.has(asset.type) || typeof asset.key !== 'string' || !asset.key || !asset.url) {
        fail(`Invalid asset in ${index.files[i]}: ${JSON.stringify(source)}`);
      }
      const id = idOf(asset);
      if (catalog.has(id)) fail(`Duplicate ${id} in ${index.files[i]}.`);
      if (asset.type === 'image') {
        if (textureKeys.has(asset.key)) fail(`Duplicate texture key ${asset.key}.`);
        textureKeys.add(asset.key);
      }
      const targetGroups = groups ?? [DEFAULT_GROUP[asset.type]];
      if (!Array.isArray(targetGroups) || !targetGroups.length) fail(`Missing groups for ${id}.`);
      for (const group of targetGroups) {
        const expected = asset.type === 'image' ? IMAGE_GROUPS.has(group) : group === DEFAULT_GROUP[asset.type];
        if (!expected) fail(`Invalid group ${group} for ${id}.`);
        manifest[group] ??= [];
        const { type, ...entry } = asset;
        manifest[group].push(entry);
      }
      catalog.set(id, asset);
      groupById.set(id, targetGroups);
      manifest.assetCatalog.push(asset);
    }
  });

  if (!index.bundles || typeof index.bundles !== 'object' || Array.isArray(index.bundles)) {
    fail('Missing bundles object.');
  }
  for (const [bundle, refs] of Object.entries(index.bundles)) {
    if (!Array.isArray(refs)) fail(`Invalid bundle ${bundle}.`);
    const unique = [...new Set(refs)];
    for (const ref of unique) if (!catalog.has(ref)) fail(`Bundle ${bundle} references unknown asset ${ref}.`);
    manifest.bundles[bundle] = unique;
  }
  if (!index.startup || typeof index.startup !== 'object' || Array.isArray(index.startup)) {
    fail('Missing startup object.');
  }
  for (const [group, refs] of Object.entries(index.startup)) {
    if (!Array.isArray(refs)) fail(`Invalid startup group ${group}.`);
    manifest.startup[group] = [...new Set(refs)].map(ref => {
      const asset = catalog.get(ref);
      if (!asset) fail(`Startup references unknown asset ${ref}.`);
      if (!groupById.get(ref).includes(group)) fail(`Startup group mismatch for ${ref}: ${group}.`);
      const { type, ...entry } = asset;
      return entry;
    });
  }
  return manifest;
}

export async function loadSplitManifest(index, signal) {
  if (index?.version !== 2 || !Array.isArray(index.files)) {
    fail('Invalid manifest index. Run node tools/split-manifest.cjs.');
  }
  const parts = await Promise.all(index.files.map(async url => {
    const response = await fetch(new URL(url, document.baseURI), { signal, cache: 'no-cache' });
    if (!response.ok) fail(`Cannot load ${url}: HTTP ${response.status}.`);
    try { return await response.json(); }
    catch (error) {
      if (signal?.aborted) throw error;
      fail(`Invalid JSON in ${url}: ${error.message}`);
    }
  }));
  return compileManifest(index, parts);
}
