import './AlibiSearchExpansion.js';
import { gameState } from '../../GameData.js';
import { discoverSearchKeywords } from './ComputerSearch.js';
import { ALIBI_CONTACTS, contactFor, saveAlibiContact } from './AlibiContactBook.js';
import { getQuestHintOffer, purchaseQuestHint } from './QuestHintPurchase.js';
import { renderSocialPage } from './SocialProfileTemplate.js';

const QUEST = 'pi_stolen_alibi';
const INSTALLATION = Symbol.for('lostArtifacts.alibiImprovements');

export function installAlibiImprovements(ui, documents) {
  if (ui[INSTALLATION]) return ui[INSTALLATION];

  let dead = false;
  let hint = null;
  let queued = false;
  let buyingHint = false;
  const restorers = [];
  const installedSearches = new WeakSet();

  const wrap = (target, method, factory) => {
    if (typeof target?.[method] !== 'function') return false;
    const original = target[method];
    const wrapped = factory(original.bind(target));
    target[method] = wrapped;
    restorers.push(() => {
      if (target[method] === wrapped) target[method] = original;
    });
    return true;
  };

  const alive = () => !dead && !ui.destroyed;

  const refresh = () => {
    if (queued || !alive()) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (alive() && ui.isOpen && !ui.suspended && !ui.booting) ui.render();
    });
  };

  const addContact = (contact, kind) => {
    if (!alive()) return false;
    if (!saveAlibiContact(contact, kind)) {
      ui.notice = 'This contact could not be saved.';
      refresh();
      return false;
    }
    discoverSearchKeywords('borrowed_alibi', [
      kind === 'email'
        ? contact.keyword.replace('_phone', '_email')
        : contact.keyword
    ]);
    hint = null;
    ui.notice = '';
    refresh();
    return true;
  };

  const openHints = () => {
    if (!alive() || buyingHint) return;
    const offer = getQuestHintOffer(QUEST);
    if (!offer) {
      ui.notice = 'No assistance is available for this case.';
      hint = null;
      refresh();
      return;
    }
    hint = { app: ui.app, mode: 'choose', offer, message: '' };
    refresh();
  };

  const buyHint = method => {
    if (!alive() || buyingHint || hint?.mode !== 'choose') return;
    buyingHint = true;
    try {
      const result = purchaseQuestHint(
        QUEST, method, hint.offer, ui.scene.sys.settings.key
      );
      if (!result.success) {
        hint.message = result.message;
        if (result.stale) hint.offer = getQuestHintOffer(QUEST);
        refresh();
        return;
      }
      hint = {
        app: ui.app,
        mode: 'read',
        receipt: result.receipt,
        message: result.saved ? '' : 'Autosave failed. Progress may be lost on reload.'
      };
      refresh();
    } catch (error) {
      console.error('[AlibiImprovements] Hint purchase failed:', error);
      if (hint) {
        hint.message = 'Assistance could not be displayed. ' +
          'Close and reopen hints to check your purchase.';
      }
      refresh();
    } finally {
      buyingHint = false;
    }
  };

  wrap(ui.drawing, 'text', original => (x, y, value, ...args) => {
    const object = original(x, y, value, ...args);
    if (!alive() || !gameState.piQuests?.quests?.[QUEST]) return object;
    const raw = String(value).trim();
    const contact = contactFor(raw) || ALIBI_CONTACTS.find(
      item => raw === `${item.number} — ${item.name}`
    );
    if (!contact) return object;
    const kind = raw === contact.email ? 'email' : 'phone';
    object.setColor('#ffe56c');
    const background = ui.drawing.rectangle(
      object.x - 2, object.y, object.width + 4,
      Math.max(23, object.height), 0x344841
    );
    ui.content?.moveBelow(background, object);
    object.setName(
      `Add ${contact.name}’s ${kind === 'email' ? 'email' : 'number'}`
    );
    object.setInteractive({ useHandCursor: true }).on(
      'pointerdown', () => addContact(contact, kind)
    );
    return object;
  });

  wrap(documents, 'getMail', original => (...args) => (
    original(...args).map(message => {
      if (dead || !message.id?.startsWith('alibi_')) return message;
      const state = gameState.piBorrowedAlibi || {};
      const advert = documents.getClassifieds().find(
        item => item.missionId === QUEST
      );
      const originalAdvert = advert?.description ||
        'Someone has been using my alibi. Please reply through Box 17.';
      if (message.id === 'alibi_box17_sent') {
        return {
          ...message,
          threadId: QUEST,
          body: message.body +
            '\n\n----- ORIGINAL ADVERTISEMENT / BOX 17 -----\n' + originalAdvert
        };
      }
      if (message.id === 'alibi_arthur_reply') {
        return {
          ...message,
          threadId: QUEST,
          inReplyTo: 'alibi_box17_sent',
          body: message.body + '\n\n----- YOUR PREVIOUS REPLY -----\n' +
            (state.sentBody || 'Reply sent through Box 17.') +
            '\n\n----- ORIGINAL ADVERTISEMENT / BOX 17 -----\n' + originalAdvert
        };
      }
      return message;
    })
  ));

  function installSearch() {
    const search = ui.search;
    if (!alive() || !search || installedSearches.has(search)) return;
    const installed = wrap(search, 'render', original => (...args) => {
      if (!alive()) return original(...args);
      const page = search.view === 'page'
        ? search.definition?.pages.find(item => item.id === search.pageId)
        : null;
      return page?.socialProfile
        ? renderSocialPage(ui, search, page)
        : original(...args);
    });
    if (installed) installedSearches.add(search);
  }

  function panel() {
    const bounds = ui.window;
    if (!bounds) return null;
    const drawing = ui.drawing;
    drawing.rectangle(
      bounds.x + 9, bounds.y + 48,
      bounds.w - 18, bounds.h - 95, 0x171e19, 0.92
    ).setInteractive();
    const width = Math.max(120, Math.min(730, bounds.w - 48));
    const height = Math.max(120, Math.min(470, bounds.h - 110));
    const x = bounds.x + (bounds.w - width) / 2;
    const y = bounds.y + 48 + Math.max(0, (bounds.h - 95 - height) / 2);
    drawing.rectangle(x, y, width, height, 0xeee1b7).setInteractive();
    return { d: drawing, x, y, width, height };
  }

  function fitBody(drawing, x, y, value, width, maxHeight, size = 17) {
    const label = drawing.text(x, y, value, size, '#344b3a', width);
    while (label.height > maxHeight && size > 12) {
      size -= 1;
      label.setFontSize(size);
    }
    return label;
  }

  function renderOverlay() {
    if (!alive() || !ui.isOpen || ui.suspended || ui.booting || !ui.window) return;
    if (hint && hint.app !== ui.app) hint = null;
    if (!hint) return;
    const box = panel();
    if (!box) return;
    const { d, x, y, width, height } = box;
    d.text(x + 22, y + 18, 'CASE ASSISTANCE', 21, '#344b3a', width - 44);

    if (hint.mode === 'read') {
      const receipt = hint.receipt;
      fitBody(d, x + 22, y + 65, [
        `Hint ${receipt.level + 1}/3`, '', receipt.text, '', hint.message || ''
      ].join('\n'), width - 44, height - 140);
      d.button(x + 22, y + height - 53, 'BACK', () => {
        hint = null;
        refresh();
      });
      const offer = getQuestHintOffer(QUEST);
      d.button(x + width - 180, y + height - 53, 'MORE HELP', openHints, Boolean(offer?.next));
      return;
    }

    const offer = hint.offer;
    if (!offer) {
      fitBody(d, x + 22, y + 65,
        hint.message || 'No assistance is available.', width - 44, height - 140);
    } else if (offer.complete) {
      fitBody(d, x + 22, y + 65,
        'All hints for this step have been obtained.\n\n' +
        'You can review your latest hint for free.', width - 44, height - 150);
    } else {
      d.text(x + 22, y + 61, `Next hint: ${offer.level + 1}/3`, 17, '#344b3a', width - 44);
      d.button(x + 22, y + 101, `FREE HINT (${offer.freeCount})`,
        () => buyHint('free_hint'), offer.freeCount > 0 && !buyingHint);
      d.text(x + 22, y + 135, 'Uses one free hint. Integrity: no change.', 14, '#5a604d', width - 44);
      d.button(x + 22, y + 177, 'CUT CORNERS',
        () => buyHint('cut_corners'), !buyingHint);
      d.text(x + 22, y + 211, '5 energy + 10 min. Integrity: -1.', 14, '#8c493a', width - 44);
      d.button(x + 22, y + 253, 'DOCUMENTED HELP',
        () => buyHint('squad_help'), !buyingHint);
      d.text(x + 22, y + 287, '10 energy + 30 min. Integrity: +1.', 14, '#355c43', width - 44);
    }

    if (hint.message && offer) {
      fitBody(d, x + 22, y + height - 112, hint.message, width - 44, 48, 14);
    }
    d.button(x + 22, y + height - 53, 'CANCEL', () => {
      hint = null;
      refresh();
    });
    if (offer?.latest) {
      d.button(x + width - 215, y + height - 53, 'REVIEW — FREE', () => {
        hint = { app: ui.app, mode: 'read', receipt: offer.latest, message: '' };
        refresh();
      });
    }
  }

  wrap(documents, 'render', original => (...args) => {
    installSearch();
    const result = original(...args);
    const quest = gameState.piQuests?.quests?.[QUEST];
    if (!alive() || !quest || quest.status === 'completed' || !ui.window) return result;
    const bounds = ui.window;
    ui.drawing.button(bounds.x + 180, bounds.y + bounds.h - 77, 'HINT', openHints);
    return result;
  });

  wrap(ui, 'render', original => (...args) => {
    installSearch();
    const result = original(...args);
    renderOverlay();
    return result;
  });

  const destroy = () => {
    if (dead) return;
    dead = true;
    hint = null;
    ui.scene.events.off('shutdown', destroy);
    for (const restore of restorers.reverse()) restore();
    if (ui[INSTALLATION] === api) delete ui[INSTALLATION];
  };

  const api = { destroy };
  ui[INSTALLATION] = api;
  ui.scene.events.once('shutdown', destroy);

  queueMicrotask(() => {
    if (!alive()) return;
    installSearch();
    wrap(ui, 'destroy', original => (...args) => {
      destroy();
      return original(...args);
    });
  });

  return api;
}