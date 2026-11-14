import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    fail(__dialogueText("managers/ManifestLoader.js", "t_ae1be3efee3dcb4d295e"));
  }
  if (parts.length !== index.files.length) fail(__dialogueText("managers/ManifestLoader.js", "t_7cb6318d6d5808800f84"));
  const catalog = new Map();
  const groupById = new Map();
  const textureKeys = new Set();
  const manifest = { bundleVersion: 1, assetCatalog: [], bundles: {}, startup: {} };
  for (const group of IMAGE_GROUPS) manifest[group] = [];
  for (const group of Object.values(DEFAULT_GROUP)) manifest[group] ??= [];

  parts.forEach((part, i) => {
    if (!Array.isArray(part?.assets)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_075368dc66f77e45fc8c")}${index.files[i]}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
    for (const source of part.assets) {
      const { groups, ...asset } = source;
      if (!TYPES.has(asset.type) || typeof asset.key !== 'string' || !asset.key || !asset.url) {
        fail(`${__dialogueText("managers/ManifestLoader.js", "t_93566da94965c7bc0e21")}${index.files[i]}${__dialogueText("managers/ManifestLoader.js", "t_45822f54a0d0e030f756")}${JSON.stringify(source)}`);
      }
      const id = idOf(asset);
      if (catalog.has(id)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_976c21e559fae08ff851")}${id}${__dialogueText("managers/ManifestLoader.js", "t_2eb9d0d30d4ceaac52e6")}${index.files[i]}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
      if (asset.type === 'image') {
        if (textureKeys.has(asset.key)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_200c28c7909b9379f413")}${asset.key}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
        textureKeys.add(asset.key);
      }
      const targetGroups = groups ?? [DEFAULT_GROUP[asset.type]];
      if (!Array.isArray(targetGroups) || !targetGroups.length) fail(`${__dialogueText("managers/ManifestLoader.js", "t_164658e163bf57c7d4c5")}${id}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
      for (const group of targetGroups) {
        const expected = asset.type === 'image' ? IMAGE_GROUPS.has(group) : group === DEFAULT_GROUP[asset.type];
        if (!expected) fail(`${__dialogueText("managers/ManifestLoader.js", "t_dea97105776934c99989")}${group}${__dialogueText("managers/ManifestLoader.js", "t_ccb2f8fb3cff62792429")}${id}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
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
    fail(__dialogueText("managers/ManifestLoader.js", "t_b50f93681fe57ca2d382"));
  }
  for (const [bundle, refs] of Object.entries(index.bundles)) {
    if (!Array.isArray(refs)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_8d97956077537d2ae971")}${bundle}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
    const unique = [...new Set(refs)];
    for (const ref of unique) if (!catalog.has(ref)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_62c7e8d30b79fed28fa2")}${bundle}${__dialogueText("managers/ManifestLoader.js", "t_81a93915a0887bdf04b2")}${ref}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
    manifest.bundles[bundle] = unique;
  }
  if (!index.startup || typeof index.startup !== 'object' || Array.isArray(index.startup)) {
    fail(__dialogueText("managers/ManifestLoader.js", "t_b8adf1f9c8972f6ef568"));
  }
  for (const [group, refs] of Object.entries(index.startup)) {
    if (!Array.isArray(refs)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_b2e12bcf11a29d79c99d")}${group}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
    manifest.startup[group] = [...new Set(refs)].map(ref => {
      const asset = catalog.get(ref);
      if (!asset) fail(`${__dialogueText("managers/ManifestLoader.js", "t_aa8e8e3088c8c4c1075c")}${ref}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
      if (!groupById.get(ref).includes(group)) fail(`${__dialogueText("managers/ManifestLoader.js", "t_7fe4551de2b051bb2a4f")}${ref}${__dialogueText("managers/ManifestLoader.js", "t_45822f54a0d0e030f756")}${group}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
      const { type, ...entry } = asset;
      return entry;
    });
  }
  return manifest;
}

export async function loadSplitManifest(index, signal) {
  if (index?.version !== 2 || !Array.isArray(index.files)) {
    fail(__dialogueText("managers/ManifestLoader.js", "t_4a29f90214b0cfc57e67"));
  }
  const parts = await Promise.all(index.files.map(async url => {
    const response = await fetch(new URL(url, document.baseURI), { signal, cache: 'no-cache' });
    if (!response.ok) fail(`${__dialogueText("managers/ManifestLoader.js", "t_1706f34e03ed1a78c892")}${url}${__dialogueText("managers/ManifestLoader.js", "t_c025acd1d429de2d3409")}${response.status}${__dialogueText("managers/ManifestLoader.js", "t_cdb4ee2aea69cc6a8333")}`);
    try { return await response.json(); }
    catch (error) {
      if (signal?.aborted) throw error;
      fail(`${__dialogueText("managers/ManifestLoader.js", "t_16c85788061ad3f1b936")}${url}${__dialogueText("managers/ManifestLoader.js", "t_45822f54a0d0e030f756")}${error.message}`);
    }
  }));
  return compileManifest(index, parts);
}
