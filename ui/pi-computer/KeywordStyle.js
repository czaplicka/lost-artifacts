import { gameState } from '../../GameData.js';

const SCENES = new WeakMap();
const COMPUTERS = new WeakMap();
const STYLED = Symbol('keywordStyle');
const INSTALLED = Symbol('keywordLayoutAdapter');

export const KEYWORD_STYLE = Object.freeze({
  text: '#000000', yellow: '#ffe600', white: '#ffffff',
  darkText: '#ffffff'
});

function light(value) {
  let color = value;
  if (typeof color === 'string') color = parseInt(color.replace('#', ''), 16);
  if (!Number.isFinite(color)) return true;
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 >= 145;
}

function registry(scene) {
  if (SCENES.has(scene)) return SCENES.get(scene);
  const entries = new Map();
  const sync = () => {
    for (const [label, entry] of entries) {
      if (!label.scene || label.active === false) { entries.delete(label); continue; }
      paint(label, entry);
    }
  };
  const cleanup = () => {
    scene.events.off('postupdate', sync);
    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);
    entries.clear(); SCENES.delete(scene);
  };
  const result = { entries, sync };
  SCENES.set(scene, result);
  scene.events.on('postupdate', sync);
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  return result;
}

function paint(label, entry) {
  const known = Boolean(entry.isKnown());
  const surface = typeof entry.surface === 'function' ? entry.surface() : entry.surface;
  const pale = light(surface);
  const foreground = known ? (pale ? KEYWORD_STYLE.text : entry.normalText || KEYWORD_STYLE.darkText) : KEYWORD_STYLE.text;
  const background = known ? null : pale ? KEYWORD_STYLE.yellow : KEYWORD_STYLE.white;
  if (label.style?.color !== foreground) label.setColor(foreground);
  if ((label.style?.backgroundColor || null) !== background) label.setBackgroundColor(background);
}

export function bindKeywordStyle(scene, label, { isKnown, surface = 0xffffff, normalText = null }) {
  if (!label || typeof isKnown !== 'function') return label;
  const store = registry(scene);
  const entry = { isKnown, surface, normalText };
  store.entries.set(label, entry);
  label[STYLED] = true;
  if (!label.__keywordStyleCleanup) {
    label.__keywordStyleCleanup = true;
    label.once('destroy', () => store.entries.delete(label));
    label.on('pointerdown', () => queueMicrotask(() => {
      if (label.scene && label.active !== false) store.sync();
    }));
  }
  paint(label, entry);
  return label;
}

export function refreshKeywordStyles(scene) { SCENES.get(scene)?.sync(); }

function context(ui) {
  if (!COMPUTERS.has(ui)) COMPUTERS.set(ui, { pending: null, last: null, surfaces: [], dead: false, restorers: [] });
  return COMPUTERS.get(ui);
}

export function keywordSurface(ui, label) {
  const surfaces = context(ui).surfaces;
  const x = label.x + Math.max(1, label.width) / 2;
  const y = label.y + Math.max(1, label.height) / 2;
  for (let i = surfaces.length - 1; i >= 0; i--) {
    const s = surfaces[i];
    if (x >= s.x && x <= s.x+s.w && y >= s.y && y <= s.y+s.h) return s.color;
  }
  return 0xf2ecd6;
}

export function recordKeywordSurface(ui, x, y, w, h, color, alpha = 1) {
  if (w > 8 && h >= 32 && alpha >= .7 && Number.isFinite(color)) {
    context(ui).surfaces.push({ x, y, w, h, color });
  }
}

export function styleComputerText(ui, label, value) {
  const c = context(ui), pending = c.pending;
  c.pending = null; c.last = null;
  if (!pending || pending.text !== String(value ?? '') || !pending.keywordId || pending.pageId) return label;
  const { keywordId, caseId } = pending;
  if (!caseId) return label;
  bindKeywordStyle(ui.scene, label, {
    isKnown: () => (gameState.piKeywordSearch?.cases?.[caseId]?.known || []).includes(keywordId),
    surface: () => keywordSurface(ui, label)
  });
  c.last = label;
  return label;
}

export function suppressLegacyKeywordDecoration(ui, object, x, y, w, h) {
  const label = context(ui).last;
  if (!label?.[STYLED]) return false;
  const aligned = Math.abs(x-label.x) <= 4 && Math.abs(w-label.width) <= 8;
  const highlight = Math.abs(y-label.y) <= 3 && h <= Math.max(label.height+6, 30);
  const underline = h <= 2 && Math.abs(y-(label.y+label.height+1)) <= 3;
  if (!aligned || (!highlight && !underline)) return false;
  object.setVisible(false);
  return true;
}

// The page templates and mail pagination already carry keywordId metadata.
// Preserve it across their existing text API instead of guessing by label or colour.
function tagLayout(ui, value, caseId) {
  if (Array.isArray(value)) return value.map(item => tagLayout(ui, item, caseId));
  if (!value || typeof value !== 'object' || typeof value.text !== 'string') return value;
  const copy = { ...value }; let text = copy.text;
  Object.defineProperty(copy, 'text', {
    enumerable: true, configurable: true,
    get() {
      context(ui).pending = { text, keywordId: copy.keywordId, pageId: copy.pageId, caseId };
      return text;
    },
    set(next) { text = String(next ?? ''); }
  });
  return copy;
}

function normalizeNotebook(ui) {
  const paper = ui.root?.list?.find(item => Array.isArray(item.list) &&
    item.list.some(child => child.text === 'PRIVATE INVESTIGATIONS'));
  if (!paper?.visible) return;
  const definitions = ui.search?.data?.cases || [];
  const titles = new Set(paper.list.map(item => item.text));
  const definition = definitions.find(item => titles.has(item.title));
  if (!definition) return;
  const known = new Set(gameState.piKeywordSearch?.cases?.[definition.id]?.known || []);
  const labels = new Set(definition.keywords.filter(item => known.has(item.id)).map(item => item.label));
  for (const item of paper.list) {
    if (!labels.has(item.text) || !item.setColor) continue;
    if (item.style?.color !== '#000000') item.setColor('#000000');
  }
}

export function installComputerKeywordStyle(ui) {
  const c = context(ui);
  if (ui[INSTALLED] || c.dead || ui.destroyed || !ui.search) return;
  ui[INSTALLED] = true;
  const wrap = (target, name, factory) => {
    if (typeof target?.[name] !== 'function') return;
    const original = target[name], wrapped = factory(original);
    target[name] = wrapped;
    c.restorers.push(() => { if (target[name] === wrapped) target[name] = original; });
  };
  for (const method of ['retroArticleLines', 'paginate']) {
    wrap(ui.search, method, original => function (...args) {
      const caseId = this.definition?.id || gameState.piKeywordSearch?.selectedCaseId;
      const result = original.apply(this, args);
      c.pending = null;
      return tagLayout(ui, result, caseId);
    });
  }
  // Measuring text must never arm the next actual label.
  wrap(ui.search, 'textWidth', original => function (...args) {
    c.pending = null;
    try { return original.apply(this, args); }
    finally { c.pending = null; }
  });
  wrap(ui.monitor, 'render', original => function (...args) {
    c.pending = null; c.last = null; c.surfaces.length = 0;
    const result = original.apply(this, args);
    refreshKeywordStyles(ui.scene); normalizeNotebook(ui);
    return result;
  });
  const update = () => { if (!ui.destroyed && ui.isOpen && !ui.suspended) normalizeNotebook(ui); };
  ui.scene.events.on('postupdate', update);
  const cleanup = () => {
    if (c.dead) return;
    c.dead = true; c.pending = null; c.last = null; c.surfaces.length = 0;
    ui.scene.events.off('postupdate', update);
    ui.scene.events.off('shutdown', cleanup);
    ui.scene.events.off('destroy', cleanup);
    for (const restore of c.restorers.reverse()) restore();
    delete ui[INSTALLED];
  };
  ui.scene.events.once('shutdown', cleanup);
  ui.scene.events.once('destroy', cleanup);
}
