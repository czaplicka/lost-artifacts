import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

const STATE_KEY = 'piKeywordSearch';
const clone = value => JSON.parse(JSON.stringify(value));
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value)
  && !['__proto__', 'constructor', 'prototype'].includes(value);
const signature = ids => [...new Set(ids)].sort().join('|');

export function getSearchProgress() {
  const saved = gameState[STATE_KEY];
  return saved && saved.version === 1 && saved.cases && typeof saved.cases === 'object'
    ? saved : { version: 1, selectedCaseId: null, cases: {} };
}

export function discoverSearchKeywords(caseId, keywordIds) {
  if (!safeId(caseId) || !Array.isArray(keywordIds) || !keywordIds.every(safeId)) return false;
  const state = clone(getSearchProgress());
  const current = state.cases[caseId] || { known: [], history: [] };
  current.known = [...new Set([...(current.known || []), ...keywordIds])];
  current.history ||= [];
  state.cases[caseId] = current;
  gameState[STATE_KEY] = state;
  requestAutosave();
  return true;
}

export function validateSearchData(data) {
  if (data?.version !== 1 || !Array.isArray(data.cases) || !data.cases.length) throw new Error('Expected version 1 and at least one case.');
  const caseIds = new Set();
  for (const c of data.cases) {
    if (!safeId(c.id) || caseIds.has(c.id)) throw new Error('Invalid or duplicate case ID.');
    caseIds.add(c.id);
    if (!Array.isArray(c.clouds) || !Array.isArray(c.keywords) || !Array.isArray(c.pages) || !Array.isArray(c.recipes)) throw new Error(`Incomplete case: ${c.id}`);
    const clouds = new Set();
    for (const cloud of c.clouds) {
      if (!safeId(cloud.id) || clouds.has(cloud.id) || typeof cloud.title !== 'string') throw new Error('Invalid cloud.');
      clouds.add(cloud.id);
    }
    const keys = new Set();
    for (const k of c.keywords) {
      if (!safeId(k.id) || keys.has(k.id) || !clouds.has(k.cloudId) || typeof k.label !== 'string' || !k.label.length || k.label.length > 80) throw new Error('Invalid keyword.');
      keys.add(k.id);
    }
    const validKeys = ids => Array.isArray(ids) && ids.every(id => keys.has(id));
    if (!validKeys(c.initialKeywords || [])) throw new Error('Unknown initial keyword.');
    const pages = new Set();
    for (const p of c.pages) {
      if (!safeId(p.id) || pages.has(p.id) || typeof p.title !== 'string' || !Array.isArray(p.blocks)) throw new Error('Invalid page.');
      pages.add(p.id);
      for (const block of p.blocks) {
        if (!Array.isArray(block)) throw new Error('A page block must be an array.');
        for (const part of block) {
          if (typeof part === 'string') continue;
          if (!part || !keys.has(part.keywordId)) throw new Error('Unknown page keyword.');
        }
      }
    }
    const queries = new Set();
    for (const r of c.recipes) {
      if (!validKeys(r.terms) || r.terms.length < 1 || r.terms.length > 2 || new Set(r.terms).size !== r.terms.length || !pages.has(r.pageId)) throw new Error('Invalid search recipe.');
      const query = signature(r.terms);
      if (queries.has(query)) throw new Error('Duplicate search recipe.');
      queries.add(query);
    }
  }
  return data;
}

export function resolveSearch(definition, terms, known) {
  if (!Array.isArray(terms) || terms.length < 1 || terms.length > 2 || new Set(terms).size !== terms.length || !terms.every(id => known.includes(id))) return null;
  const recipe = definition.recipes.find(r => signature(r.terms) === signature(terms));
  return recipe ? definition.pages.find(p => p.id === recipe.pageId) || null : null;
}

export class ComputerSearch {
  constructor(ui) {
    this.ui = ui;
    this.data = null; this.loading = null; this.error = '';
    this.terms = []; this.resultId = null; this.searched = false;
    this.cloudPages = {}; this.blockPage = 0; this.message = ''; this.dead = false;
    this.controller = null;
    this.install();
  }
  install() {
    const ui = this.ui;
    const desktopRender = ui.desktop.render.bind(ui.desktop);
    ui.desktop.render = () => {
      desktopRender();
      const { x, y } = ui.layout;
      ui.desktop.createIcon(x + 152, y + 10, 128, 'Web Search', 'globe', 0x9fc9a9, () => ui.openApp('search'));
    };
    const applicationRender = ui.monitor.renderApplication.bind(ui.monitor);
    ui.monitor.renderApplication = () => {
      if (ui.app === 'search') this.render();
      else applicationRender();
    };
  }
  refresh() {
    if (!this.dead && !this.ui.destroyed && this.ui.isOpen && !this.ui.suspended && this.ui.app === 'search') this.ui.render();
  }
  async load() {
    if (this.data || this.loading || this.dead) return this.loading;
    this.error = '';
    this.controller = new AbortController();
    this.loading = (async () => {
      try {
        const response = await fetch(this.ui.options.searchDataUrl || 'assets/data/piSearch.json', { signal: this.controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = validateSearchData(await response.json());
        if (this.dead) return;
        this.data = data;
        const state = clone(getSearchProgress());
        for (const c of data.cases) {
          if (!state.cases[c.id]) state.cases[c.id] = { known: [...(c.initialKeywords || [])], history: [] };
        }
        if (!data.cases.some(c => c.id === state.selectedCaseId)) state.selectedCaseId = data.cases[0].id;
        gameState[STATE_KEY] = state;
        requestAutosave();
      } catch (error) {
        if (!this.dead && error.name !== 'AbortError') {
          this.error = 'Search data could not be loaded. Check piSearch.json.';
          console.error('[ComputerSearch]', error);
        }
      } finally {
        this.loading = null;
        this.refresh();
      }
    })();
    return this.loading;
  }
  get definition() {
    return this.data?.cases.find(c => c.id === getSearchProgress().selectedCaseId) || this.data?.cases[0] || null;
  }
  get progress() { return getSearchProgress().cases[this.definition?.id] || { known: [], history: [] }; }
  selectCase(id) {
    const state = clone(getSearchProgress());
    state.selectedCaseId = id;
    gameState[STATE_KEY] = state; requestAutosave();
    this.terms = []; this.resultId = null; this.searched = false;
    this.cloudPages = {}; this.blockPage = 0; this.message = ''; this.refresh();
  }
  selectKeyword(id) {
    if (this.terms.includes(id)) this.terms = this.terms.filter(value => value !== id);
    else if (this.terms.length < 2) this.terms.push(id);
    else { this.message = 'Two keywords maximum. Remove one first.'; this.refresh(); return; }
    this.resultId = null; this.searched = false; this.blockPage = 0;
    this.message = ''; this.refresh();
  }
  search() {
    if (!this.definition || !this.terms.length) return;
    const page = resolveSearch(this.definition, this.terms, this.progress.known);
    this.resultId = page?.id || null; this.searched = true; this.blockPage = 0; this.message = '';
    const state = clone(getSearchProgress());
    const history = state.cases[this.definition.id].history || [];
    history.push({ terms: [...this.terms], pageId: this.resultId });
    state.cases[this.definition.id].history = history.slice(-40);
    gameState[STATE_KEY] = state; requestAutosave(); this.refresh();
  }
  collect(id) {
    if (!this.definition.keywords.some(k => k.id === id)) return;
    const known = this.progress.known.includes(id);
    if (!known) discoverSearchKeywords(this.definition.id, [id]);
    this.message = known ? 'Already in your notes.' : 'Keyword added to your notes.';
    this.refresh();
  }
  render() {
    const ui = this.ui, d = ui.drawing;
    const { x, y, w, h } = ui.layout;
    const b = { x: x + 16, y: y + 12, w: w - 32, h: h - 60 };
    ui.window = b;
    d.bevel(b.x, b.y, b.w, b.h, 0xd3cdbb);
    d.rectangle(b.x + 4, b.y + 4, b.w - 8, 32, 0x233d48);
    d.pixel(b.x + 14, b.y + 14, 'OWL SEARCH', 11, '#fff0ba');
    d.button(b.x + b.w - 46, b.y + 4, 'X', () => ui.openApp('desktop'));
    if (!this.data) {
      d.text(b.x + 24, b.y + 64, this.error || 'Connecting to the information superhighway...', 18, '#283735', b.w - 48);
      if (this.error) d.button(b.x + 24, b.y + 130, 'Retry', () => { void this.load(); });
      return;
    }
    const c = this.definition;
    const index = this.data.cases.indexOf(c);
    d.text(b.x + 16, b.y + 46, c.title, 17, '#283735', b.w - 120);
    if (this.data.cases.length > 1) d.button(b.x + b.w - 94, b.y + 40, 'Case', () => this.selectCase(this.data.cases[(index + 1) % this.data.cases.length].id));
    const left = b.x + 14, top = b.y + 80, cloudW = 260;
    const cloudH = (b.h - 126) / Math.max(1, c.clouds.length);
    c.clouds.forEach((cloud, i) => this.drawCloud(cloud, left, top + i * cloudH, cloudW, cloudH - 8));
    const rx = left + cloudW + 14, rw = b.w - cloudW - 42;
    d.text(rx, top - 2, 'Click a keyword to add it. Click it again to remove it.', 13, '#4a5248', rw);
    for (let i = 0; i < 2; i++) {
      const sx = rx + i * (rw / 2 + 2);
      const sw = rw / 2 - 4;
      d.bevel(sx, top + 30, sw, 42, 0xf5f0dc, true);
      const k = c.keywords.find(item => item.id === this.terms[i]);
      const text = d.text(sx + 9, top + 42, k ? k.label : `Keyword ${i + 1}`, 16, k ? '#273e36' : '#999584');
      d.fit(text, text.text, sw - 18);
      if (k) d.rectangle(sx, top + 30, sw, 42, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectKeyword(k.id));
    }
    d.button(rx, top + 80, 'Search', () => this.search(), this.terms.length > 0);
    d.button(rx + 112, top + 80, 'Clear', () => {
      this.terms = []; this.resultId = null; this.searched = false; this.message = ''; this.refresh();
    });
    this.drawResult(rx, top + 126, rw, b.h - 248);
    d.text(b.x + 16, b.y + b.h - 28, this.message || 'Yellow words can be collected. Search one or two keywords.', 13, '#394737', b.w - 32);
  }
  drawCloud(cloud, x, y, w, h) {
    const d = this.ui.drawing;
    d.bevel(x, y, w, h, 0xe8dfb9, true);
    d.pixel(x + 12, y + 12, cloud.title, 9, '#4b4b32');
    const keys = this.definition.keywords.filter(k => k.cloudId === cloud.id && this.progress.known.includes(k.id));
    const rows = Math.max(1, Math.floor((h - 70) / 28));
    const count = Math.max(1, Math.ceil(keys.length / rows));
    const page = Math.min(this.cloudPages[cloud.id] || 0, count - 1);
    if (!keys.length) d.text(x + 12, y + 45, 'No clues yet.', 15, '#81795b');
    keys.slice(page * rows, (page + 1) * rows).forEach((k, i) => {
      const selected = this.terms.includes(k.id);
      d.rectangle(x + 8, y + 38 + i * 28, w - 16, 25, selected ? 0x375a50 : 0xdad09f);
      const text = d.text(x + 15, y + 42 + i * 28, k.label, 15, selected ? '#ffffff' : '#3b422a');
      d.fit(text, k.label, w - 30);
      d.rectangle(x + 8, y + 38 + i * 28, w - 16, 25, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectKeyword(k.id));
    });
    if (count > 1) {
      const step = delta => { this.cloudPages[cloud.id] = (page + delta + count) % count; this.refresh(); };
      d.button(x + 8, y + h - 32, '<', () => step(-1));
      d.text(x + 65, y + h - 23, `${page + 1}/${count}`, 13, '#4b4b32');
      d.button(x + w - 44, y + h - 32, '>', () => step(1));
    }
  }
  drawResult(x, y, w, h) {
    const d = this.ui.drawing;
    d.bevel(x, y, w, h, 0xf4f0de, true);
    const page = this.definition.pages.find(p => p.id === this.resultId);
    if (!page) {
      d.text(x + 14, y + 18, this.searched ? (this.data.noResults || 'No useful results. Try another connection.') : 'The internet knows everything. Unfortunately, it needs a question.', 17, '#57594a', w - 28);
      return;
    }
    const heading = d.text(x + 14, y + 12, page.title, 18, '#203f52');
    d.fit(heading, page.title, w - 28);
    const address = d.text(x + 14, y + 38, page.address || 'owl://archive', 12, '#6a7662');
    d.fit(address, address.text, w - 28);
    const layouts = this.paginate(page.blocks, w - 28, Math.max(28, h - 104));
    this.blockPage = Math.min(this.blockPage, layouts.length - 1);
    const layout = layouts[this.blockPage] || [];
    for (const item of layout) {
      const text = d.text(x + 14 + item.x, y + 62 + item.y, item.text, 16, item.keywordId ? '#654800' : '#303a34');
      if (item.keywordId) {
        const bg = d.rectangle(text.x, text.y, text.width, 21, this.progress.known.includes(item.keywordId) ? 0xddd5a9 : 0xffdb55);
        this.ui.content.moveBelow(bg, text);
        text.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.collect(item.keywordId));
      }
    }
    if (layouts.length > 1) {
      d.button(x + 12, y + h - 35, '<', () => { this.blockPage = (this.blockPage - 1 + layouts.length) % layouts.length; this.refresh(); });
      d.text(x + 68, y + h - 25, `${this.blockPage + 1}/${layouts.length}`, 13, '#57594a');
      d.button(x + w - 46, y + h - 35, '>', () => { this.blockPage = (this.blockPage + 1) % layouts.length; this.refresh(); });
    }
  }
  paginate(blocks, width, height) {
    const probe = this.ui.scene.add.text(0, 0, '', { fontFamily: 'SpecialElite, "Special Elite", monospace', fontSize: '16px' }).setVisible(false);
    const measure = text => { probe.setText(text); return probe.width; };
    const pages = [[]]; let x = 0, y = 0;
    const line = () => {
      x = 0; y += 25;
      if (y + 22 > height) { pages.push([]); y = 0; }
    };
    for (const block of blocks) {
      for (const part of block) {
        const keywordId = typeof part === 'object' ? part.keywordId : null;
        const value = keywordId ? this.definition.keywords.find(k => k.id === keywordId).label : part;
        for (const token of value.split(/(\s+)/).filter(Boolean)) {
          const space = /^\s+$/.test(token);
          if (space) { if (x > 0) x += measure(' '); continue; }
          let word = '';
          const emit = chunk => {
            const tw = measure(chunk);
            if (x > 0 && x + tw > width) line();
            pages[pages.length - 1].push({ text: chunk, keywordId, x, y }); x += tw;
          };
          for (const char of token) {
            if (word && measure(word + char) > width) { emit(word); line(); word = ''; }
            word += char;
          }
          if (word) emit(word);
        }
      }
      line();
      if (y) line();
    }
    probe.destroy();
    if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
    return pages;
  }
  destroy() { this.dead = true; this.controller?.abort(); }
}
