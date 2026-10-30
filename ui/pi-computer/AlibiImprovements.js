import './AlibiSearchExpansion.js';
import { gameState } from '../../GameData.js';
import { discoverSearchKeywords } from './ComputerSearch.js';
import { ALIBI_CONTACTS, contactFor, saveAlibiContact } from './AlibiContactBook.js';
import { nextQuestHint } from './QuestHintSystem.js';
import { renderSocialPage } from './SocialProfileTemplate.js';

const QUEST = 'pi_stolen_alibi';
const INSTALLATION = Symbol.for('lostArtifacts.alibiImprovements');

export function installAlibiImprovements(ui, documents) {
    if (ui[INSTALLATION]) return ui[INSTALLATION];
    let dead = false;
    let hint = null;
    let pendingContact = null;
    let queued = false;
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
    const openContact = (contact, kind) => {
        if (!alive()) return;
        pendingContact = { contact, kind, app: ui.app };
        hint = null;
        refresh();
    };
    const savePending = () => {
        if (!pendingContact || !alive()) return false;
        const { contact, kind } = pendingContact;
        if (!saveAlibiContact(contact, kind)) {
            ui.notice = 'This contact could not be saved.';
            refresh();
            return false;
        }
        discoverSearchKeywords('borrowed_alibi', [
            kind === 'email' ? contact.keyword.replace('_phone', '_email') : contact.keyword
        ]);
        ui.notice = `Saved ${contact.name}: ${kind === 'email' ? contact.email : contact.number}`;
        pendingContact = null;
        refresh();
        return true;
    };

    wrap(ui.drawing, 'text', original => (x, y, value, ...args) => {
        const object = original(x, y, value, ...args);
        if (!alive() || !gameState.piQuests?.quests?.[QUEST]) return object;
        const raw = String(value).trim();
        const contact = contactFor(raw) || ALIBI_CONTACTS.find(c => raw === `${c.number} — ${c.name}`);
        if (!contact) return object;
        const kind = raw === contact.email ? 'email' : 'phone';
        object.setColor('#ffe56c');
        const background = ui.drawing.rectangle(
            object.x - 2, object.y, object.width + 4,
            Math.max(23, object.height), 0x344841
        );
        ui.content?.moveBelow(background, object);
        object.setName(`Add ${contact.name}’s ${kind === 'email' ? 'email' : 'number'}`);
        object.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => openContact(contact, kind));
        return object;
    });

    wrap(documents, 'getMail', original => (...args) => original(...args).map(message => {
        if (dead || !message.id?.startsWith('alibi_')) return message;
        const state = gameState.piBorrowedAlibi || {};
        const advert = documents.getClassifieds().find(a => a.missionId === QUEST);
        const originalAdvert = advert?.description || 'Someone has been using my alibi. Please reply through Box 17.';
        if (message.id === 'alibi_box17_sent') return {
            ...message, threadId: QUEST,
            body: message.body + '\n\n----- ORIGINAL ADVERTISEMENT / BOX 17 -----\n' + originalAdvert
        };
        if (message.id === 'alibi_arthur_reply') return {
            ...message, threadId: QUEST, inReplyTo: 'alibi_box17_sent',
            body: message.body + '\n\n----- YOUR PREVIOUS REPLY -----\n' +
                (state.sentBody || 'Reply sent through Box 17.') +
                '\n\n----- ORIGINAL ADVERTISEMENT / BOX 17 -----\n' + originalAdvert
        };
        return message;
    }));

    function installSearch() {
        const search = ui.search;
        if (!alive() || !search || installedSearches.has(search)) return;
        if (wrap(search, 'render', original => (...args) => {
            if (!alive()) return original(...args);
            const page = search.view === 'page'
                ? search.definition?.pages.find(p => p.id === search.pageId)
                : null;
            if (page?.socialProfile) return renderSocialPage(ui, search, page);
            return original(...args);
        })) installedSearches.add(search);
    }

    function panel() {
        const b = ui.window;
        if (!b) return null;
        const d = ui.drawing;
        const blocker = d.rectangle(b.x + 9, b.y + 48, b.w - 18, b.h - 95, 0x171e19, .88);
        blocker.setInteractive();
        const width = Math.max(120, Math.min(680, b.w - 48));
        const height = Math.max(120, Math.min(340, b.h - 120));
        const x = b.x + (b.w - width) / 2;
        const y = b.y + 55 + Math.max(0, (b.h - 110 - height) / 2);
        d.rectangle(x, y, width, height, 0xeee1b7).setInteractive();
        return { d, x, y, width, height };
    }

    function renderOverlay() {
        if (!alive() || !ui.isOpen || ui.suspended || ui.booting || !ui.window) return;
        if (hint && hint.app !== ui.app) hint = null;
        if (pendingContact && pendingContact.app !== ui.app) pendingContact = null;
        if (pendingContact) {
            const box = panel();
            if (!box) return;
            const { d, x, y, width, height } = box;
            const { contact, kind } = pendingContact;
            d.text(x + 22, y + 18, 'SAVE CONTACT', 21, '#344b3a', width - 44);
            d.text(x + 22, y + 66, contact.name, 20, '#344b3a', width - 44);
            d.text(x + 22, y + 108,
                `${kind === 'email' ? 'Email' : 'Local telephone'}: ${kind === 'email' ? contact.email : contact.number}`,
                17, '#344b3a', width - 44);
            d.text(x + 22, y + 155,
                kind === 'email' ? 'Save this address with its owner.' : 'Save this number with its owner in the local directory.',
                16, '#5a604d', width - 44);
            d.button(x + 22, y + height - 53, kind === 'email' ? 'ADD EMAIL' : 'ADD NUMBER', savePending);
            d.button(x + width - 140, y + height - 53, 'CANCEL', () => {
                pendingContact = null;
                refresh();
            });
            return;
        }
        if (!hint) return;
        const box = panel();
        if (!box) return;
        const { d, x, y, width, height } = box;
        d.text(x + 22, y + 18, 'THE BORROWED ALIBI — HINT', 18, '#344b3a', width - 44);
        d.text(x + 22, y + 65, `Hint ${hint.level + 1}/3\n\n${hint.text}`, 16, '#344b3a', width - 44);
        d.button(x + 22, y + height - 53, 'BACK', () => { hint = null; refresh(); });
        d.button(x + width - 180, y + height - 53, 'MORE HELP', () => {
            const next = nextQuestHint(QUEST);
            hint = next ? { ...next, app: ui.app } : null;
            refresh();
        }, hint.level < 2);
    }

    wrap(documents, 'render', original => (...args) => {
        installSearch();
        const result = original(...args);
        if (!alive() || !gameState.piQuests?.quests?.[QUEST] || !ui.window) return result;
        const b = ui.window;
        ui.drawing.button(b.x + 180, b.y + b.h - 77, 'HINT', () => {
            const next = nextQuestHint(QUEST);
            hint = next ? { ...next, app: ui.app } : null;
            pendingContact = null;
            refresh();
        });
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
        pendingContact = null;
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
        // Later computer installers are now present; dispose before the UI itself.
        wrap(ui, 'destroy', original => (...args) => {
            destroy();
            return original(...args);
        });
    });
    return api;
}
