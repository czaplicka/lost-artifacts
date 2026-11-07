import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';

import {
  knownWords,
  cloudCase,
  namingOptions,
  createCloud,
  nameCloud,
  addCloudWords,
  removeCloudWords,
  deleteCloud,
  linkClouds,
  unlinkClouds,
  unsortedWords,
  cloudTitle
} from './PlayerCloudModel.js';

import { useCloudKeyword } from './PlayerCloudContacts.js';
import { syncNotebookSearchCase } from './NotebookSearchContext.js';

import {
  notebookContact
} from './pi-computer/NotebookContactActions.js';

const CSS = `
.pcn{position:fixed;z-index:11000;left:8px;right:8px;bottom:0;font-family:SpecialElite,'Special Elite',monospace;color:#345b68;pointer-events:none}
.pcn *{box-sizing:border-box}
.pcn button,.pcn select,.pcn input{font:inherit;touch-action:manipulation}
.pcn button{border:1px solid #b2a77c;background:#f6edc8;color:#345b68;padding:6px 9px;min-height:34px;cursor:pointer}
.pcn button:hover,.pcn button:focus-visible{background:#fff8dd;outline:2px solid #a46843}
.pcn button:disabled{opacity:.4;cursor:default}
.pcn .pcn-handle{display:block;margin:auto;pointer-events:auto;min-width:210px;background:#e9e2b2}
.pcn .pcn-paper{position:relative;pointer-events:auto;background:#e9e2b2;box-shadow:0 -4px 18px #0006;border:2px solid #a6986f;border-left:12px dotted #6e6b56;height:min(46vh,440px);min-height:250px;display:flex;flex-direction:column;padding:8px 12px}
.pcn [hidden]{display:none!important}
.pcn .pcn-top{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:7px}
.pcn select{padding:5px;max-width:240px;background:#fbf3d7;color:#345b68;border:1px solid #a99d79}
.pcn .pcn-title{font-size:13px;margin-right:auto}
.pcn .pcn-selected{background:#d7cfa0;border-color:#345b68}
.pcn .pcn-work{display:grid;grid-template-columns:minmax(180px,25%) 1fr;gap:12px;min-height:0;flex:1}
.pcn .pcn-bank{overflow:auto;border-right:1px solid #b3a574;padding-right:10px}
.pcn .pcn-bank h3{margin:2px 0 8px;font-size:15px}
.pcn .pcn-words{display:flex;flex-direction:column;gap:4px}
.pcn .pcn-word{display:flex;align-items:center;gap:7px;font-size:14px;min-height:30px;padding:3px}
.pcn label.pcn-word{cursor:pointer}
.pcn .pcn-word input{width:17px;height:17px;flex-shrink:0}
.pcn .pcn-word button{text-align:left;width:100%;border:0;background:transparent;min-height:28px;padding:2px 4px;overflow-wrap:anywhere}
.pcn .pcn-word .pcn-email{color:#183b63;text-decoration:underline;text-underline-offset:3px}
.pcn .pcn-word .pcn-email:hover,.pcn .pcn-word .pcn-email:focus-visible{color:#8a3d26;background:#fff8dd}
.pcn .pcn-board{overflow:auto;min-width:0}
.pcn .pcn-clouds{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;padding:5px}
.pcn .pcn-cloud{border:2px solid #57717a;border-radius:47% 53% 45% 55% / 32% 36% 64% 68%;padding:18px 24px 22px;min-height:138px;background:#eee7bb}
.pcn .pcn-cloud.pcn-active{border-color:#a15e39;background:#f4ebc5}
.pcn .pcn-cloud-title{display:block;width:100%;border:0;font-size:15px;background:transparent;min-height:28px}
.pcn .pcn-cloud .pcn-word{font-size:13px;min-height:25px}
.pcn .pcn-cloud .pcn-word button{font-size:13px}
.pcn .pcn-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 0 0;border-top:1px solid #b3a574;margin-top:6px;font-size:13px}
.pcn .pcn-dialog{position:absolute;inset:12px;background:#f3eacb;border:2px solid #65767a;padding:14px;overflow:auto;z-index:3}
.pcn .pcn-names{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.pcn .pcn-status{font-size:12px;min-height:18px;margin-top:5px}
@media(max-width:650px){
  .pcn .pcn-paper{height:55vh;padding:7px;min-height:280px}
  .pcn .pcn-work{grid-template-columns:minmax(120px,34%) 1fr;gap:6px}
  .pcn .pcn-clouds{grid-template-columns:1fr}
  .pcn .pcn-top select{max-width:170px}
  .pcn .pcn-title{display:none}
  .pcn .pcn-tools button{font-size:12px;padding:5px}
}
`;

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

export function notebookKeywordLocation(definition, keywordId) {
  const word = knownWords(gameState, definition).find(
    entry => entry.id === keywordId
  );

  if (!word) return null;

  const clouds = cloudCase(gameState, definition.id).clouds;
  const index = clouds.findIndex(
    cloud => cloud.words.includes(keywordId)
  );

  return {
    cloudId: index < 0 ? 'unsorted' : clouds[index].id,
    cloudPage: 0,
    wordPage: 0
  };
}

export function installPlayerCloudNotebook(ui) {
  if (ui.caseCloudNotebook) return ui.caseCloudNotebook;

  const state = ui.state || gameState;

  let dead = false;
  let collapsed = state.playerCloudViewV1?.collapsed === true;

  let caseId =
    state.playerCloudViewV1?.selectedCaseId ||
    state.piKeywordSearch?.selectedCaseId ||
    null;

  let activeId = null;
  let mode = 'organise';
  let all = false;
  let dialogId = null;

  const bankSelection = new Set();
  const memberSelection = new Set();

  let message = '';
  let signature = '';
  let busy = false;

  const root = el('section', undefined, 'pcn');
  const style = el('style', CSS);

  document.head.append(style);
  document.body.append(root);

  const handle = el('button', 'CASE NOTES', 'pcn-handle');
  handle.type = 'button';

  const paper = el('section', undefined, 'pcn-paper');
  root.append(handle, paper);

  const live = () =>
    !dead &&
    !ui.destroyed &&
    ui.isOpen &&
    !ui.suspended;

  const definitions = () =>
    Array.isArray(ui.search?.data?.cases)
      ? ui.search.data.cases
      : [];

  const cases = () => definitions().filter(
    definition =>
      knownWords(state, definition).length ||
      cloudCase(state, definition.id).clouds.length
  );

  const selected = () => definitions().find(
    definition => definition.id === caseId
  );

  function syncSelection() {
    if (!definitions().length) return selected();

    const available = cases();

    if (!available.some(definition => definition.id === caseId)) {
      const preferred = state.piKeywordSearch?.selectedCaseId;

      caseId = (
        available.find(definition => definition.id === preferred) ||
        available[0]
      )?.id || null;

      activeId = null;
      dialogId = null;
      bankSelection.clear();
      memberSelection.clear();
    }

    if (caseId) {
      syncNotebookSearchCase(ui, caseId, state);
    }

    return selected();
  }

  function chooseCase(id, { render = true } = {}) {
    if (dead || !cases().some(definition => definition.id === id)) {
      return false;
    }

    if (caseId !== id) {
      caseId = id;
      activeId = null;
      dialogId = null;
      message = '';
      bankSelection.clear();
      memberSelection.clear();
      signature = '';
    }

    syncNotebookSearchCase(ui, id, state);

    if (render && live() && ui.app === 'search') {
      ui.render();
    } else {
      draw();
    }

    return true;
  }

  function changed() {
    requestAutosave();
    bankSelection.clear();
    memberSelection.clear();
    signature = '';
    draw();
  }

  function button(label, action, disabled = false) {
    const node = el('button', label);
    node.type = 'button';
    node.disabled = disabled;

    node.addEventListener('click', event => {
      event.stopPropagation();
      if (live() && !node.disabled) action();
    });

    return node;
  }

  function setCollapsed(value) {
    collapsed = Boolean(value);

    state.playerCloudViewV1 = {
      ...(state.playerCloudViewV1 || {}),
      collapsed
    };

    requestAutosave();
    draw();
  }

  handle.onclick = () => setCollapsed(!collapsed);

  root.addEventListener(
    'pointerdown',
    event => event.stopPropagation()
  );

  root.addEventListener('keydown', event => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();

      if (dialogId) {
        dialogId = null;
        draw();
      } else {
        setCollapsed(true);
      }
    }
  });

  function getEmailContact(word) {
    const numberLength = Number(
      ui.scene.cache.json.get('piPhoneDirectory')?.numberLength
    ) || 3;

    const contact = notebookContact(word, numberLength);

    return contact?.kind === 'email' ? contact : null;
  }

  function emailButton(word, definition) {
    const contact = getEmailContact(word);

    const node = button(
      word.label || contact?.value || 'Email',
      () => use(word, definition)
    );

    node.classList.add('pcn-email');

    if (contact) {
      node.title = `Write to ${contact.value}`;
      node.setAttribute(
        'aria-label',
        `Write an email to ${contact.value}`
      );
    }

    return node;
  }

  function checkbox(word, selection, definition) {
    const email = getEmailContact(word);

    const row = el(
      email ? 'div' : 'label',
      undefined,
      'pcn-word'
    );

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selection.has(word.id);
    input.setAttribute('aria-label', `Select note: ${word.label}`);

    input.onchange = () => {
      if (input.checked) selection.add(word.id);
      else selection.delete(word.id);
      draw();
    };

    row.append(input);

    if (email) {
      row.append(emailButton(word, definition));
    } else {
      row.append(el('span', word.label));
    }

    return row;
  }

  function use(word, definition) {
    if (busy || !live() || ui.booting) return;

    const email = getEmailContact(word);

    if (
      email &&
      typeof ui.photoQuest?.contactMail?.openComposer !== 'function'
    ) {
      message =
        '“I have the address. Now I just need a working mailbox.”';
      draw();
      return;
    }

    busy = true;
    message = '';

    Promise.resolve()
      .then(() => useCloudKeyword(ui, definition, word))
      .catch(error => {
        console.error('[PlayerCloudNotebook]', error);

        message = email
          ? '“The message will have to wait. The mailbox is not cooperating.”'
          : 'This action could not be opened.';
      })
      .finally(() => {
        busy = false;
        draw();
      });
  }

  function wordRow(word, selection, definition) {
    if (mode === 'organise') {
      return checkbox(word, selection, definition);
    }

    const row = el('div', undefined, 'pcn-word');

    row.append(
      getEmailContact(word)
        ? emailButton(word, definition)
        : button(word.label, () => use(word, definition))
    );

    return row;
  }

  function inactiveWordRow(word, definition) {
    if (!getEmailContact(word)) {
      return el('div', word.label, 'pcn-word');
    }

    const row = el('div', undefined, 'pcn-word');
    row.append(emailButton(word, definition));

    return row;
  }

  function draw() {
    if (dead) return;

    root.hidden = !live();
    if (!live()) return;

    const definition = syncSelection();
    const available = cases();

    handle.textContent = collapsed
      ? '▲ CASE NOTES'
      : '▼ HIDE NOTES';

    handle.setAttribute('aria-expanded', String(!collapsed));
    paper.hidden = collapsed;

    if (collapsed) return;

    paper.replaceChildren();

    const top = el('div', undefined, 'pcn-top');

    top.append(
      el('span', 'PRIVATE INVESTIGATIONS', 'pcn-title')
    );

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Case');

    for (const entry of available) {
      const option = el('option', entry.title);
      option.value = entry.id;
      option.selected = entry.id === caseId;
      select.append(option);
    }

    select.onchange = () => chooseCase(select.value);
    top.append(select);

    const organise = button('ORGANISE', () => {
      mode = 'organise';
      draw();
    });

    const useButton = button('USE WORDS', () => {
      mode = 'use';
      dialogId = null;
      draw();
    });

    (mode === 'organise' ? organise : useButton)
      .classList.add('pcn-selected');

    top.append(organise, useButton);
    paper.append(top);

    if (!definition) {
      paper.append(el('p', 'Collect a clue to start your notes.'));
      return;
    }

    const progress = cloudCase(state, caseId);
    const words = knownWords(state, definition);
    const map = new Map(words.map(word => [word.id, word]));

    if (!progress.clouds.some(cloud => cloud.id === activeId)) {
      activeId = null;
    }

    const work = el('div', undefined, 'pcn-work');
    const bank = el('aside', undefined, 'pcn-bank');
    const board = el('div', undefined, 'pcn-board');

    bank.append(
      el('h3', all ? 'ALL WORDS IN THIS CASE' : 'UNSORTED'),
      button(all ? 'SHOW UNSORTED' : 'SHOW ALL', () => {
        all = !all;
        bankSelection.clear();
        draw();
      })
    );

    const bankWords = all
      ? words
      : unsortedWords(state, definition);

    const list = el('div', undefined, 'pcn-words');

    for (const word of bankWords) {
      list.append(wordRow(word, bankSelection, definition));
    }

    if (!bankWords.length) list.append(el('p', 'No words here.'));
    bank.append(list);

    const grid = el('div', undefined, 'pcn-clouds');

    for (const cloud of progress.clouds) {
      const card = el(
        'article',
        undefined,
        'pcn-cloud' + (cloud.id === activeId ? ' pcn-active' : '')
      );

      card.dataset.cloud = cloud.id;

      const title = button(
        cloudTitle(state, definition, cloud) +
        (cloud.titleKey ? ' ?' : ''),
        () => {
          activeId = cloud.id;
          memberSelection.clear();
          draw();
        }
      );

      title.className = 'pcn-cloud-title';
      card.append(title);

      const members = cloud.words.map(id => map.get(id)).filter(Boolean);

      for (const word of members) {
        if (mode === 'organise' && cloud.id !== activeId) {
          card.append(inactiveWordRow(word, definition));
        } else {
          card.append(wordRow(word, memberSelection, definition));
        }
      }

      if (!members.length) card.append(el('p', 'Empty cloud'));

      const linked = progress.links
        .filter(link => link.from === cloud.id || link.to === cloud.id)
        .map(link => progress.clouds.find(
          entry => entry.id === (
            link.from === cloud.id ? link.to : link.from
          )
        ))
        .filter(Boolean);

      if (linked.length) {
        card.append(
          el(
            'small',
            '↔ ' + linked.map(
              entry => cloudTitle(state, definition, entry)
            ).join(', ')
          )
        );
      }

      grid.append(card);
    }

    if (!progress.clouds.length) {
      grid.append(
        el(
          'p',
          'Select words and create your first cloud. ' +
          'Nothing is grouped automatically.'
        )
      );
    }

    board.append(grid);
    work.append(bank, board);
    paper.append(work);

    const tools = el('div', undefined, 'pcn-tools');
    const active = progress.clouds.find(cloud => cloud.id === activeId);

    if (mode === 'organise') {
      tools.append(
        button('CREATE CLOUD', () => {
          activeId = createCloud(state, definition, [...bankSelection]);
          changed();
        }),
        button(
          'ADD SELECTED',
          () => {
            addCloudWords(state, definition, activeId, [...bankSelection]);
            changed();
          },
          !active || !bankSelection.size
        ),
        button(
          'REMOVE FROM CLOUD',
          () => {
            removeCloudWords(state, caseId, activeId, [...memberSelection]);
            changed();
          },
          !active || !memberSelection.size
        ),
        button(
          'NAME CLOUD',
          () => {
            dialogId = activeId;
            draw();
          },
          !active
        ),
        button(
          'DELETE CLOUD',
          () => {
            deleteCloud(state, caseId, activeId);
            activeId = null;
            dialogId = null;
            changed();
          },
          !active
        )
      );

      if (active && progress.clouds.length > 1) {
        const targets = document.createElement('select');
        targets.setAttribute('aria-label', 'Link another cloud');

        for (const cloud of progress.clouds.filter(
          entry => entry.id !== activeId
        )) {
          const option = el(
            'option',
            cloudTitle(state, definition, cloud)
          );

          option.value = cloud.id;
          targets.append(option);
        }

        tools.append(
          targets,
          button('LINK', () => {
            linkClouds(state, caseId, activeId, targets.value);
            changed();
          }),
          button('UNLINK', () => {
            unlinkClouds(state, caseId, activeId, targets.value);
            changed();
          })
        );
      }
    } else {
      tools.append(
        el(
          'span',
          'Click a word to search, dial a discovered number ' +
          'or use an email address.'
        )
      );
    }

    const status = el(
      'div',
      message ||
      'Names are hypotheses. The notebook does not mark them right or wrong.',
      'pcn-status'
    );

    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    paper.append(tools, status);

    if (dialogId) {
      const cloud = progress.clouds.find(entry => entry.id === dialogId);

      if (!cloud) {
        dialogId = null;
        return;
      }

      const dialog = el('section', undefined, 'pcn-dialog');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-label', 'Name cloud');

      dialog.append(
        el('h3', 'Choose a hypothesis'),
        el(
          'p',
          'Only names you have encountered are offered. ' +
          'You can change your mind.'
        )
      );

      const names = el('div', undefined, 'pcn-names');

      for (const option of namingOptions(state, definition)) {
        names.append(
          button(option.label, () => {
            nameCloud(state, definition, dialogId, option.id);
            dialogId = null;
            changed();
          })
        );
      }

      dialog.append(
        names,
        button('CLEAR NAME', () => {
          nameCloud(state, definition, dialogId, null);
          dialogId = null;
          changed();
        }),
        button('CANCEL', () => {
          dialogId = null;
          draw();
        })
      );

      paper.append(dialog);
    }
  }

  function revealKeyword(id, keywordId) {
    const definition = definitions().find(entry => entry.id === id);

    if (
      !definition ||
      !knownWords(state, definition).some(word => word.id === keywordId)
    ) {
      return false;
    }

    caseId = id;
    activeId = null;
    all = true;
    collapsed = false;
    dialogId = null;

    bankSelection.clear();
    memberSelection.clear();

    state.playerCloudViewV1 = {
      ...(state.playerCloudViewV1 || {}),
      collapsed: false,
      selectedCaseId: id
    };

    syncNotebookSearchCase(ui, id, state);
    requestAutosave();

    if (live() && ui.app === 'search') ui.render();
    else draw();

    return true;
  }

  const originalRenderNotebook = ui.search.renderNotebook;
  ui.search.renderNotebook = () => {};
  ui.search.notesOpen = false;

  const originalWorkspace = ui.monitor.calculateWorkspace;

  ui.monitor.calculateWorkspace = () => {
    const { width, height } = ui.scene.scale;

    const scale = Math.max(
      .001,
      Math.min(
        Math.max(1, width - 16) / 1120,
        Math.max(1, height - 16) / 800
      )
    );

    return {
      scale,
      left: (width - 1120 * scale) / 2,
      top: (height - 800 * scale) / 2
    };
  };

  const host = ui.monitor;
  const originalRender = host.render;

  const wrapped = function (...args) {
    if (live()) syncSelection();

    const result = originalRender.apply(this, args);
    draw();

    return result;
  };

  host.render = wrapped;

  const originals = [];

  for (const key of ['close', 'suspend', 'resume']) {
    if (typeof ui[key] !== 'function') continue;

    const original = ui[key];

    const wrapper = function (...args) {
      const result = original.apply(this, args);
      draw();
      return result;
    };

    ui[key] = wrapper;
    originals.push([key, original, wrapper]);
  }

  let last = -Infinity;

  const tick = () => {
    if (!live()) {
      root.hidden = true;
      return;
    }

    if (
      !ui.booting &&
      !ui.search.data &&
      !ui.search.loading &&
      !ui.search.error
    ) {
      Promise.resolve(ui.search.load())
        .then(() => {
          if (live()) draw();
        })
        .catch(error => {
          console.error(
            '[PlayerCloudNotebook] Search load failed:',
            error
          );
        });
    }

    if (ui.scene.time.now - last < 250) return;

    last = ui.scene.time.now;

    const next = JSON.stringify([
      state.piKeywordSearch,
      state.playerCloudNotebookV1,
      state.playerCloudViewV1?.selectedCaseId,
      ui.app,
      ui.booting
    ]);

    if (next !== signature) {
      signature = next;
      draw();
    }
  };

  ui.scene.game.events.on('poststep', tick);

  const resize = () => draw();
  ui.scene.scale.on('resize', resize);

  const oldRetro = ui.search.retroButton;
  let retroWrapper = null;

  if (typeof oldRetro === 'function') {
    retroWrapper = function (
      x, y, width, height, label, callback, ...rest
    ) {
      return oldRetro.call(
        this,
        x,
        y,
        width,
        height,
        label,
        label === 'NOTES'
          ? () => setCollapsed(!collapsed)
          : callback,
        ...rest
      );
    };

    ui.search.retroButton = retroWrapper;
  }

  function destroy() {
    if (dead) return;

    dead = true;

    ui.scene.game.events.off('poststep', tick);
    ui.scene.scale.off('resize', resize);
    ui.scene.events.off('shutdown', destroy);
    ui.scene.events.off('destroy', destroy);

    root.remove();
    style.remove();

    if (host.render === wrapped) host.render = originalRender;

    for (const [key, original, wrapper] of originals) {
      if (ui[key] === wrapper) ui[key] = original;
    }

    if (
      retroWrapper &&
      ui.search.retroButton === retroWrapper
    ) {
      ui.search.retroButton = oldRetro;
    }

    ui.search.renderNotebook = originalRenderNotebook;
    ui.monitor.calculateWorkspace = originalWorkspace;
  }

  ui.scene.events.once('shutdown', destroy);
  ui.scene.events.once('destroy', destroy);

  const originalDestroy = ui.destroy;

  ui.destroy = function (...args) {
    destroy();
    return originalDestroy.apply(this, args);
  };

  const api = {
    scope: 'pi',
    selectCase: chooseCase,
    revealKeyword,
    hide: () => setCollapsed(true),
    show: () => setCollapsed(false),
    toggle: () => setCollapsed(!collapsed),

    get collapsed() {
      return collapsed;
    },

    get selectedCaseId() {
      return caseId;
    },

    destroy
  };

  ui.caseCloudNotebook = api;
  draw();

  return api;
}