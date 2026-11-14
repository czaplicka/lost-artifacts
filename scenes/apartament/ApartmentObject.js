import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import {
  inventoryManager
} from '../../managers/InventoryManager.js';

import {
  ensureApartmentIdentityItem,
  collectApartmentIdentityItem,
  getKnownApartmentIdentityClues
} from './ApartmentIdentityEvidence.js';

const MOVABLE = new Set([
  'painting',
  'framed_photo',
  'sofa',
  'lamp'
]);

const HINTS = {
  painting:
    __dialogueText("scenes/apartament/ApartmentObject.js", "t_5a4af68441c7d8b1104e"),
  framed_photo:
    __dialogueText("scenes/apartament/ApartmentObject.js", "t_7cde17de7e8a47d09491"),
  sofa:
    __dialogueText("scenes/apartament/ApartmentObject.js", "t_d6de14244aff303c4200"),
  lamp:
    __dialogueText("scenes/apartament/ApartmentObject.js", "t_cd52a89fc4690f2b01ef")
};

const WRONG_MOVE = [
  __dialogueText("scenes/apartament/ApartmentObject.js", "t_f9d7b066ec3242abe8cc"),
  __dialogueText("scenes/apartament/ApartmentObject.js", "t_64260f9bc63d921a8d3d"),
  __dialogueText("scenes/apartament/ApartmentObject.js", "t_3e73835a27deedd53c16")
];

const WRONG_SEARCH = [
  __dialogueText("scenes/apartament/ApartmentObject.js", "t_2648bde7aa3f6ee50b7a"),
  __dialogueText("scenes/apartament/ApartmentObject.js", "t_8e3315a6756a3524efc5"),
  __dialogueText("scenes/apartament/ApartmentObject.js", "t_e60fccd284f33b4ec134")
];

const ACTION_SUBS = {
  INSPECT: __dialogueText("scenes/apartament/ApartmentObject.js", "t_507f60cea7e3a182fa20"),
  SEARCH: __dialogueText("scenes/apartament/ApartmentObject.js", "t_6ba9161fcbaa6cfa6ebc"),
  MOVE: __dialogueText("scenes/apartament/ApartmentObject.js", "t_95de088b53da21e051cc"),
  'USE ITEM': __dialogueText("scenes/apartament/ApartmentObject.js", "t_db889d7bbd6b3de73dfa")
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
  default: {
    fill: 0x493c2e,
    hover: 0x665039,
    stroke: 0x8f7955,
    text: __dialogueText("scenes/apartament/ApartmentObject.js", "t_79a316f2e36850e77e99"),
    sub: '#c9b78f'
  },
  primary: {
    fill: 0x6b5324,
    hover: 0x8a6c30,
    stroke: 0xd4af37,
    text: __dialogueText("scenes/apartament/ApartmentObject.js", "t_9481007a293d1738bdd6"),
    sub: '#e6d08f'
  },
  tried: {
    fill: 0x2f2822,
    hover: 0x3d342b,
    stroke: 0x5f5240,
    text: __dialogueText("scenes/apartament/ApartmentObject.js", "t_d0a32d5590ae6a2cbdbc"),
    sub: '#8c806a'
  },
  dim: {
    fill: 0x3a3129,
    hover: 0x4f4338,
    stroke: 0x6f6350,
    text: __dialogueText("scenes/apartament/ApartmentObject.js", "t_4245999837d6079091c3"),
    sub: '#a89a80'
  }
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

    this.container = null;
    this.background = null;
    this.label = null;
    this.icon = null;

    this.menu = null;
    this.lastMenu = null;
    this.menuReadyAt = 0;

    this.keyHandler = null;
    this.resizeHandler = null;
    this.panelHandler = null;
    this.resizeTimer = null;
    this.boundHud = null;

    this.busy = false;

    this.identityItem = ensureApartmentIdentityItem(
      scene,
      config
    );

    this.restoreProgress();
    this.syncCollectedItems();
    this.create();

    this.shutdownHandler = () => this.closeMenu();
    scene.events.once('shutdown', this.shutdownHandler);
  }

  restoreProgress() {
    const saved = this.scene.getObjectProgress?.(
      this.config.id
    );

    if (!saved) return;

    this.state = saved.state || this.state;
    this.isInteracted = saved.isInteracted === true;
    this.contentsCollected =
      saved.contentsCollected === true;

    this.inspected = saved.inspected === true;
    this.revealed = saved.revealed === true;

    this.collectedIds = new Set(
      saved.collectedIds || []
    );

    this.triedActions = new Set(
      saved.triedActions || []
    );
  }

  saveProgress() {
    this.scene?.onObjectStateChanged?.(
      this.config.id,
      {
        state: this.state,
        isInteracted: this.isInteracted,
        contentsCollected: this.contentsCollected,
        inspected: this.inspected,
        revealed: this.revealed,
        collectedIds: [...this.collectedIds],
        triedActions: [...this.triedActions]
      }
    );
  }

  isItemCarried(item) {
    if (!item?.id || !this.scene) return false;

    return Boolean(
      this.scene.playerInventory?.hasItem?.(item.id)
    );
  }

  isItemCollected(item, knownIdentityIds = null) {
    if (!item?.id || !this.scene) return false;

    if (this.collectedIds.has(item.id)) {
      return true;
    }

    if (this.isItemCarried(item)) {
      return true;
    }

    if (this.scene.hasItemAlready?.(item.id)) {
      return true;
    }

    if (item.isIdentityLead) {
      const recorded = knownIdentityIds || new Set(
        getKnownApartmentIdentityClues()
          .map(clue => clue.id)
      );

      return recorded.has(item.id);
    }

    return false;
  }

  syncCollectedItems() {
    if (!this.scene || !this.config) return;

    const items = (this.config.unlocks || [])
      .filter(item => item?.id);

    const knownIdentityIds = items.some(
      item => item.isIdentityLead
    )
      ? new Set(
          getKnownApartmentIdentityClues()
            .map(clue => clue.id)
        )
      : new Set();

    let changed = false;

    for (const item of items) {
      if (
        this.isItemCollected(item, knownIdentityIds) &&
        !this.collectedIds.has(item.id)
      ) {
        this.collectedIds.add(item.id);
        changed = true;
      }
    }

    if (items.length) {
      const allCollected = items.every(
        item => this.collectedIds.has(item.id)
      );

      if (this.contentsCollected !== allCollected) {
        this.contentsCollected = allCollected;
        changed = true;
      }
    }

    if (changed) {
      this.saveProgress();
    }
  }

  create() {
    const {
      position = {},
      size = {}
    } = this.config;

    this.container = this.scene.add
      .container(
        position.x || 0,
        position.y || 0
      )
      .setDepth(5);

    this.background = this.scene.add
      .zone(
        0,
        0,
        Math.max(10, Number(size.w) || 80),
        Math.max(10, Number(size.h) || 80)
      )
      .setOrigin(0.5)
      .setInteractive({
        useHandCursor: true
      });

    this.container.add(this.background);

    this.background.on(
      'pointerover',
      () => this.onHover()
    );

    this.background.on(
      'pointerout',
      () => this.onHoverOut()
    );

    this.background.on(
      'pointerdown',
      () => this.onInteract()
    );
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
    return (
      this.config.discoveryAction ||
      (
        MOVABLE.has(this.config.id)
          ? 'move'
          : 'search'
      )
    );
  }

  getHoverDescription() {
    return (
      `${this.config.label || __dialogueText("scenes/apartament/ApartmentObject.js", "t_62a6da8735c18e2d66fe")} — ` +
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_5c2be417a4d15c2fc28c")
    );
  }

  onHover() {
    if (this.isAvailable()) {
      this.scene.showDescription?.(
        this.getHoverDescription()
      );
    }
  }

  onHoverOut() {
    if (!this.menu) {
      this.scene?.showDescription?.('');
    }
  }

  onInteract() {
    if (!this.busy && this.isAvailable()) {
      this.openActions();
    }
  }

  getInspectionText() {
    const text =
      this.config.inspectText ||
      this.config.description ||
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_8cd1a58b9d5197f17933");

    if (this.state === 'locked') {
      return (
        `${text}\n\n` +
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_d4a4763a87b531bf7c83")
      );
    }

    const hint =
      this.config.actionHint ||
      HINTS[this.config.id];

    return hint ? `${text}\n\n${hint}` : text;
  }

  getWrongActionText(action) {
    const own =
      action === 'move'
        ? this.config.wrongMoveText
        : this.config.wrongSearchText;

    if (own) return own;

    const pool =
      action === 'move'
        ? WRONG_MOVE
        : WRONG_SEARCH;

    return pool[
      (this.wrongTries - 1) % pool.length
    ];
  }

  inspect() {
    this.syncCollectedItems();

    this.inspected = true;
    this.saveProgress();

    if (
      this.revealed &&
      !this.contentsCollected &&
      this.getPendingItems().length
    ) {
      return this.showContents();
    }

    if (
      this.discoveryAction === 'inspect' &&
      this.state !== 'locked' &&
      !this.contentsCollected
    ) {
      return this.reveal();
    }

    this.openActions(this.getInspectionText());
  }

  performAction(action) {
    if (!this.scene || this.busy) return;

    this.syncCollectedItems();

    if (this.contentsCollected) {
      return this.showAlreadySearchedMessage();
    }

    if (this.state === 'locked') {
      return this.handleLockedObject();
    }

    if (this.revealed) {
      return this.showContents();
    }

    if (action !== this.discoveryAction) {
      this.triedActions.add(action);
      this.wrongTries++;

      this.saveProgress();

      return this.openActions(
        this.getWrongActionText(action)
      );
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
    if (!this.scene || !this.config) return [];

    this.syncCollectedItems();

    if (this.contentsCollected) return [];

    return (this.config.unlocks || []).filter(
      item =>
        item?.id &&
        !this.collectedIds.has(item.id)
    );
  }

  takeItem(item) {
    if (
      !item?.id ||
      !this.scene ||
      this.busy ||
      !this.revealed ||
      this.state === 'locked'
    ) {
      return;
    }

    const pending = this.getPendingItems();

    if (!pending.some(entry => entry.id === item.id)) {
      // The open TAKE menu may predate the inventory update.
      this.closeMenu();

      if (pending.length) {
        this.showContents(
          0,
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_b1a9d9d2fcdd4f8785ba")
        );
      } else {
        this.scene.showMessage?.(
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_4a36525ac1253b02284c"),
          1800,
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_8050ca049b2e4bda19f0")
        );
      }

      return;
    }

    this.busy = true;
    this.closeMenu();

    let ok = false;

    try {
      ok = (
        item.isIdentityLead
          ? collectApartmentIdentityItem(
              this.scene,
              item
            )
          : this.scene.collectApartmentItem(
              item,
              this.config
            )
      ) === true;

      // Inventory possession also confirms a completed pickup.
      if (!ok && this.isItemCarried(item)) {
        ok = true;
      }

      if (ok) {
        this.collectedIds.add(item.id);
        this.syncCollectedItems();

        this.contentsCollected =
          this.getPendingItems().length === 0;

        this.saveProgress();
      }
    } catch (error) {
      console.error(
        '[ApartmentObject] Item collection failed:',
        item.id,
        error
      );

      // Do not offer TAKE again if adding the item succeeded
      // but a later notebook or UI operation failed.
      if (this.isItemCarried(item)) {
        ok = true;

        this.collectedIds.add(item.id);
        this.syncCollectedItems();
        this.saveProgress();

        this.scene.showMessage?.(
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_f1c63fbecd6081b5dd44") +
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_6a970da834bdd2b47c34"),
          4000,
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_0fa2e0046576e38dd099")
        );
      }
    } finally {
      this.busy = false;
    }

    this.afterTake(ok, item);
  }

  afterTake(ok, item) {
    const scene = this.scene;

    if (
      !scene?.sys?.isActive() ||
      scene.leaveDialog ||
      scene.isTransitioning
    ) {
      return;
    }

    const name =
      item.label ||
      item.name ||
      'item';

    const pending = this.getPendingItems();

    if (ok) {
      if (pending.length) {
        this.showContents(
          0,
          `${__dialogueText("scenes/apartament/ApartmentObject.js", "t_73d937cad6f734550b61")}${name}${__dialogueText("scenes/apartament/ApartmentObject.js", "t_cdb4ee2aea69cc6a8333")}`
        );
      } else {
        this.closeMenu();
      }

      return;
    }

    if (
      pending.some(entry => entry.id === item.id)
    ) {
      this.showContents(
        this.findingIndex,
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_32a6c7b27652c6b7b3c7")
      );
    }
  }

  getUsableItems() {
    const items = new Map(
      (
        this.scene.playerInventory?.getItems?.() ||
        []
      ).map(item => [item.id, item])
    );

    for (const item of inventoryManager.getAllItems()) {
      if (!item.metadata?.apartment) {
        items.set(item.id, item);
      }
    }

    return [...items.values()].filter(
      item =>
        item?.id &&
        Number(item.quantity ?? 1) > 0
    );
  }

  canUseItemOn(id) {
    return Boolean(
      this.config.requiresItem &&
      this.config.requiresItem === id
    );
  }

  useItemOn(id) {
    if (
      !this.scene ||
      this.state !== 'locked' ||
      !this.canUseItemOn(id) ||
      !this.scene.playerInventory?.hasItem(id)
    ) {
      return false;
    }

    if (
      this.config.consumeRequiredItem !== false &&
      !this.scene.playerInventory.removeItem(id, 1)
    ) {
      return false;
    }

    this.state = 'open';
    this.isInteracted = true;

    this.saveProgress();

    this.openActions(
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_3a4dcae5b9f3a542e413") +
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_4995e52403185c55a1dc")
    );

    return true;
  }

  handleLockedObject() {
    this.openActions(
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_357ebc5a3b0395f2eda5")
    );
  }

  open() {
    this.performAction(this.discoveryAction);
  }

  unlock() {
    this.openItemPicker();
  }

  showAlreadySearchedMessage() {
    this.openActions(
      this.config.afterSearchText ||
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_506b275eb68b9265629e")
    );
  }

  updateVisuals() {}
  playConfiguredAnimation() {}
  playAnimation() {}

  openActions(note = '') {
    this.syncCollectedItems();

    const title = this.config.label || __dialogueText("scenes/apartament/ApartmentObject.js", "t_62a6da8735c18e2d66fe");
    const locked = this.state === 'locked';
    const actions = [];

    if (this.contentsCollected) {
      actions.push([
        'INSPECT',
        () => this.inspect(),
        {
          sub: ACTION_SUBS.INSPECT,
          tried: false
        }
      ]);

      return this.renderMenu(
        title,
        note ||
        this.config.afterSearchText ||
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_506b275eb68b9265629e"),
        actions
      );
    }

    if (
      this.revealed &&
      this.getPendingItems().length
    ) {
      actions.push([
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_f4861adecd9430a88025"),
        () => this.showContents(),
        {
          primary: true,
          sub: __dialogueText("scenes/apartament/ApartmentObject.js", "t_e5aa4d94d7160b895cd6")
        }
      ]);
    }

    if (locked) {
      actions.push([
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_266b6fd0dd4dc28a9405"),
        () => this.openItemPicker(),
        {
          primary: true,
          sub: __dialogueText("scenes/apartament/ApartmentObject.js", "t_97b75d6d9b5c0c7f6068")
        }
      ]);
    }

    actions.push([
      'INSPECT',
      () => this.inspect(),
      {
        sub: ACTION_SUBS.INSPECT,
        tried: this.inspected && !this.revealed
      }
    ]);

    if (!locked) {
      actions.push([
        'SEARCH',
        () => this.performAction('search'),
        {
          sub: ACTION_SUBS.SEARCH,
          tried:
            this.triedActions.has('search') &&
            !this.revealed
        }
      ]);

      actions.push([
        'MOVE',
        () => this.performAction('move'),
        {
          sub: ACTION_SUBS.MOVE,
          tried:
            this.triedActions.has('move') &&
            !this.revealed
        }
      ]);

      actions.push([
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_266b6fd0dd4dc28a9405"),
        () => this.openItemPicker(),
        {
          sub: ACTION_SUBS[__dialogueText("scenes/apartament/ApartmentObject.js", "t_266b6fd0dd4dc28a9405")]
        }
      ]);
    }

    this.renderMenu(
      title,
      note || __dialogueText("scenes/apartament/ApartmentObject.js", "t_68f2a0c9acf0e43b0482"),
      actions
    );
  }

  showContents(
    index = this.findingIndex,
    note = ''
  ) {
    if (!this.revealed) {
      return this.openActions(
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_3bea672879bdeeb13a7c")
      );
    }

    const pending = this.getPendingItems();

    if (!pending.length) {
      const already =
        this.contentsCollected ||
        (this.config.unlocks || []).some(Boolean);

      this.contentsCollected = true;
      this.saveProgress();

      this.renderMenu(
        this.config.label || __dialogueText("scenes/apartament/ApartmentObject.js", "t_e978b00de465a271a13b"),
        already
          ? (
              this.config.afterSearchText ||
              __dialogueText("scenes/apartament/ApartmentObject.js", "t_e3122299ee32b3c8c6cb")
            )
          : (
              this.config.emptySearchText ||
              this.config.onInteract?.text ||
              __dialogueText("scenes/apartament/ApartmentObject.js", "t_7fa09db20449762a2ba8")
            ),
        []
      );

      return;
    }

    this.findingIndex = Math.max(
      0,
      Math.min(
        Number.isInteger(index) ? index : 0,
        pending.length - 1
      )
    );

    const item = pending[this.findingIndex];

    const actions = [
      [
        'TAKE',
        () => this.takeItem(item),
        { primary: true }
      ]
    ];

    if (pending.length > 1) {
      if (this.findingIndex > 0) {
        actions.push([
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_2b8c035d931a36d1e669"),
          () => this.showContents(
            this.findingIndex - 1
          ),
          { half: true }
        ]);
      }

      if (
        this.findingIndex <
        pending.length - 1
      ) {
        actions.push([
          __dialogueText("scenes/apartament/ApartmentObject.js", "t_58b85f2ea88bf1a9ba16"),
          () => this.showContents(
            this.findingIndex + 1
          ),
          { half: true }
        ]);
      }
    }

    actions.push([
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_f319e9b64fae81db8e10"),
      () => this.closeMenu(),
      {}
    ]);

    const body =
      `${item.label || item.name || __dialogueText("scenes/apartament/ApartmentObject.js", "t_e6b8f377328b3d42997c")}` +
      '\n\n' +
      `${item.description || item.hint || ''}`;

    this.renderMenu(
      `${__dialogueText("scenes/apartament/ApartmentObject.js", "t_d1cfa59b872c0d745132")}${this.findingIndex + 1}${__dialogueText("scenes/apartament/ApartmentObject.js", "t_8a5edab282632443219e")}${pending.length}`,
      note ? `${note}\n\n${body}` : body,
      actions
    );
  }

  openItemPicker(page = 0) {
    const items = this.getUsableItems();
    const perPage = 4;

    const pages = Math.max(
      1,
      Math.ceil(items.length / perPage)
    );

    page = Math.max(
      0,
      Math.min(page, pages - 1)
    );

    const actions = items
      .slice(
        page * perPage,
        (page + 1) * perPage
      )
      .map(item => [
        item.label || item.name || item.id,
        () => {
          if (!this.useItemOn(item.id)) {
            this.openActions(
              __dialogueText("scenes/apartament/ApartmentObject.js", "t_93b749faf9c050993323") +
              __dialogueText("scenes/apartament/ApartmentObject.js", "t_9f1af1c627b84e06f47e") +
              __dialogueText("scenes/apartament/ApartmentObject.js", "t_a4a23a0a66306b0970ab")
            );
          }
        },
        {}
      ]);

    if (page > 0) {
      actions.push([
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_2b8c035d931a36d1e669"),
        () => this.openItemPicker(page - 1),
        { half: true }
      ]);
    }

    if (page < pages - 1) {
      actions.push([
        __dialogueText("scenes/apartament/ApartmentObject.js", "t_58b85f2ea88bf1a9ba16"),
        () => this.openItemPicker(page + 1),
        { half: true }
      ]);
    }

    actions.push([
      'BACK',
      () => this.openActions(),
      { dim: true }
    ]);

    this.renderMenu(
      __dialogueText("scenes/apartament/ApartmentObject.js", "t_266b6fd0dd4dc28a9405"),
      items.length
        ? `${__dialogueText("scenes/apartament/ApartmentObject.js", "t_57c86b1c5692c427a21a")}${page + 1}${__dialogueText("scenes/apartament/ApartmentObject.js", "t_8a5edab282632443219e")}${pages}`
        : (
            __dialogueText("scenes/apartament/ApartmentObject.js", "t_1f5274403d52625f5fd2") +
            __dialogueText("scenes/apartament/ApartmentObject.js", "t_6173506b41228bb4ef0a")
          ),
      actions
    );
  }

  renderMenu(title, body, actions) {
    const scene = this.scene;

    if (!scene?.sys?.isActive()) return;

    this.teardownMenu();

    if (
      scene.leaveDialog ||
      scene.isTransitioning
    ) {
      this.lastMenu = null;
      return;
    }

    this.lastMenu = {
      title,
      body,
      actions
    };

    const hud = scene.getPlayerHudScene?.();

    const host =
      hud?.sys?.isActive() &&
      hud.isHudReady
        ? hud
        : scene;

    hud?.closeAllUIPanels?.();

    if (host === hud) {
      hud.scene.setVisible(true);
      hud.scene.bringToTop();
    }

    const { width, height } = host.scale;

    const w = Math.max(
      160,
      Math.min(
        MENU.maxWidth,
        width - MENU.margin
      )
    );

    const maxH = Math.max(
      160,
      height - MENU.margin
    );

    const { pad, gap } = MENU;
    const innerW = w - pad * 2;

    const buttons = [
      ...actions,
      [
        'CLOSE',
        () => this.closeMenu(),
        { dim: true }
      ]
    ];

    const rows = [];

    for (let i = 0; i < buttons.length; i++) {
      if (
        buttons[i][2]?.half &&
        buttons[i + 1]?.[2]?.half
      ) {
        rows.push([i, i + 1]);
        i++;
      } else {
        rows.push([i]);
      }
    }

    const titleText = host.add.text(
      0,
      0,
      title,
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#ffd788',
        align: 'center',
        wordWrap: { width: innerW }
      }
    ).setOrigin(0.5, 0);

    let titleSize = 22;

    while (
      titleText.height > 56 &&
      titleSize > 14
    ) {
      titleText.setFontSize(--titleSize);
    }

    const bodyText = host.add.text(
      0,
      0,
      body,
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#eee1c9',
        align: 'center',
        wordWrap: { width: innerW }
      }
    ).setOrigin(0.5, 0);

    let compact = false;

    let rowH = buttons.some(
      button => button[2]?.sub
    )
      ? MENU.rowHSub
      : MENU.rowH;

    const chrome =
      pad * 2 +
      titleText.height +
      10 +
      12;

    const buttonsH = () =>
      rows.length * rowH +
      (rows.length - 1) * gap;

    let space =
      maxH - chrome - buttonsH();

    if (space < 70) {
      compact = true;
      rowH = MENU.rowHCompact;
      space = maxH - chrome - buttonsH();
    }

    let bodySize = 18;

    while (
      bodyText.height > space &&
      bodySize > 10
    ) {
      bodyText.setFontSize(--bodySize);
    }

    const bodyH = Math.max(
      16,
      Math.min(bodyText.height, space)
    );

    const panelH =
      chrome + bodyH + buttonsH();

    const top = -panelH / 2;

    const root = host.add
      .container(
        width / 2,
        height / 2
      )
      .setDepth(MENU.depth)
      .setScrollFactor(0);

    this.menu = root;
    scene.leaveDialog = root;

    const backdrop = host.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x000000,
        0.68
      )
      .setInteractive();

    backdrop.on(
      'pointerdown',
      () => this.closeMenu()
    );

    const panel = host.add
      .rectangle(
        0,
        0,
        w,
        panelH,
        0x241e19
      )
      .setStrokeStyle(2, 0xbca06a)
      .setInteractive();

    root.add([backdrop, panel]);

    titleText.setPosition(
      0,
      top + pad
    );

    bodyText.setPosition(
      0,
      top + pad + titleText.height + 10
    );

    root.add([titleText, bodyText]);

    const showKeys =
      !host.sys.game.device.input.touch;

    const buttonsTop =
      top +
      pad +
      titleText.height +
      10 +
      bodyH +
      12;

    const makeButton = (
      index,
      x,
      y,
      buttonWidth
    ) => {
      const [
        label,
        callback,
        options = {}
      ] = buttons[index];

      const style = options.tried
        ? STYLE.tried
        : options.primary
          ? STYLE.primary
          : options.dim
            ? STYLE.dim
            : STYLE.default;

      const hasSub =
        Boolean(options.sub) &&
        !compact;

      const caption =
        (
          showKeys && index < 9
            ? `${index + 1}. `
            : ''
        ) +
        label +
        (options.tried ? __dialogueText("scenes/apartament/ApartmentObject.js", "t_9648fcc2f52dfb912ed4") : '');

      const background = host.add
        .rectangle(
          x,
          y,
          buttonWidth,
          rowH,
          style.fill
        )
        .setStrokeStyle(1, style.stroke)
        .setInteractive({
          useHandCursor: true
        });

      const text = host.add.text(
        x,
        hasSub ? y - 9 : y,
        caption,
        {
          fontFamily: 'SpecialElite',
          fontSize:
            `${hasSub ? 17 : Math.min(18, rowH - 14)}px`,
          color: style.text
        }
      ).setOrigin(0.5);

      if (text.width > buttonWidth - 16) {
        text.setScale(
          (buttonWidth - 16) / text.width
        );
      }

      const parts = [background, text];

      if (hasSub) {
        const sub = host.add.text(
          x,
          y + 12,
          options.sub,
          {
            fontFamily: 'SpecialElite',
            fontSize: '12px',
            color: style.sub
          }
        ).setOrigin(0.5);

        if (sub.width > buttonWidth - 16) {
          sub.setScale(
            (buttonWidth - 16) / sub.width
          );
        }

        parts.push(sub);
      }

      background.on(
        'pointerover',
        () => background.setFillStyle(style.hover)
      );

      background.on(
        'pointerout',
        () => background.setFillStyle(style.fill)
      );

      background.on(
        'pointerdown',
        () => this.pressButton(root, callback)
      );

      root.add(parts);
    };

    rows.forEach((row, rowIndex) => {
      const y =
        buttonsTop +
        rowIndex * (rowH + gap) +
        rowH / 2;

      if (row.length === 1) {
        makeButton(
          row[0],
          0,
          y,
          innerW
        );
      } else {
        const buttonWidth =
          (innerW - gap) / 2;

        makeButton(
          row[0],
          -(buttonWidth / 2 + gap / 2),
          y,
          buttonWidth
        );

        makeButton(
          row[1],
          buttonWidth / 2 + gap / 2,
          y,
          buttonWidth
        );
      }
    });

    this.menuReadyAt =
      performance.now() + MENU.inputLockMs;

    this.keyHandler = event => {
      if (this.menu !== root) return;

      if (event.key === __dialogueText("scenes/apartament/ApartmentObject.js", "t_037c968467aa3fd7c059")) {
        return this.closeMenu();
      }

      const number = parseInt(event.key, 10);

      if (
        number >= 1 &&
        number <= buttons.length &&
        number <= 9
      ) {
        this.pressButton(
          root,
          buttons[number - 1][1]
        );
      }
    };

    this.resizeHandler = () =>
      this.scheduleRerender();

    this.panelHandler = state => {
      if (state?.anyPanelOpen) {
        this.closeMenu();
      }
    };

    scene.input.keyboard?.on(
      'keydown',
      this.keyHandler
    );

    scene.scale.on(
      'resize',
      this.resizeHandler
    );

    hud?.events.on(
      'panelStateChanged',
      this.panelHandler
    );

    this.boundHud = hud;
  }

  pressButton(root, callback) {
    if (
      this.menu !== root ||
      !this.scene?.sys?.isActive()
    ) {
      return;
    }

    if (
      performance.now() < this.menuReadyAt
    ) {
      return;
    }

    callback();
  }

  scheduleRerender() {
    this.resizeTimer?.remove(false);

    const time = this.scene?.time;

    if (!time) return;

    this.resizeTimer = time.delayedCall(
      120,
      () => {
        this.resizeTimer = null;

        const saved = this.lastMenu;

        if (
          this.menu &&
          saved &&
          this.scene?.sys?.isActive()
        ) {
          this.renderMenu(
            saved.title,
            saved.body,
            saved.actions
          );
        }
      }
    );
  }

  teardownMenu() {
    const scene = this.scene;

    if (this.keyHandler) {
      scene?.input?.keyboard?.off(
        'keydown',
        this.keyHandler
      );
    }

    if (this.resizeHandler) {
      scene?.scale?.off(
        'resize',
        this.resizeHandler
      );
    }

    if (this.panelHandler) {
      this.boundHud?.events?.off(
        'panelStateChanged',
        this.panelHandler
      );
    }

    this.keyHandler = null;
    this.resizeHandler = null;
    this.panelHandler = null;
    this.boundHud = null;

    this.resizeTimer?.remove(false);
    this.resizeTimer = null;

    const root = this.menu;

    if (
      root &&
      scene?.leaveDialog === root
    ) {
      scene.leaveDialog = null;
    }

    root?.destroy(true);
    this.menu = null;
  }

  closeMenu() {
    this.teardownMenu();
    this.lastMenu = null;
  }

  destroy() {
    this.closeMenu();

    this.scene?.events.off(
      'shutdown',
      this.shutdownHandler
    );

    this.background?.removeAllListeners();
    this.container?.destroy(true);

    this.scene = null;
    this.config = null;

    this.container = null;
    this.background = null;
    this.label = null;
    this.icon = null;
  }
}

export default ApartmentObject;