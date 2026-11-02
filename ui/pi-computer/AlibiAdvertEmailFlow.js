import { gameState } from '../../GameData.js';
import { discoverSearchKeywords, getSearchProgress } from './ComputerSearchCore.js';
import { ALIBI_SEARCH_ID, ALIBI_SEARCH_CASE } from './AlibiCaseData.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';

const QUEST = 'pi_stolen_alibi';
const KEYWORD = 'alibi_box17_email';
const EMAIL = 'box17@classifieds.local';
const DRAFT = 'alibi_box17_draft';
const SENT = 'alibi_box17_sent';
const INSTALLATION = Symbol.for('lostArtifacts.alibiAdvertEmailFlow');

function ensureKeyword(definition) {
  if (!definition || definition.id !== ALIBI_SEARCH_ID) return;
  if (definition.keywords.some(item => item.id === KEYWORD)) return;
  const cloudId = definition.keywords.find(item => item.id === 'arthur_finch')?.cloudId || definition.clouds[0]?.id;
  if (!cloudId) return;
  definition.keywords.push({ id: KEYWORD, label: EMAIL, email: EMAIL, cloudId });
}

ensureKeyword(ALIBI_SEARCH_CASE);

export function installAlibiAdvertEmailFlow(ui, documents) {
  if (ui[INSTALLATION]) return ui[INSTALLATION];
  let dead = false;
  let installed = false;
  const restorers = [];
  const alive = () => !dead && !ui.destroyed;
  const known = () => (getSearchProgress().cases[ALIBI_SEARCH_ID]?.known || []).includes(KEYWORD);
  const active = () => getPIQuest(QUEST)?.status === 'active';
  const isAdvert = () => ui.app === 'classifieds' && documents.getClassifieds().some(
    item => item.id === ui.selectedId && item.missionId === QUEST
  );
  const refresh = () => {
    if (alive() && ui.isOpen && !ui.suspended && !ui.booting) ui.render();
  };
  const wrap = (target, method, factory) => {
    if (typeof target?.[method] !== 'function') return;
    const original = target[method];
    const wrapped = factory(original.bind(target));
    target[method] = wrapped;
    restorers.push(() => { if (target[method] === wrapped) target[method] = original; });
  };
  const ensureDefinitions = () => {
    ensureKeyword(ALIBI_SEARCH_CASE);
    for (const definition of ui.search?.data?.cases || []) ensureKeyword(definition);
  };

  function collectAddress() {
    if (!alive()) return;
    ensureDefinitions();
    discoverSearchKeywords(ALIBI_SEARCH_ID, [KEYWORD]);
    const progress = getSearchProgress();
    gameState.piKeywordSearch = { ...progress, selectedCaseId: ALIBI_SEARCH_ID };
    ui.notice = 'Email saved to CASE NOTES. Click it there to write a message.';
    ui.caseCloudNotebook?.show(false);
    if (typeof ui.search?.load === 'function') {
      Promise.resolve().then(() => alive() ? ui.search.load() : null)
        .then(() => { if (alive()) { ensureDefinitions(); refresh(); } })
        .catch(error => console.error('[AlibiAdvertEmailFlow] Notes load failed:', error));
    }
    refresh();
  }

  function openMessage() {
    if (!alive() || !known()) return;
    if (!getPIQuest(QUEST)) {
      ui.notice = 'Accept this job before contacting the advertiser.';
      refresh();
      return;
    }
    const sent = Boolean(gameState.piBorrowedAlibi?.sent);
    if (!sent && !active()) {
      ui.notice = 'This enquiry is no longer active.';
      refresh();
      return;
    }
    // Cancel the generic composer, including any pending async refresh.
    const generic = ui.photoQuest?.contactMail;
    if (generic) generic.composing = false;
    Object.assign(ui, {
      app: 'mail', selectedId: sent ? SENT : DRAFT,
      listPage: 0, bodyPage: 0, notice: ''
    });
    ui.viewToken = (Number(ui.viewToken) || 0) + 1;
    refresh();
  }

  function bindNotebookAddress() {
    if (!known() || ui.caseCloudNotebook?.collapsed) return;
    // CaseCloudNotebook creates its own text objects, outside drawing.text.
    // Limit the handler to its paper container, not the advert or mail body.
    const paper = ui.root?.list?.find(container => Array.isArray(container.list) &&
      container.list.some(child => child.text === 'PRIVATE INVESTIGATIONS'));
    if (!paper?.visible) return;
    for (const label of paper.list || []) {
      if (label.text !== EMAIL || typeof label.setInteractive !== 'function') continue;
      label.setColor('#183b63');
      label.removeAllListeners('pointerdown');
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation();
        ui.options.onSfx?.('click');
        openMessage();
      });
    }
  }

  function install() {
    if (!alive() || installed) return;
    installed = true;
    ensureDefinitions();

    wrap(documents, 'getMail', original => (...args) => original(...args)
      .filter(message => message.id !== DRAFT || (known() && ui.selectedId === DRAFT))
      .map(message => message.id === DRAFT ? {
        ...message,
        from: `You → ${EMAIL}`,
        subject: 'Draft: Someone has been using my alibi',
        body: message.body.replace(
          'TO: Box 17 — Classifieds forwarding service', `TO: ${EMAIL}`
        )
      } : message));

    wrap(documents, 'renderPagedText', original => (content, x, y, width, height) => {
      if (!alive() || !isAdvert()) return original(content, x, y, width, height);
      const reserved = 70;
      original(content, x, y, width, Math.max(35, height - reserved));
      const d = ui.drawing;
      const labelY = y + Math.max(35, height - reserved) + 7;
      const label = d.text(x, labelY, EMAIL, 16, '#183b63', width);
      label.setName('Save Box 17 email to case notes');
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation();
        ui.options.onSfx?.('click');
        collectAddress();
      });
      d.text(x, labelY + label.height + 5,
        known() ? 'Saved in CASE NOTES — click the address there to write.' : 'Click to save this email to CASE NOTES.',
        12, '#5b6558', width);
    });

    wrap(ui.drawing, 'button', original => (x, y, label, ...args) => {
      if (alive() && label === 'REPLY TO AD' && isAdvert()) return null;
      return original(x, y, label, ...args);
    });

    wrap(ui.search, 'selectKeyword', original => (id, ...args) => {
      if (alive() && id === KEYWORD && known() && ui.search.definition?.id === ALIBI_SEARCH_ID) {
        openMessage();
        return;
      }
      return original(id, ...args);
    });

    wrap(ui.search, 'load', original => async (...args) => {
      const result = await original(...args);
      if (alive()) ensureDefinitions();
      return result;
    });

    wrap(ui.monitor, 'render', original => (...args) => {
      if (alive()) ensureDefinitions();
      const result = original(...args);
      if (alive() && ui.isOpen && !ui.suspended && !ui.booting) bindNotebookAddress();
      return result;
    });
  }

  function destroy() {
    if (dead) return;
    dead = true;
    ui.scene.events.off('shutdown', destroy);
    ui.scene.events.off('destroy', destroy);
    for (const restore of restorers.reverse()) restore();
    if (ui[INSTALLATION] === api) delete ui[INSTALLATION];
  }

  const api = { destroy };
  ui[INSTALLATION] = api;
  ui.scene.events.once('shutdown', destroy);
  ui.scene.events.once('destroy', destroy);
  // PhotoPIQuest and the shared notebook are constructed after documents.
  queueMicrotask(install);
  return api;
}
