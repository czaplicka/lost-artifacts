import { inventoryManager } from '../../managers/InventoryManager.js';
import { ensureApartmentIdentityItem, collectApartmentIdentityItem, getKnownApartmentIdentityClues } from './ApartmentIdentityEvidence.js';

const MOVABLE = new Set(['painting', 'framed_photo', 'sofa', 'lamp']);
const HINTS = {
  painting: 'The loose frame could conceal something against the wall.',
  framed_photo: 'Turn the frame over and check its backing.',
  sofa: 'Lift the cushions and check the gaps.',
  lamp: 'The base looks hollow. Check underneath it.'
};

// Used only when an object has no wrongMoveText / wrongSearchText of its own.
const WRONG_MOVE = [
  'Moving the entire thing would be a career change. Try inspecting it.',
  'You push. It does not care. Furniture has a very strong union.',
  'Nothing shifts, except your dignity. Inspect first, lift later.'
];
const WRONG_SEARCH = [
  'Nothing on the visible surface. Check underneath or behind it.',
  'You search thoroughly and find lint, regret and a stranger\'s crumb. Try moving it.',
  'Zero results. The object looks smug. Perhaps it is hiding something underneath?'
];

const ACTION_SUBS = {
  INSPECT: 'Look closer',
  SEARCH: 'Rummage inside or on top',
  MOVE: 'Shift it, lift it, peek behind',
  'USE ITEM': 'Try something from your pockets'
};

const MENU = {
  maxWidth: 560,
  margin: 24,
  pad: 16,
  gap: 6,
  rowH: 44,
  rowHSub: 52,
  rowHCompact: 38,
  inputLockMs: 160,
  depth: 30000
};

const STYLE = {
  default: { fill: 0x493c2e, hover: 0x665039, stroke: 0x8f7955, text: '#fff0d2', sub: '#c9b78f' },
  primary: { fill: 0x6b5324, hover: 0x8a6c30, stroke: 0xd4af37, text: '#ffe9a8', sub: '#e6d08f' },
  tried: { fill: 0x2f2822, hover: 0x3d342b, stroke: 0x5f5240, text: '#a89a80', sub: '#8c806a' },
  dim: { fill: 0x3a3129, hover: 0x4f4338, stroke: 0x6f6350, text: '#d9ccb2', sub: '#a89a80' }
};

export class ApartmentObject {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.state = config.state || 'default';
    this.isInteracted = false;
    this.contentsCollected = false;
    this.inspected = false;
    this.revealed = false;
    this.collectedIds = new Set();
    this.triedActions = new Set();
    this.findingIndex = 0;
    this.wrongTries = 0;
    this.container = this.background = this.label = this.icon = null;

    this.menu = null;
    this.lastMenu = null;
    this.menuReadyAt = 0;
    this.keyHandler = this.resizeHandler = this.panelHandler = null;
    this.resizeTimer = null;
    this.boundHud = null;
    this.busy = false;

    this.identityItem = ensureApartmentIdentityItem(scene, config);
    this.restoreProgress();
    if (this.identityItem && !getKnownApartmentIdentityClues().some(c => c.id === this.identityItem.id)) {
      this.collectedIds.delete(this.identityItem.id);
      this.contentsCollected = false;
    }
    this.create();
    this.shutdownHandler = () => this.closeMenu();
    scene.events.once('shutdown', this.shutdownHandler);
  }

  /* ------------------------------------------------------------------ */
  /* Progress                                                            */
  /* ------------------------------------------------------------------ */

  restoreProgress() {
    const s = this.scene.getObjectProgress?.(this.config.id);
    if (!s) return;
    this.state = s.state || this.state;
    this.isInteracted = s.isInteracted === true;
    this.contentsCollected = s.contentsCollected === true;
    this.inspected = s.inspected === true;
    this.revealed = s.revealed === true;
    this.collectedIds = new Set(s.collectedIds || []);
    this.triedActions = new Set(s.triedActions || []);
  }

  saveProgress() {
    this.scene?.onObjectStateChanged?.(this.config.id, {
      state: this.state,
      isInteracted: this.isInteracted,
      contentsCollected: this.contentsCollected,
      inspected: this.inspected,
      revealed: this.revealed,
      collectedIds: [...this.collectedIds],
      triedActions: [...this.triedActions]
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hotspot                                                             */
  /* ------------------------------------------------------------------ */

  create() {
    const { position = {}, size = {} } = this.config;
    this.container = this.scene.add.container(position.x || 0, position.y || 0).setDepth(5);
    this.background = this.scene.add
      .zone(0, 0, Math.max(10, Number(size.w) || 80), Math.max(10, Number(size.h) || 80))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.background);
    this.background.on('pointerover', () => this.onHover());
    this.background.on('pointerout', () => this.onHoverOut());
    this.background.on('pointerdown', () => this.onInteract());
  }

  isAvailable() {
    return Boolean(
      this.scene?.sys.isActive() &&
      !this.scene.isTransitioning &&
      !this.scene.leaveDialog &&
      !this.scene.debugMode &&
      !this.scene.getPlayerHudScene()?.isAnyPanelOpen()
    );
  }

  get discoveryAction() {
    return this.config.discoveryAction || (MOVABLE.has(this.config.id) ? 'move' : 'search');
  }

  getHoverDescription() { return `${this.config.label || 'Object'} — choose an action`; }
  onHover() { if (this.isAvailable()) this.scene.showDescription?.(this.getHoverDescription()); }
  onHoverOut() { if (!this.menu) this.scene?.showDescription?.(''); }
  onInteract() { if (!this.busy && this.isAvailable()) this.openActions(); }

  /* ------------------------------------------------------------------ */
  /* Game logic                                                          */
  /* ------------------------------------------------------------------ */

  getInspectionText() {
    const text = this.config.inspectText || this.config.description || 'Worth a closer look.';
    if (this.state === 'locked') return `${text}\n\nLocked. A matching item may help.`;
    const hint = this.config.actionHint || HINTS[this.config.id];
    return hint ? `${text}\n\n${hint}` : text;
  }

  getWrongActionText(action) {
    const own = action === 'move' ? this.config.wrongMoveText : this.config.wrongSearchText;
    if (own) return own;
    const pool = action === 'move' ? WRONG_MOVE : WRONG_SEARCH;
    return pool[(this.wrongTries - 1) % pool.length];
  }

  inspect() {
    this.inspected = true;
    this.saveProgress();
    // Already opened up: INSPECT should lead straight to what is waiting inside.
    if (this.revealed && !this.contentsCollected && this.getPendingItems().length) return this.showContents();
    if (this.discoveryAction === 'inspect' && this.state !== 'locked' && !this.contentsCollected) return this.reveal();
    this.openActions(this.getInspectionText());
  }

  performAction(action) {
    if (!this.scene || this.busy) return;
    if (this.contentsCollected) return this.showAlreadySearchedMessage();
    if (this.state === 'locked') return this.handleLockedObject();
    // Once the object has been opened, any verb leads to the findings (no more "career change" jokes).
    if (this.revealed) return this.showContents();
    if (action !== this.discoveryAction) {
      this.triedActions.add(action);
      this.wrongTries++;
      this.saveProgress();
      return this.openActions(this.getWrongActionText(action));
    }
    this.reveal();
  }

  reveal() {
    this.revealed = true;
    this.isInteracted = true;
    this.state = 'open';
    this.saveProgress();
    this.showContents();
  }

  getPendingItems() {
    if (this.contentsCollected) return [];
    const recorded = new Set(getKnownApartmentIdentityClues().map(c => c.id));
    return (this.config.unlocks || []).filter(item =>
      item?.id && (item.isIdentityLead
        ? !recorded.has(item.id)
        : !this.collectedIds.has(item.id) && !this.scene.hasItemAlready?.(item.id))
    );
  }

  takeItem(item) {
    if (!this.scene || this.busy || !this.revealed || this.state === 'locked') return;
    if (!this.getPendingItems().some(c => c.id === item.id)) return;
    this.busy = true;
    this.closeMenu();
    let ok = false;
    try {
      ok = (item.isIdentityLead
        ? collectApartmentIdentityItem(this.scene, item)
        : this.scene.collectApartmentItem(item, this.config)) === true;
      if (ok) {
        this.collectedIds.add(item.id);
        this.contentsCollected = this.getPendingItems().length === 0;
        this.saveProgress();
      }
    } finally {
      this.busy = false;
    }
    this.afterTake(ok, item);
  }

  // Keeps the player in the findings list instead of dropping them out of the menu after every item.
  afterTake(ok, item) {
    const scene = this.scene;
    if (!scene?.sys?.isActive() || scene.leaveDialog || scene.isTransitioning) return;
    const name = item.label || item.name || 'item';
    if (ok) {
      if (this.getPendingItems().length) this.showContents(0, `Added to inventory: ${name}.`);
      return;
    }
    if (this.getPendingItems().some(c => c.id === item.id)) {
      this.showContents(this.findingIndex, 'Could not take that. It is still here.');
    }
  }

  getUsableItems() {
    const items = new Map((this.scene.playerInventory?.getItems?.() || []).map(i => [i.id, i]));
    for (const item of inventoryManager.getAllItems()) if (!item.metadata?.apartment) items.set(item.id, item);
    return [...items.values()].filter(i => i?.id && Number(i.quantity ?? 1) > 0);
  }

  canUseItemOn(id) { return Boolean(this.config.requiresItem && this.config.requiresItem === id); }

  useItemOn(id) {
    if (!this.scene || this.state !== 'locked' || !this.canUseItemOn(id) || !this.scene.playerInventory?.hasItem(id)) return false;
    if (this.config.consumeRequiredItem !== false && !this.scene.playerInventory.removeItem(id, 1)) return false;
    this.state = 'open';
    this.isInteracted = true;
    this.saveProgress();
    this.openActions('The lock clicks open. You can examine the contents now.');
    return true;
  }

  handleLockedObject() { this.openActions('Locked. Choose USE ITEM and select the matching item.'); }
  open() { this.performAction(this.discoveryAction); }
  unlock() { this.openItemPicker(); }
  showAlreadySearchedMessage() { this.openActions(this.config.afterSearchText || 'Already searched.'); }
  updateVisuals() {}
  playConfiguredAnimation() {}
  playAnimation() {}

  /* ------------------------------------------------------------------ */
  /* Menus (content)                                                     */
  /* ------------------------------------------------------------------ */

  // Action entry format: [label, callback, options]
  // options: { primary, tried, dim, sub, half }  ("half" buttons that follow each other share one row)

  openActions(note = '') {
    const title = this.config.label || 'Object';
    const locked = this.state === 'locked';
    const actions = [];

    if (this.contentsCollected) {
      actions.push(['INSPECT', () => this.inspect(), { sub: ACTION_SUBS.INSPECT, tried: false }]);
      return this.renderMenu(title, note || this.config.afterSearchText || 'Already searched.', actions);
    }

    if (this.revealed && this.getPendingItems().length) {
      actions.push(['VIEW FINDINGS', () => this.showContents(), { primary: true, sub: 'Something is waiting for you' }]);
    }
    if (locked) actions.push(['USE ITEM', () => this.openItemPicker(), { primary: true, sub: 'The lock needs the right item' }]);

    actions.push(['INSPECT', () => this.inspect(), { sub: ACTION_SUBS.INSPECT, tried: this.inspected && !this.revealed }]);
    if (!locked) {
      actions.push(['SEARCH', () => this.performAction('search'), { sub: ACTION_SUBS.SEARCH, tried: this.triedActions.has('search') && !this.revealed }]);
      actions.push(['MOVE', () => this.performAction('move'), { sub: ACTION_SUBS.MOVE, tried: this.triedActions.has('move') && !this.revealed }]);
      actions.push(['USE ITEM', () => this.openItemPicker(), { sub: ACTION_SUBS['USE ITEM'] }]);
    }
    this.renderMenu(title, note || 'What do you want to do?', actions);
  }

  showContents(index = this.findingIndex, note = '') {
    if (!this.revealed) return this.openActions('Choose how to examine this object first.');
    const pending = this.getPendingItems();
    if (!pending.length) {
      const already = this.contentsCollected || (this.config.unlocks || []).some(Boolean);
      this.contentsCollected = true;
      this.saveProgress();
      this.renderMenu(
        this.config.label || 'Search results',
        already
          ? this.config.afterSearchText || 'Nothing else to collect.'
          : this.config.emptySearchText || this.config.onInteract?.text || 'Nothing useful. A remarkably thorough collection of nothing.',
        []
      );
      return;
    }
    this.findingIndex = Math.max(0, Math.min(Number.isInteger(index) ? index : 0, pending.length - 1));
    const item = pending[this.findingIndex];
    const actions = [['TAKE', () => this.takeItem(item), { primary: true }]];
    if (pending.length > 1) {
      if (this.findingIndex > 0) actions.push(['< PREVIOUS', () => this.showContents(this.findingIndex - 1), { half: true }]);
      if (this.findingIndex < pending.length - 1) actions.push(['NEXT >', () => this.showContents(this.findingIndex + 1), { half: true }]);
    }
    actions.push(['LEAVE HERE', () => this.closeMenu(), {}]);
    const body = `${item.label || item.name || 'Unknown item'}\n\n${item.description || item.hint || ''}`;
    this.renderMenu(
      `DISCOVERED — ${this.findingIndex + 1}/${pending.length}`,
      note ? `${note}\n\n${body}` : body,
      actions
    );
  }

  openItemPicker(page = 0) {
    const items = this.getUsableItems();
    const perPage = 4;
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    page = Math.max(0, Math.min(page, pages - 1));

    const actions = items.slice(page * perPage, (page + 1) * perPage).map(item => [
      item.label || item.name || item.id,
      () => {
        if (!this.useItemOn(item.id)) this.openActions('Nothing happens. The object is unimpressed. Nothing was used up.');
      },
      {}
    ]);
    if (page > 0) actions.push(['< PREVIOUS', () => this.openItemPicker(page - 1), { half: true }]);
    if (page < pages - 1) actions.push(['NEXT >', () => this.openItemPicker(page + 1), { half: true }]);
    actions.push(['BACK', () => this.openActions(), { dim: true }]);

    this.renderMenu(
      'USE ITEM',
      items.length ? `Choose an item. Page ${page + 1}/${pages}` : 'Nothing available to use here. Your pockets contain only ambition.',
      actions
    );
  }

  /* ------------------------------------------------------------------ */
  /* Menu (rendering)                                                    */
  /* ------------------------------------------------------------------ */

  renderMenu(title, body, actions) {
    const scene = this.scene;
    if (!scene?.sys?.isActive()) return;
    this.teardownMenu();
    if (scene.leaveDialog || scene.isTransitioning) { this.lastMenu = null; return; }
    this.lastMenu = { title, body, actions };

    const hud = scene.getPlayerHudScene?.();
    const host = hud?.sys?.isActive() && hud.isHudReady ? hud : scene;
    hud?.closeAllUIPanels?.();
    if (host === hud) { hud.scene.setVisible(true); hud.scene.bringToTop(); }

    const { width, height } = host.scale;
    const w = Math.max(160, Math.min(MENU.maxWidth, width - MENU.margin));
    const maxH = Math.max(160, height - MENU.margin);
    const { pad, gap } = MENU;
    const innerW = w - pad * 2;

    const buttons = [...actions, ['CLOSE', () => this.closeMenu(), { dim: true }]];
    const rows = [];
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i][2]?.half && buttons[i + 1]?.[2]?.half) { rows.push([i, i + 1]); i++; }
      else rows.push([i]);
    }

    const titleText = host.add.text(0, 0, title, {
      fontFamily: 'SpecialElite', fontSize: '22px', color: '#ffd788', align: 'center', wordWrap: { width: innerW }
    }).setOrigin(0.5, 0);
    let titleSize = 22;
    while (titleText.height > 56 && titleSize > 14) titleText.setFontSize(--titleSize);

    const bodyText = host.add.text(0, 0, body, {
      fontFamily: 'SpecialElite', fontSize: '18px', color: '#eee1c9', align: 'center', wordWrap: { width: innerW }
    }).setOrigin(0.5, 0);

    let compact = false;
    let rowH = buttons.some(b => b[2]?.sub) ? MENU.rowHSub : MENU.rowH;
    const chrome = pad * 2 + titleText.height + 10 + 12;
    const buttonsH = () => rows.length * rowH + (rows.length - 1) * gap;
    let space = maxH - chrome - buttonsH();
    if (space < 70) { compact = true; rowH = MENU.rowHCompact; space = maxH - chrome - buttonsH(); }
    let bodySize = 18;
    while (bodyText.height > space && bodySize > 10) bodyText.setFontSize(--bodySize);

    const bodyH = Math.max(16, Math.min(bodyText.height, space));
    const panelH = chrome + bodyH + buttonsH();
    const top = -panelH / 2;

    const root = host.add.container(width / 2, height / 2).setDepth(MENU.depth).setScrollFactor(0);
    this.menu = root;
    scene.leaveDialog = root;

    const backdrop = host.add.rectangle(0, 0, width, height, 0x000000, 0.68).setInteractive();
    backdrop.on('pointerdown', () => this.closeMenu());
    const panel = host.add.rectangle(0, 0, w, panelH, 0x241e19).setStrokeStyle(2, 0xbca06a).setInteractive();
    root.add([backdrop, panel]);

    titleText.setPosition(0, top + pad);
    bodyText.setPosition(0, top + pad + titleText.height + 10);
    root.add([titleText, bodyText]);

    const showKeys = !host.sys.game.device.input.touch;
    const buttonsTop = top + pad + titleText.height + 10 + bodyH + 12;

    const makeButton = (index, x, y, bw) => {
      const [label, callback, opts = {}] = buttons[index];
      const st = opts.tried ? STYLE.tried : opts.primary ? STYLE.primary : opts.dim ? STYLE.dim : STYLE.default;
      const hasSub = Boolean(opts.sub) && !compact;
      const caption = `${showKeys && index < 9 ? `${index + 1}. ` : ''}${label}${opts.tried ? ' (tried)' : ''}`;

      const bg = host.add.rectangle(x, y, bw, rowH, st.fill).setStrokeStyle(1, st.stroke).setInteractive({ useHandCursor: true });
      const text = host.add.text(x, hasSub ? y - 9 : y, caption, {
        fontFamily: 'SpecialElite', fontSize: `${hasSub ? 17 : Math.min(18, rowH - 14)}px`, color: st.text
      }).setOrigin(0.5);
      if (text.width > bw - 16) text.setScale((bw - 16) / text.width);
      const parts = [bg, text];
      if (hasSub) {
        const sub = host.add.text(x, y + 12, opts.sub, { fontFamily: 'SpecialElite', fontSize: '12px', color: st.sub }).setOrigin(0.5);
        if (sub.width > bw - 16) sub.setScale((bw - 16) / sub.width);
        parts.push(sub);
      }
      bg.on('pointerover', () => bg.setFillStyle(st.hover));
      bg.on('pointerout', () => bg.setFillStyle(st.fill));
      bg.on('pointerdown', () => this.pressButton(root, callback));
      root.add(parts);
    };

    rows.forEach((row, r) => {
      const y = buttonsTop + r * (rowH + gap) + rowH / 2;
      if (row.length === 1) makeButton(row[0], 0, y, innerW);
      else {
        const bw = (innerW - gap) / 2;
        makeButton(row[0], -(bw / 2 + gap / 2), y, bw);
        makeButton(row[1], bw / 2 + gap / 2, y, bw);
      }
    });

    this.menuReadyAt = performance.now() + MENU.inputLockMs;

    this.keyHandler = event => {
      if (this.menu !== root) return;
      if (event.key === 'Escape') return this.closeMenu();
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= buttons.length && n <= 9) this.pressButton(root, buttons[n - 1][1]);
    };
    this.resizeHandler = () => this.scheduleRerender();
    this.panelHandler = state => { if (state?.anyPanelOpen) this.closeMenu(); };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    scene.scale.on('resize', this.resizeHandler);
    hud?.events.on('panelStateChanged', this.panelHandler);
    this.boundHud = hud;
  }

  // Guards against double taps hitting the freshly rendered menu under the same finger.
  pressButton(root, callback) {
    if (this.menu !== root || !this.scene?.sys?.isActive()) return;
    if (performance.now() < this.menuReadyAt) return;
    callback();
  }

  // Window/orientation changes re-layout the open menu instead of throwing the player out of it.
  scheduleRerender() {
    this.resizeTimer?.remove(false);
    const time = this.scene?.time;
    if (!time) return;
    this.resizeTimer = time.delayedCall(120, () => {
      this.resizeTimer = null;
      const saved = this.lastMenu;
      if (this.menu && saved && this.scene?.sys?.isActive()) this.renderMenu(saved.title, saved.body, saved.actions);
    });
  }

  teardownMenu() {
    const scene = this.scene;
    if (this.keyHandler) scene?.input?.keyboard?.off('keydown', this.keyHandler);
    if (this.resizeHandler) scene?.scale?.off('resize', this.resizeHandler);
    if (this.panelHandler) this.boundHud?.events?.off('panelStateChanged', this.panelHandler);
    this.keyHandler = this.resizeHandler = this.panelHandler = null;
    this.boundHud = null;
    this.resizeTimer?.remove(false);
    this.resizeTimer = null;
    const root = this.menu;
    if (root && scene?.leaveDialog === root) scene.leaveDialog = null;
    root?.destroy(true);
    this.menu = null;
  }

  closeMenu() {
    this.teardownMenu();
    this.lastMenu = null;
  }

  destroy() {
    this.closeMenu();
    this.scene?.events.off('shutdown', this.shutdownHandler);
    this.background?.removeAllListeners();
    this.container?.destroy(true);
    this.scene = null;
    this.config = null;
    this.container = this.background = this.label = this.icon = null;
  }
}

export default ApartmentObject;