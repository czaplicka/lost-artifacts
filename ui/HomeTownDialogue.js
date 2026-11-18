import { LocationDialoguePanel } from './LocationDialoguePanel.js';

// Compatibility adapter: all existing Home Town scenes retain show/close/destroy.
export class HomeTownDialogue {
  constructor(scene, onClose = () => {}) {
    this.scene = scene; this.onClose = onClose;
    this.root = null; this.panel = null; this.data = null;
    this.seen = new Set(); this.destroyed = false; this.choosing = false;
    this.dispose = () => this.destroy();
    scene.events.once('shutdown', this.dispose);
    scene.events.once('destroy', this.dispose);
  }
  get typing() { return Boolean(this.panel?.isTyping); }
  get textPage() { return this.panel?.textPage || 0; }
  get menuPage() { return this.panel?.choicePage || 0; }
  get body() { return this.panel?.text || null; }
  get footer() { return this.panel?.footer || null; }
  get pages() { return this.panel?.textPages.map(page => page.text) || []; }
  get pageText() { return this.panel?.pageText || ''; }
  stop() { this.panel?.stopTypewriter(); }
  clear() { this.panel?.destroy(); this.panel = null; this.root = null; }
  show(data) {
    if (this.destroyed) return null;
    this.clear();
    this.data = { title: '', text: '', choices: [], ...data };
    this.panel = new LocationDialoguePanel(this.scene, {
      depth: 5000, modal: true, keyboard: true, onLeave: () => this.close()
    });
    this.root = this.panel.root;
    const portrait = typeof this.data.portrait === 'string'
      ? { kind: 'texture', key: this.data.portrait } : this.data.portrait || null;
    this.panel.setSpeaker({ name: this.data.title, portrait });
    this.panel.setText(this.data.text);
    this.updateTopics();
    return this.root;
  }
  updateTopics() {
    this.panel?.setTopics(this.data.choices.map(([label, action]) => {
      const id = `${this.data.title}|${label}`;
      return { id, label, state: this.seen.has(id) ? 'used' : 'normal', onSelect: () => {
        if (this.choosing || this.destroyed || !this.panel?.isOpen) return;
        this.seen.add(id); this.choosing = true;
        try { action(); } finally { this.choosing = false; }
        if (this.panel?.isOpen) this.updateTopics();
      } };
    }), { preservePage: true });
  }
  draw() { this.panel?.relayout(); }
  type() { this.panel?.renderPage(); }
  advance() { this.panel?.advance(); }
  close(notify = true) { this.clear(); this.data = null; if (notify) this.onClose(); }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.close(false);
    this.scene.events.off('shutdown', this.dispose);
    this.scene.events.off('destroy', this.dispose);
  }
}
