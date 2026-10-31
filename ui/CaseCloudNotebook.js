import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

const STORE = 'caseCloudNotebookV1';
const INK = 0x345b68;
const FONT = '"SpecialElite", "Special Elite", monospace';
const list = value => Array.isArray(value) ? value : [];
const hash = value => [...String(value)].reduce((n, c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 7);

export function installCaseNotebook(ui, scope) {
  if (!['pi', 'agency'].includes(scope)) throw Error('Invalid notebook scope');
  if (ui.caseCloudNotebook) return ui.caseCloudNotebook;
  const state = ui.state || gameState;
  let dead = false;
  let selected = null;
  let tabStart = 0;
  let signature = '';
  let lastCheck = 0;
  const pages = new Map();
  const keywordPages = new Map();
  let snapshotCache = '';

  const save = () => requestAutosave();
  const store = () => {
    state[STORE] ||= { pi: {}, agency: {} };
    state[STORE][scope] ||= {};
    return state[STORE][scope];
  };
  const agencyId = () => String(state.currentCaseId || state.currentMission?.id || state.currentMission?.missionId || '');
  const clueId = (clue, i) => String(clue?.id || clue?.key || `entry_${i}_${hash(JSON.stringify(clue))}`);
  const clueLabel = clue => typeof clue === 'string' ? clue : String(clue.text || clue.tag || clue.value || clue.key || 'Recorded evidence');

  function syncAgency() {
    const id = agencyId();
    if (!id) return;
    const mission = state.currentMission || {};
    const aliases = new Set([id, mission.id, mission.missionId].filter(Boolean).map(String));
    const clues = list(state.cluesCollected).filter(clue => {
      if (!clue) return false;
      if (typeof clue === 'string') return true;
      if (clue.scope === 'pi' || clue.source === 'pi' || clue.type === 'pi') return false;
      return [clue.caseId, clue.missionId].filter(Boolean).every(value => aliases.has(String(value)));
    });
    const next = JSON.stringify([id, mission.title, mission.artifact, clues]);
    if (next === snapshotCache) return;
    snapshotCache = next;
    const cases = store();
    const old = cases[id] || { id, keywords: [], clouds: [], links: [] };
    const known = new Map(old.keywords.map(item => [item.id, item]));
    const clouds = new Map(old.clouds.map(item => [item.id, item]));
    const names = {
      suspect: 'SUSPECT DESCRIPTION', travel: 'TRAVEL', reconstruction: 'CRIME RECONSTRUCTION',
      hair: 'HAIR', eyes: 'EYES', features: 'DISTINCTIVE FEATURES', skills: 'SKILLS',
      evidence: 'EVIDENCE', identity: 'IDENTITY', alibi: 'ALIBIS'
    };
    clues.forEach((clue, index) => {
      const group = String(clue.notebookGroup || clue.category || clue.type || 'evidence');
      clouds.set(group, { id: group, title: clue.notebookGroupTitle || names[group] || group.replace(/_/g, ' ').toUpperCase() });
      known.set(clueId(clue, index), {
        id: clueId(clue, index), label: clueLabel(clue), cloudId: group,
        relatedIds: list(clue.relatedClueIds || clue.relatedIds)
      });
    });
    const keywords = [...known.values()];
    const ids = new Map(keywords.map(item => [item.id, item.cloudId]));
    const links = [];
    keywords.forEach(item => item.relatedIds.forEach(id => {
      const target = ids.get(String(id));
      if (target && target !== item.cloudId) links.push({ from: item.cloudId, to: target });
    }));
    cases[id] = {
      id, title: mission.title || mission.name || state.currentArtifact?.name || mission.artifact || `Agency case ${id}`,
      clouds: [...clouds.values()], keywords, links
    };
    save();
  }

  function getCases() {
    if (scope === 'agency') {
      syncAgency();
      return Object.values(store());
    }
    const progress = state.piKeywordSearch?.cases || {};
    return list(ui.search.data?.cases).map(definition => {
      const current = progress[definition.id];
      const known = new Set(list(current?.known));
      const keywords = list(definition.keywords).filter(item => known.has(item.id));
      const groups = new Map(keywords.map(item => [item.id, item.cloudId]));
      const links = [];
      list(current?.history).forEach(item => {
        if (!item.pageId && !list(item.pageIds).length) return;
        const terms = list(item.terms).map(id => groups.get(id)).filter(Boolean);
        if (terms.length === 2 && terms[0] !== terms[1]) links.push({ from: terms[0], to: terms[1] });
      });
      // Optional explicit links require evidence already discovered by the player.
      list(definition.notebookLinks).forEach(link => {
        if (list(link.requires).length && list(link.requires).every(id => known.has(id))) links.push(link);
      });
      return { ...definition, keywords, links };
    }).filter(item => item.keywords.length);
  }

  function pickKeyword(definition, keyword) {
    if (scope !== 'pi') return;
    const search = ui.search;
    if (ui.app === 'search') {
      if (search.definition?.id !== definition.id) search.selectCase(definition.id);
      search.selectKeyword(keyword.id);
    } else if (ui.app === 'mail' && ui.photoQuest?.contactMail?.composing &&
      ui.photoQuest.contactMail.service?.data?.searchCaseId === definition.id) {
      search.selectKeyword(keyword.id);
    }
  }

  ui.search.renderNotebook = () => {};
  ui.search.notesOpen = false;

  if (scope === 'agency') {
    // ComputerSearch currently uses the PI state and PI dataset globally.
    // Do not expose private cases through the agency computer.
    ui.search.load = async () => {};
    ui.search.render = () => {
      const d = ui.drawing;
      const b = ui.layout;
      d.bevel(b.x + 12, b.y + 12, b.w - 24, b.h - 60, 0xe5dfc8);
      d.text(b.x + 34, b.y + 40, 'OWL SEARCH / MARK AGENCY', 24, '#284e5c');
      d.text(b.x + 34, b.y + 98,
        'Agency search is not configured yet.\n\nPrivate investigation files are not available on this terminal.\nYour agency evidence is recorded in the notebook below.',
        21, '#284e5c', b.w - 80);
      d.button(b.x + 34, b.y + 270, 'BACK', () => ui.openApp('desktop'));
    };
  }

  const paperHeight = () => Math.min(420, Math.max(240, ui.scene.scale.height * 0.43));
  if (scope === 'pi') {
    ui.monitor.calculateWorkspace = () => {
      const { width, height } = ui.scene.scale;
      const available = Math.max(1, height - paperHeight() - 18);
      const scale = Math.max(0.001, Math.min((width - 16) / 1120, available / 800));
      return { scale, left: (width - 1120 * scale) / 2, top: 4 };
    };
  }

  function renderNotebook() {
    if (dead || ui.destroyed || !ui.isOpen || ui.suspended) return;
    if (scope === 'agency' && ui.content?.scene) {
      const { width, height } = ui.scene.scale;
      const scale = Math.max(0.001, Math.min((width - 16) / 1120, Math.max(1, height - paperHeight() - 18) / 760));
      ui.content.setScale(scale).setPosition((width - 1120 * scale) / 2, 4);
    }
    const cases = getCases();
    const definition = cases.find(item => item.id === selected) ||
      cases.find(item => item.id === (scope === 'pi' ? state.piKeywordSearch?.selectedCaseId : agencyId())) || cases[0];
    selected = definition?.id || null;
    const { width, height } = ui.scene.scale;
    const scale = Math.max(0.001, Math.min((width - 16) / 1280, paperHeight() / 370));
    const root = ui.scene.add.container((width - 1280 * scale) / 2, height - 370 * scale - 4).setScale(scale);
    ui.root.add(root);
    const add = object => { object.setScrollFactor(0); root.add(object); return object; };
    const rect = (x, y, w, h, color, alpha = 1) => add(ui.scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0));
    const text = (x, y, value, size = 18, color = '#345b68', wrap = null) => add(ui.scene.add.text(x, y, String(value), {
      fontFamily: FONT, fontSize: `${size}px`, color,
      ...(wrap ? { wordWrap: { width: wrap, useAdvancedWrap: true } } : {})
    }));
    const button = (x, y, value, callback, enabled = true) => {
      const label = text(x, y, value, 17, enabled ? '#714c36' : '#a99b7a');
      if (enabled) label.setInteractive({ useHandCursor: true }).on('pointerdown', callback);
      return label;
    };
    rect(5, 32, 1275, 338, 0x000000, 0.32);
    rect(0, 27, 1280, 340, 0xe9e2b2).setInteractive();
    rect(33, 38, 2, 312, 0xb87969, 0.5);
    const graphics = add(ui.scene.add.graphics());
    graphics.lineStyle(2, 0x48463b, 0.85);
    for (let y = 44; y < 355; y += 21) graphics.strokeEllipse(10, y, 24, 10);
    text(48, 40, scope === 'pi' ? 'PRIVATE INVESTIGATIONS' : 'MARK AGENCY / CASE NOTES', 15);
    const title = text(370, 39, definition?.title || 'NO ACTIVE CASE', 20);
    while (title.width > 660 && parseInt(title.style.fontSize) > 12) title.setFontSize(parseInt(title.style.fontSize) - 1);
    button(1165, 40, '[ OFF ]', () => ui.close());
    tabStart = Math.max(0, Math.min(tabStart, Math.max(0, cases.length - 9)));
    button(43, 5, '<', () => { tabStart--; ui.render(); }, tabStart > 0);
    cases.slice(tabStart, tabStart + 9).forEach((item, i) => {
      const x = 70 + i * 55;
      rect(x, item.id === selected ? 0 : 6, 45, 29, item.id === selected ? 0xe9e2b2 : 0xcab85e).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { selected = item.id; ui.render(); });
      text(x + 14, 7, tabStart + i + 1, 17);
    });
    button(575, 5, '>', () => { tabStart++; ui.render(); }, tabStart + 9 < cases.length);
    if (!definition) {
      text(90, 145, ui.search.error && scope === 'pi' ? 'Notebook unavailable. Open Web Search and retry.' : 'No clues recorded yet. Even the paper has an alibi.', 22);
    } else {
      const nodes = list(definition.clouds).map(cloud => ({
        ...cloud, words: definition.keywords.filter(item => item.cloudId === cloud.id)
      })).filter(cloud => cloud.words.length);
      const pageCount = Math.max(1, Math.ceil(nodes.length / 6));
      const page = Math.max(0, Math.min(pages.get(definition.id) || 0, pageCount - 1));
      pages.set(definition.id, page);
      const visible = nodes.slice(page * 6, page * 6 + 6);
      const positions = new Map();
      visible.forEach((node, i) => positions.set(node.id, {
        x: 238 + (i % 3) * 402, y: 128 + Math.floor(i / 3) * 139, rx: 170, ry: 61
      }));
      const drawn = new Set();
      list(definition.links).forEach(link => {
        const a = positions.get(link.from), b = positions.get(link.to);
        const key = [link.from, link.to].sort().join('|');
        if (!a || !b || drawn.has(key)) return;
        drawn.add(key);
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const boundary = point => 1 / Math.sqrt((Math.cos(angle) / point.rx) ** 2 + (Math.sin(angle) / point.ry) ** 2);
        const da = boundary(a) + 6, db = boundary(b) + 8;
        const x1 = a.x + Math.cos(angle) * da, y1 = a.y + Math.sin(angle) * da;
        const x2 = b.x - Math.cos(angle) * db, y2 = b.y - Math.sin(angle) * db;
        graphics.lineStyle(1.7, INK, 0.8);
        graphics.lineBetween(x1, y1, x2, y2);
        graphics.lineBetween(x2, y2, x2 - 9 * Math.cos(angle - 0.5), y2 - 9 * Math.sin(angle - 0.5));
        graphics.lineBetween(x2, y2, x2 - 9 * Math.cos(angle + 0.5), y2 - 9 * Math.sin(angle + 0.5));
      });
      visible.forEach(node => {
        const p = positions.get(node.id), seed = hash(node.id);
        graphics.lineStyle(1.5, INK, 0.86);
        graphics.beginPath();
        for (let n = 0; n <= 80; n++) {
          const a = n / 80 * Math.PI * 2;
          const jitter = Math.sin(a * 7 + seed % 13) * 1.5 + Math.sin(a * 11) * 0.8;
          const x = p.x + Math.cos(a) * (p.rx + jitter), y = p.y + Math.sin(a) * (p.ry + jitter);
          if (!n) graphics.moveTo(x, y); else graphics.lineTo(x, y);
        }
        graphics.strokePath();
        const heading = text(p.x, p.y - 56, node.title, 15).setOrigin(0.5, 0);
        if (heading.width > 280) heading.setScale(280 / heading.width);
        const k = `${definition.id}:${node.id}`;
        const count = Math.max(1, Math.ceil(node.words.length / 4));
        const index = Math.min(keywordPages.get(k) || 0, count - 1);
        node.words.slice(index * 4, index * 4 + 4).forEach((keyword, i) => {
          const label = text(p.x - 137, p.y - 29 + i * 20, keyword.label, 16, '#345b68');
          if (label.width > 270) label.setScale(270 / label.width);
          const canSelect = scope === 'pi' && (ui.app === 'search' || (ui.app === 'mail' && ui.photoQuest?.contactMail?.composing && ui.photoQuest.contactMail.service?.data?.searchCaseId === definition.id));
          if (canSelect) {
            const active = ui.search.definition?.id === definition.id && ui.search.terms.includes(keyword.id);
            label.setColor(active ? '#a44933' : '#345b68').setInteractive({ useHandCursor: true })
              .on('pointerover', () => label.setColor('#a44933'))
              .on('pointerout', () => label.setColor(active ? '#a44933' : '#345b68'))
              .on('pointerdown', () => pickKeyword(definition, keyword));
          }
        });
        if (count > 1) button(p.x + 92, p.y + 40, `${index + 1}/${count} >`, () => {
          keywordPages.set(k, (index + 1) % count); ui.render();
        });
      });
      button(50, 337, '< PAGE', () => { pages.set(definition.id, page - 1); ui.render(); }, page > 0);
      text(595, 337, `${page + 1} / ${pageCount}`, 16);
      button(1155, 337, 'PAGE >', () => { pages.set(definition.id, page + 1); ui.render(); }, page + 1 < pageCount);
    }
    signature = JSON.stringify([cases, ui.app, ui.search.terms, ui.booting]);
    if (scope === 'pi' && !ui.booting && !ui.search.data && !ui.search.loading && !ui.search.error) void ui.search.load();
  }

  const host = scope === 'pi' ? ui.monitor : ui;
  const originalRender = host.render;
  host.render = function (...args) {
    const result = originalRender.apply(this, args);
    renderNotebook();
    return result;
  };
  const step = () => {
    if (dead || ui.destroyed || !ui.isOpen || ui.suspended || ui.booting) return;
    const now = ui.scene.time.now;
    if (now - lastCheck < 300) return;
    lastCheck = now;
    const next = JSON.stringify([getCases(), ui.app, ui.search.terms, ui.booting]);
    if (next !== signature) ui.render();
  };
  ui.scene.game.events.on('poststep', step);
  const cleanup = () => {
    if (dead) return;
    dead = true;
    ui.scene.game.events.off('poststep', step);
    ui.scene.events.off('shutdown', cleanup);
    ui.scene.events.off('destroy', cleanup);
  };
  ui.scene.events.once('shutdown', cleanup);
  ui.scene.events.once('destroy', cleanup);
  const originalDestroy = ui.destroy;
  ui.destroy = function (...args) {
    cleanup();
    return originalDestroy.apply(this, args);
  };
  ui.caseCloudNotebook = { scope };
  return ui.caseCloudNotebook;
}
