import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { installCaseNotebook } from '../CaseCloudNotebook.js';
import { installDeadMailMailbox } from './DeadMailMailboxIntegration.js';
import { PIMailDelivery, isIncomingMessage } from './PIMailDelivery.js';

const KEY = 'piComputerMailNotifications';

export function orderedNotebookKeywords(definition, known) {
  const map = new Map((definition?.keywords || []).map(keyword => [keyword.id, keyword]));
  return [...new Set(known || [])].map(id => map.get(id)).filter(Boolean);
}

export function incomingMail(items) {
  return (Array.isArray(items) ? items : []).filter(isIncomingMessage);
}

export class ComputerMailNotifications {
  constructor(ui) {
    this.ui = ui;
    this.dead = false;
    this.last = -Infinity;
    this.dot = null;
    this.restorers = [];

    this.ownsDeadMailMailbox = !ui.deadMailMailbox;
    this.deadMailMailbox = installDeadMailMailbox(ui);
    this.delivery = new PIMailDelivery(ui);

    const documents = ui.documents;
    const originalDocumentsRender = documents.render;
    const renderDocuments = (...args) => {
      const result = originalDocumentsRender.apply(documents, args);
      if (ui.app === 'mail' && !ui.photoQuest?.contactMail?.composing && ui.selectedId) {
        this.markRead(ui.selectedId);
      }
      return result;
    };
    documents.render = renderDocuments;
    this.restorers.push(() => {
      if (documents.render === renderDocuments) documents.render = originalDocumentsRender;
    });

    const originalDesktopRender = ui.desktop.render;
    const renderDesktop = (...args) => {
      const result = originalDesktopRender.apply(ui.desktop, args);
      if (this.unread().length && ui.layout) {
        const { x, y } = ui.layout;
        ui.drawing.add(ui.scene.add.circle(x + 102, y + 28, 6, 0xf34c3f));
      }
      return result;
    };
    ui.desktop.render = renderDesktop;
    this.restorers.push(() => {
      if (ui.desktop.render === renderDesktop) ui.desktop.render = originalDesktopRender;
    });

    this.onStep = () => this.step();
    this.onPointer = () => this.announce();
    ui.scene.game.events.on('poststep', this.onStep);
    ui.scene.input.on('pointerdown', this.onPointer);
  }

  state() {
    return gameState[KEY] || { known: [], read: [], announced: [] };
  }

  save(next) {
    gameState[KEY] = next;
    requestAutosave();
  }

  messages() {
    return incomingMail(this.ui.documents.getMail());
  }

  unread() {
    const read = new Set(this.state().read || []);
    return this.messages().filter(message => !read.has(message.id));
  }

  markRead(id) {
    if (!this.messages().some(message => message.id === id)) return;
    const state = this.state();
    if ((state.read || []).includes(id)) return;
    this.save({ ...state, read: [...(state.read || []), id] });
  }

  step() {
    if (this.dead || this.ui.destroyed) return;
    const now = Date.now();
    if (now - this.last < 200) return;
    this.last = now;
    const ids = this.messages().map(message => message.id);
    const state = this.state();
    if (ids.some(id => !(state.known || []).includes(id))) {
      this.save({
        ...state,
        known: [...new Set([...(state.known || []), ...ids])]
      });
      const ui = this.ui;
      if (ui.isOpen && !ui.suspended && !ui.booting) ui.render();
    }
    this.announce();
  }

  updateOfficeDot() {
    this.dot?.destroy();
    this.dot = null;
  }

  announce() {
    if (this.dead || this.ui.destroyed) return;
    const ui = this.ui;
    const messages = this.messages();
    const state = this.state();
    const pending = messages.filter(message => !(state.announced || []).includes(message.id));
    if (!pending.length) return;
    const sound = ui.scene.sound;
    if (!sound || sound.mute || sound.volume === 0 || sound.locked) return;
    const context = sound.context;
    if (!context || context.state !== 'running') return;

    try {
      const now = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      gain.connect(sound.masterVolumeNode || context.destination);
      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(now + index * 0.16);
        oscillator.stop(now + index * 0.16 + 0.22);
        oscillator.onended = () => oscillator.disconnect();
      });
      setTimeout(() => {
        try { gain.disconnect(); } catch (_) {}
      }, 850);
      const latest = this.state();
      this.save({
        ...latest,
        announced: [...new Set([
          ...(latest.announced || []),
          ...pending.map(message => message.id)
        ])]
      });
    } catch (error) {
      console.warn('[ComputerMailNotifications] Notification sound unavailable', error);
    }
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.ui.scene.game.events.off('poststep', this.onStep);
    this.ui.scene.input.off('pointerdown', this.onPointer);
    this.updateOfficeDot();
    if (this.ownsDeadMailMailbox) this.deadMailMailbox?.destroy();
    this.deadMailMailbox = null;
    for (const restore of this.restorers.reverse()) restore();
    this.restorers = [];
    this.delivery.destroy();
  }
}

export function installComputerNotebook(ui) {
  return installCaseNotebook(ui, 'pi');
}
