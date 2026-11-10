import { NewspaperLayoutConfig } from '../NewspaperLayoutConfig.js';
import { ensureDailyPaperTexture } from './NewspaperPaper.js';
import { ensureTimeCoverTexture } from './NewspaperTimeCover.js';

export function hasReadableCoverLines(lines) {
  return Array.isArray(lines) && lines.length > 0 &&
    lines.every(line => typeof line === 'string' && line.trim().length > 0);
}

export function prepareNewspaperBackground(scene, type, legacyKey = null) {
  const layout = NewspaperLayoutConfig[type];
  if (!layout) throw new Error(`Unknown newspaper layout type: ${type}`);
  let key = null;
  if (type === 'daily') {
    key = ensureDailyPaperTexture(scene, layout);
  } else if (type === 'time') {
    key = ensureTimeCoverTexture(scene, layout);
  } else if (legacyKey && scene.textures.exists(legacyKey)) {
    key = legacyKey;
  }
  if (!key || !scene.textures.exists(key)) {
    throw new Error(`Could not prepare newspaper background for "${type}".`);
  }
  return key;
}
