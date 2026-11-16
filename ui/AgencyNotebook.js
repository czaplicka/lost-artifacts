import {
  dialogueText
} from '../dialogues/DialogueText.js';

import {
  gameState
} from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

const STORE = 'caseCloudNotebookV1';
const VIEW_STORE = 'caseCloudNotebookViewV1';

const PI_SOURCE = 'ui/PlayerCloudNotebook.js';
const SVG_NS = 'http://www.w3.org/2000/svg';

const array = value =>
  Array.isArray(value) ? value : [];

const safeKey = value =>
  !['__proto__', 'prototype', 'constructor'].includes(
    String(value)
  );

const piText = id => dialogueText(PI_SOURCE, id);

function hash(value) {
  let result = 7;

  for (const char of String(value)) {
    result = (
      result * 31 + char.charCodeAt(0)
    ) >>> 0;
  }

  return result;
}

function element(tag, text, className) {
  const node = document.createElement(tag);

  if (text !== undefined) {
    node.textContent = String(text);
  }

  if (className) {
    node.className = className;
  }

  return node;
}

function getPIStyle() {
  const pixel = piText('t_b43bab73cd75dc851f3e');

  const noise = [
    't_cab3df32cb9908a19ecc',
    't_20e4a2705db55a4dd89d',
    't_9493e0b57ab8e4f61845',
    't_9371925b89ea749d94dc',
    't_c83cd446536c92145b65',
    't_204ae710abc17196c1ff'
  ].map(piText).join('');

  const check = [
    't_cab3df32cb9908a19ecc',
    't_4ae54bdac5971a52ef08',
    't_4d2c9f87a7fb5f4f36ac'
  ].map(piText).join('') +
    "stroke-linejoin='round'/%3E%3C/svg%3E\")";

  const arrow = [
    't_cab3df32cb9908a19ecc',
    't_80dcd0d9044d1c5fd983'
  ].map(piText).join('') +
    "%3C/svg%3E\")";

  return (
    piText('t_f2ef25f01965faeefc46') +
    pixel +
    piText('t_a5ff6b7b87656a624534') +
    noise +
    piText('t_3387cfad93a7adda95b9') +
    pixel +
    piText('t_634cc66c086b37877235') +
    arrow +
    piText('t_d5faea46fd7954af6fe6') +
    pixel +
    piText('t_03f9f435c23740c2c2d6') +
    check +
    piText('t_04228e6ac3dba6d5b6b3') +
    pixel +
    piText('t_f3b5310cfc53102b0cce')
  );
}

const AGENCY_STYLE = `
  .pcn.acn[hidden],
  .acn [hidden] {
    display: none !important;
  }

  .acn {
    z-index: 10000;
  }

  .acn button,
  .acn select {
    touch-action: manipulation;
  }

  .acn .pcn-top {
    flex-wrap: wrap;
  }

  .acn .acn-case-select {
    max-width: min(420px, 70vw);
  }

  .acn .pcn-board {
    min-width: 0;
  }

  .acn .pcn-clouds {
    position: relative;
    isolation: isolate;
  }

  .acn .pcn-cloud {
    position: relative;
    z-index: 1;
    cursor: default;
  }

  .acn .pcn-cloud-title {
    cursor: default;
    overflow-wrap: anywhere;
  }

  .acn .pcn-cloud-words .pcn-word {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .acn .acn-clue-link {
    color: #9b2f22;
    font-size: 0.85em;
  }

  .acn .acn-lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
    z-index: 0;
  }

  .acn .pcn-status {
    white-space: normal;
  }

  @media (max-width: 700px) {
    .acn .pcn-work {
      grid-template-columns: 1fr !important;
    }

    .acn .pcn-bank {
      display: none;
    }

    .acn .pcn-clouds {
      grid-template-columns: 1fr !important;
    }
  }
`;

export function installAgencyNotebook(ui) {
  if (ui.caseCloudNotebook) {
    return ui.caseCloudNotebook;
  }

  const state = ui.state || gameState;
  const scene = ui.scene;

  let dead = false;
  let collapsed = true;
  let big = state[VIEW_STORE]?.agency?.big === true;
  let selectedId = null;
  let signature = '';
  let lastCheck = -Infinity;
  let observer = null;
  let frame = null;

  const restorers = [];

  const style = element(
    'style',
    getPIStyle() + AGENCY_STYLE
  );

  const root = element(
    'section',
    undefined,
    'pcn acn'
  );

  root.hidden = true;
  root.setAttribute('aria-label', 'Agency case notes');

  const handle = element(
    'button',
    'NOTES',
    'pcn-handle'
  );

  handle.type = 'button';

  const paper = element(
    'section',
    undefined,
    'pcn-paper'
  );

  paper.hidden = true;

  root.append(handle, paper);

  document.head.append(style);
  document.body.append(root);

  function live() {
    return Boolean(
      !dead &&
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended &&
      scene.sys?.isActive()
    );
  }

  function getStore() {
    if (!state[STORE] || typeof state[STORE] !== 'object') {
      state[STORE] = {};
    }

    if (
      !state[STORE].agency ||
      typeof state[STORE].agency !== 'object'
    ) {
      state[STORE].agency = {};
    }

    return state[STORE].agency;
  }

  function currentCaseId() {
    return String(
      state.currentCaseId ||
      state.currentMission?.id ||
      state.currentMission?.missionId ||
      ''
    );
  }

  function saveView() {
    state[VIEW_STORE] ||= {};

    state[VIEW_STORE].agency = {
      ...state[VIEW_STORE].agency,
      collapsed,
      big,
      selectedCaseId: selectedId
    };

    requestAutosave();
  }

  function syncAgency() {
    const id = currentCaseId();

    if (!id || !safeKey(id)) return;

    const mission = state.currentMission || {};

    const aliases = new Set(
      [id, mission.id, mission.missionId]
        .filter(value => value !== undefined && value !== null)
        .map(String)
    );

    const clues = array(state.cluesCollected).filter(clue => {
      if (!clue) return false;

      if (typeof clue === 'string') {
        return true;
      }

      if (typeof clue !== 'object') {
        return false;
      }

      if (
        clue.scope === 'pi' ||
        clue.source === 'pi' ||
        clue.type === 'pi'
      ) {
        return false;
      }

      return [clue.caseId, clue.missionId]
        .filter(value => value !== undefined && value !== null)
        .every(value => aliases.has(String(value)));
    });

    const title =
      mission.title ||
      mission.name ||
      state.currentArtifact?.name ||
      (
        typeof mission.artifact === 'string'
          ? mission.artifact
          : mission.artifact?.name
      ) ||
      `CASE ${id}`;

    const cases = getStore();

    const old = Object.hasOwn(cases, id)
      ? cases[id] || {}
      : {};

    const words = new Map(
      array(old.keywords)
        .filter(word => word?.id)
        .map(word => [String(word.id), word])
    );

    const groups = new Map(
      array(old.clouds)
        .filter(group => group?.id)
        .map(group => [String(group.id), group])
    );

    const names = {
      suspect: 'SUSPECTS',
      travel: 'TRAVEL',
      reconstruction: 'RECONSTRUCTION',
      hair: 'HAIR',
      eyes: 'EYES',
      features: 'FEATURES',
      skills: 'SKILLS',
      evidence: 'EVIDENCE',
      identity: 'IDENTITY',
      alibi: 'ALIBIS'
    };

    clues.forEach((clue, index) => {
      const object =
        typeof clue === 'object' ? clue : {};

      const groupId = String(
        object.notebookGroup ||
        object.category ||
        object.type ||
        'evidence'
      );

      const wordId = String(
        object.id ||
        object.key ||
        `entry_${index}_${hash(JSON.stringify(clue))}`
      );

      const label = typeof clue === 'string'
        ? clue
        : String(
            object.text ||
            object.tag ||
            object.value ||
            object.key ||
            'Clue'
          );

      groups.set(groupId, {
        ...groups.get(groupId),
        id: groupId,
        title:
          object.notebookGroupTitle ||
          names[groupId] ||
          groupId.replace(/_/g, ' ').toUpperCase()
      });

      words.set(wordId, {
        ...words.get(wordId),
        id: wordId,
        label,
        cloudId: groupId,
        relatedIds: array(
          object.relatedClueIds || object.relatedIds
        )
      });
    });

    const keywords = [...words.values()];

    const wordGroups = new Map(
      keywords.map(word => [
        String(word.id),
        String(word.cloudId)
      ])
    );

    const links = [];
    const seen = new Set();

    for (const word of keywords) {
      for (const relatedId of array(word.relatedIds)) {
        const from = String(word.cloudId);
        const to = wordGroups.get(String(relatedId));

        if (!to || from === to) continue;

        const key = [from, to].sort().join('|');

        if (seen.has(key)) continue;

        seen.add(key);
        links.push({ from, to });
      }
    }

    const next = {
      ...old,
      id,
      title,
      keywords,
      clouds: [...groups.values()],
      links
    };

    if (JSON.stringify(old) !== JSON.stringify(next)) {
      cases[id] = next;
      requestAutosave();
    }
  }

  function getCases() {
    syncAgency();

    return Object.values(getStore())
      .filter(entry => entry && entry.id);
  }

  function stopLines() {
    observer?.disconnect();
    observer = null;

    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function drawLines(grid, definition) {
    grid.querySelector('.acn-lines')?.remove();

    if (!grid.isConnected || !live() || collapsed) {
      return;
    }

    const cards = new Map(
      [...grid.querySelectorAll('[data-cloud]')]
        .map(card => [card.dataset.cloud, card])
    );

    const svg = document.createElementNS(SVG_NS, 'svg');

    svg.setAttribute('class', 'acn-lines');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute(
      'viewBox',
      `0 0 ${Math.max(1, grid.scrollWidth)} ${Math.max(1, grid.scrollHeight)}`
    );

    svg.style.width = `${grid.scrollWidth}px`;
    svg.style.height = `${grid.scrollHeight}px`;

    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');

    const markerId = `agency-notes-arrow-${scene.sys.settings.key}`;

    marker.setAttribute('id', markerId);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto');

    const tip = document.createElementNS(SVG_NS, 'path');

    tip.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    tip.setAttribute('fill', '#9b2f22');

    marker.append(tip);
    defs.append(marker);
    svg.append(defs);

    for (const link of array(definition.links)) {
      const a = cards.get(String(link.from));
      const b = cards.get(String(link.to));

      if (!a || !b) continue;

      const ax = a.offsetLeft + a.offsetWidth / 2;
      const ay = a.offsetTop + a.offsetHeight / 2;
      const bx = b.offsetLeft + b.offsetWidth / 2;
      const by = b.offsetTop + b.offsetHeight / 2;

      const dx = bx - ax;
      const dy = by - ay;
      const length = Math.hypot(dx, dy);

      if (!length) continue;

      const ux = dx / length;
      const uy = dy / length;

      const reach = card => {
        const rx = Math.max(1, card.offsetWidth / 2);
        const ry = Math.max(1, card.offsetHeight / 2);

        return 1 / Math.sqrt(
          (ux / rx) ** 2 + (uy / ry) ** 2
        );
      };

      const start = reach(a) + 7;
      const end = length - reach(b) - 9;

      if (end - start < 14) continue;

      const x1 = ax + ux * start;
      const y1 = ay + uy * start;
      const x2 = ax + ux * end;
      const y2 = ay + uy * end;
      const bend = (end - start) * 0.14;
      const cx = (x1 + x2) / 2 - uy * bend;
      const cy = (y1 + y2) / 2 + ux * bend;

      const path = document.createElementNS(SVG_NS, 'path');

      path.setAttribute(
        'd',
        `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
      );

      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#9b2f22');
      path.setAttribute('stroke-width', '2.6');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-dasharray', '7 5');
      path.setAttribute('marker-end', `url(#${markerId})`);

      svg.append(path);
    }

    grid.prepend(svg);
  }

  function watchLines(grid, definition) {
    stopLines();

    const schedule = () => {
      if (frame !== null || dead) return;

      frame = requestAnimationFrame(() => {
        frame = null;

        if (!dead && grid.isConnected) {
          drawLines(grid, definition);
        }
      });
    };

    schedule();

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      observer.observe(grid);
    }
  }

  function button(label, action, className) {
    const node = element('button', label, className);

    node.type = 'button';

    node.addEventListener('click', event => {
      event.stopPropagation();

      if (live()) action();
    });

    return node;
  }

  function setCollapsed(value) {
    if (dead) return;

    collapsed = Boolean(value);
    saveView();
    draw();
  }

  function draw() {
    if (dead) return;

    root.hidden = !live();

    handle.textContent = collapsed
      ? 'NOTES'
      : 'CLOSE NOTES';

    handle.setAttribute(
      'aria-expanded',
      String(!collapsed)
    );

    paper.hidden = collapsed;
    root.classList.toggle('pcn-big', big);

    if (!live() || collapsed) {
      stopLines();
      return;
    }

    const cases = getCases();

    const definition =
      cases.find(entry => String(entry.id) === selectedId) ||
      cases.find(entry => String(entry.id) === currentCaseId()) ||
      cases[0];

    selectedId = definition
      ? String(definition.id)
      : null;

    const oldBoardTop =
      paper.querySelector('.pcn-board')?.scrollTop || 0;

    const oldBankTop =
      paper.querySelector('.pcn-bank')?.scrollTop || 0;

    stopLines();
    paper.replaceChildren();

    const top = element('div', undefined, 'pcn-top');

    top.append(
      element('span', 'AGENCY NOTES', 'pcn-title'),
      element('span', undefined, 'pcn-grow')
    );

    const select = element(
      'select',
      undefined,
      'acn-case-select'
    );

    select.setAttribute('aria-label', 'Agency case');

    for (const entry of cases) {
      const option = element(
        'option',
        entry.title || `CASE ${entry.id}`
      );

      option.value = String(entry.id);
      option.selected = String(entry.id) === selectedId;

      select.append(option);
    }

    select.disabled = cases.length === 0;

    select.addEventListener('change', () => {
      if (!live()) return;

      selectedId = select.value;
      saveView();

      paper.replaceChildren();
      draw();
    });

    top.append(
      select,
      button(
        big ? 'SHRINK' : 'ENLARGE',
        () => {
          big = !big;
          saveView();
          draw();
        },
        'pcn-size'
      )
    );

    paper.append(top);

    if (!definition) {
      paper.append(
        element(
          'p',
          'No agency clues yet. Investigate the current case to collect notes.',
          'pcn-empty'
        )
      );

      return;
    }

    const keywords = array(definition.keywords);

    const groups = array(definition.clouds)
      .map(group => ({
        ...group,
        words: keywords.filter(
          word =>
            String(word.cloudId) === String(group.id)
        )
      }))
      .filter(group => group.words.length);

    const work = element('div', undefined, 'pcn-work');
    const bank = element('aside', undefined, 'pcn-bank');
    const board = element('div', undefined, 'pcn-board');
    const grid = element('div', undefined, 'pcn-clouds');

    const heading = element('div', undefined, 'pcn-bank-head');

    heading.append(
      element('h3', 'COLLECTED CLUES'),
      element('span', keywords.length, 'pcn-count')
    );

    bank.append(heading);

    const words = element('div', undefined, 'pcn-words');

    for (const word of keywords) {
      const row = element('div', undefined, 'pcn-word');

      row.append(element('span', word.label || 'Clue'));
      words.append(row);
    }

    if (!keywords.length) {
      words.append(
        element('p', 'Nothing collected yet.', 'pcn-empty')
      );
    }

    bank.append(words);

    for (const group of groups) {
      const card = element(
        'article',
        undefined,
        'pcn-cloud'
      );

      card.dataset.cloud = String(group.id);

      card.append(
        element(
          'h3',
          group.title || String(group.id).toUpperCase(),
          'pcn-cloud-title'
        )
      );

      const members = element(
        'div',
        undefined,
        'pcn-cloud-words'
      );

      for (const word of group.words) {
        const row = element('div', undefined, 'pcn-word');

        row.append(element('span', word.label || 'Clue'));
        members.append(row);
      }

      card.append(members);

      const related = new Set();

      for (const link of array(definition.links)) {
        const from = String(link.from);
        const to = String(link.to);
        const id = String(group.id);

        if (from === id) related.add(to);
        if (to === id) related.add(from);
      }

      const relatedNames = groups
        .filter(entry => related.has(String(entry.id)))
        .map(entry => entry.title || entry.id);

      if (relatedNames.length) {
        card.append(
          element(
            'small',
            `Linked: ${relatedNames.join(', ')}`,
            'acn-clue-link'
          )
        );
      }

      grid.append(card);
    }

    if (!groups.length) {
      grid.append(
        element(
          'p',
          'New clues will appear here as you investigate.',
          'pcn-empty'
        )
      );
    }

    board.append(grid);
    work.append(bank, board);

    paper.append(
      work,
      element(
        'div',
        `${keywords.length} CLUES / ${groups.length} GROUPS — Agency cases only.`,
        'pcn-status'
      )
    );

    board.scrollTop = oldBoardTop;
    bank.scrollTop = oldBankTop;

    watchLines(grid, definition);
  }

  handle.addEventListener('click', event => {
    event.stopPropagation();

    if (!live()) return;

    setCollapsed(!collapsed);
  });

  for (const type of [
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'mousemove',
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel',
    'click',
    'dblclick',
    'contextmenu',
    'wheel',
    'keyup'
  ]) {
    root.addEventListener(
      type,
      event => event.stopPropagation(),
      { passive: true }
    );
  }

  root.addEventListener('keydown', event => {
    event.stopPropagation();

    if (event.key === 'Escape' && !collapsed) {
      event.preventDefault();
      setCollapsed(true);
      handle.focus();
    }
  });

  function wrap(name, createReplacement) {
    if (typeof ui[name] !== 'function') return;

    const original = ui[name];
    const replacement = createReplacement(original);

    ui[name] = replacement;

    restorers.push(() => {
      if (ui[name] === replacement) {
        ui[name] = original;
      }
    });
  }

  wrap('open', original => function (...args) {
    const wasOpen = this.isOpen;

    if (!wasOpen) {
      collapsed = true;
      paper.hidden = true;
      signature = '';
    }

    const result = original.apply(this, args);

    if (!wasOpen && this.isOpen) {
      selectedId = currentCaseId() || null;
      saveView();
    }

    draw();
    return result;
  });

  for (const name of ['close', 'suspend', 'resume']) {
    wrap(name, original => function (...args) {
      const result = original.apply(this, args);
      draw();
      return result;
    });
  }

  function step() {
    if (dead) return;

    if (!live()) {
      if (!root.hidden) {
        root.hidden = true;
        stopLines();
      }

      return;
    }

    if (root.hidden) {
      draw();
    }

    const now = scene.time?.now ?? Date.now();

    if (now - lastCheck < 300) return;

    lastCheck = now;

    const next = JSON.stringify([
      getCases(),
      selectedId,
      collapsed,
      big
    ]);

    if (next !== signature) {
      signature = next;

      if (!collapsed) {
        draw();
      }
    }
  }

  function onResize() {
    if (live()) draw();
  }

  function destroy() {
    if (dead) return;

    dead = true;
    stopLines();

    scene.game.events.off('poststep', step);
    scene.scale.off('resize', onResize);
    scene.events.off('shutdown', destroy);
    scene.events.off('destroy', destroy);

    root.remove();
    style.remove();

    for (const restore of restorers.reverse()) {
      restore();
    }

    if (ui.caseCloudNotebook === api) {
      delete ui.caseCloudNotebook;
    }
  }

  const api = {
    scope: 'agency',

    hide() {
      setCollapsed(true);
    },

    show() {
      setCollapsed(false);
    },

    toggle() {
      setCollapsed(!collapsed);
    },

    revealKeyword(caseId, keywordId) {
      if (dead) return false;

      const definition = getCases().find(
        entry => String(entry.id) === String(caseId)
      );

      if (
        !definition ||
        !array(definition.keywords).some(
          word => String(word.id) === String(keywordId)
        )
      ) {
        return false;
      }

      selectedId = String(caseId);
      setCollapsed(false);

      return true;
    },

    destroy,

    get collapsed() {
      return collapsed;
    }
  };

  ui.caseCloudNotebook = api;

  wrap('destroy', original => function (...args) {
    destroy();
    return original.apply(this, args);
  });

  scene.game.events.on('poststep', step);
  scene.scale.on('resize', onResize);
  scene.events.once('shutdown', destroy);
  scene.events.once('destroy', destroy);

  draw();

  return api;
}