import { InventoryView } from './inventory/InventoryView.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { EventBus } from '../EventBus.js';

const KEY = '__PIInventoryOverlay';

const PI_SCENES = new Set([
  'HomeCityScene',
  'DetectiveOfficeScene',
  'SpyShopScene',
  'TavernScene',
  'PoliceStationScene',
  'PigeonLoftScene'
]);

const BUTTON_CSS = `
.la-pi-inventory-button {
  --inv-edge:#ad8651;
  position:fixed; z-index:10010; display:none;
  align-items:center; justify-content:flex-start; gap:10px;
  box-sizing:border-box; margin:0; padding:7px 10px;
  min-width:0; min-height:0;
  border:2px solid var(--inv-edge); border-radius:3px;
  background:linear-gradient(180deg,#513827 0%,#37251b 52%,#291b15 100%);
  color:#f2e0b7;
  box-shadow:0 4px 0 #17110d,0 6px 12px #0007,inset 0 1px 0 #ffffff1c;
  font-family:SpecialElite,monospace; font-weight:normal;
  line-height:1; letter-spacing:0; white-space:nowrap;
  cursor:pointer; pointer-events:auto; touch-action:manipulation;
  user-select:none; -webkit-user-select:none;
  -webkit-tap-highlight-color:transparent;
  isolation:isolate;
}
.la-pi-inventory-button::before {
  content:''; position:absolute; inset:4px; z-index:-1;
  border:1px dashed #bc986348; border-radius:1px; pointer-events:none;
}
.la-pi-inventory-button .pi-inv-icon {
  display:flex; align-items:center; justify-content:center;
  width:29px; height:29px; flex:0 0 29px;
  color:#dcb87b; filter:drop-shadow(0 2px 0 #100b08);
}
.la-pi-inventory-button .pi-inv-icon svg {
  display:block;width:100%;height:100%;
}
.la-pi-inventory-button .pi-inv-label {
  flex:1; min-width:0; text-align:left;
  font-size:1em; letter-spacing:.055em;
  text-shadow:0 2px 0 #130d09;
}
.la-pi-inventory-button .pi-inv-key {
  display:flex; align-items:center; justify-content:center;
  box-sizing:border-box; width:25px; height:25px; flex:0 0 25px;
  background:#e7d4aa; color:#3c2a1c; border:1px solid #aa8755;
  border-bottom:3px solid #9b7949; border-radius:2px;
  font-family:SpecialElite,monospace;font-size:15px;line-height:1;
  text-shadow:none; box-shadow:0 1px 0 #130d0980;
}
@media (hover:hover) {
  .la-pi-inventory-button:hover:not(:disabled) {
    --inv-edge:#e0bc7d;
    background:linear-gradient(180deg,#62462e 0%,#463020 52%,#352319 100%);
    color:#fff0cb;
  }
}
.la-pi-inventory-button:focus-visible {
  outline:2px solid #f4dba3; outline-offset:4px;
}
.la-pi-inventory-button:active:not(:disabled) {
  transform:translateY(2px);
  box-shadow:0 2px 0 #17110d,0 3px 6px #0007,inset 0 1px 0 #ffffff14;
}
.la-pi-inventory-button:disabled {
  cursor:default;
}
@media (max-width:600px) {
  .la-pi-inventory-button {gap:7px;padding:6px 9px}
  .la-pi-inventory-button .pi-inv-icon {
    width:24px;height:24px;flex-basis:24px;
  }
  .la-pi-inventory-button .pi-inv-key {
    width:21px;height:23px;flex-basis:21px;font-size:13px;
  }
}
`;

export function isPIInventoryScene(scene) {
  return PI_SCENES.has(scene?.sys?.settings?.key);
}

function typing(event) {
  return [event?.target, document.activeElement].some(
    element =>
      element?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        element?.tagName
      )
  );
}

function blocked(scene) {
  return Boolean(
    scene.disposed ||
    scene._cleanupDone ||
    scene.navigating ||
    scene.leaving ||
    scene._sceneLoaderNavInFlight ||
    scene.activeDevice ||
    scene.computerChild ||
    scene.childLoading ||
    scene.computerUI?.isOpen ||
    scene.phoneUI?.isOpen ||
    scene.uiLocked ||
    scene.debugMode ||
    scene.panel ||
    scene.modal ||
    scene.confirmation ||
    scene.buying ||
    scene.coldCaseUI?.isOpen ||
    scene.destinationsUI?.isOpen ||
    scene.piCrimeBoardUI?.isOpen
  );
}

export class PIInventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: KEY });
  }

  init({ owner }) {
    this.owner = owner;
    this.ownerKey = owner.sys.settings.key;
    this.released = false;
    this.view = null;
    this.shade = null;
    this.hiddenDom = [];
    this.wasPausedByUs = false;
    this.onUpdated = null;
    this.onResize = null;
    this.onKey = null;
  }

  create() {
    this.events.once('shutdown', this.release, this);
    this.events.once('destroy', this.release, this);

    if (
      !this.owner?.sys?.isActive() ||
      blocked(this.owner)
    ) {
      this.scene.stop();
      return;
    }

    try {
      this.cameras.main.setBackgroundColor(
        'rgba(0,0,0,0)'
      );

      this.shade = this.add.rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        0x08070b,
        0.72
      )
        .setOrigin(0)
        .setDepth(100)
        .setInteractive();

      const stop = (
        _pointer,
        _x,
        _y,
        event
      ) => event?.stopPropagation();

      this.shade.on('pointerdown', stop);
      this.shade.on('pointerup', stop);
      this.shade.on('pointermove', stop);

      this.owner.heldArrows?.clear();

      this.scene.pause(this.ownerKey);
      this.wasPausedByUs = true;

      this.owner.piInventoryUI?.onOverlayReady();

      const nodes = new Set([
        this.owner.root,
        document.getElementById('hud-container')
      ]);

      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;

        this.hiddenDom.push({
          node,
          value: node.style.getPropertyValue(
            'visibility'
          ),
          priority: node.style.getPropertyPriority(
            'visibility'
          )
        });

        node.style.setProperty(
          'visibility',
          'hidden',
          'important'
        );
      }

      this.view = new InventoryView(this, {
        close: () => this.close(),
        toggle: () => this.close(),
        isDragging: () => false,

        press: (item, pointer) => {
          if (pointer?.event?.button > 0) return;

          piInventoryManager.selectItem(item.id);
          this.renderInventory();
        },

        tooltip: item => {
          this.view?.showTooltip(item, false);
        },

        use: () => {
          const item =
            piInventoryManager.getSelectedItem();

          if (!item) return;

          const sceneKey = this.ownerKey;

          this.close();

          EventBus.emit(
            'piInventory:useRequested',
            { item, sceneKey }
          );
        }
      });

      this.view.create();
      this.view.titleText.setText('PI INVENTORY');

      this.renderInventory();
      this.view.show(true);

      this.view.subtitleText?.setText(
        'Private pockets. Private business.'
      );

      this.onUpdated = () => this.renderInventory();

      EventBus.on(
        'piInventory:updated',
        this.onUpdated
      );

      this.onResize = () => {
        this.shade?.setSize(
          this.scale.width,
          this.scale.height
        );

        this.view?.layout();
      };

      this.scale.on('resize', this.onResize);

      this.onKey = event => {
        if (
          event.defaultPrevented ||
          typing(event) ||
          event.repeat ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        ) {
          return;
        }

        if (
          event.code === 'Escape' ||
          event.code === 'KeyI'
        ) {
          event.preventDefault();
          this.close();
        }
      };

      this.input.keyboard?.on(
        'keydown',
        this.onKey
      );
    } catch (error) {
      console.error(
        '[PIInventory] Panel creation failed:',
        error
      );

      this.close();
    }
  }

  renderInventory() {
    const selected =
      piInventoryManager.getSelectedItem();

    this.view?.render(
      piInventoryManager.getAllItems(),
      piInventoryManager.getCapacity(),
      selected,
      Boolean(selected)
    );
  }

  close() {
    this.scene.stop();
  }

  release() {
    if (this.released) return;
    this.released = true;

    if (this.onUpdated) {
      EventBus.off(
        'piInventory:updated',
        this.onUpdated
      );
    }

    if (this.onResize) {
      this.scale?.off('resize', this.onResize);
    }

    if (this.onKey) {
      this.input?.keyboard?.off(
        'keydown',
        this.onKey
      );
    }

    this.events.off(
      'shutdown',
      this.release,
      this
    );

    this.events.off(
      'destroy',
      this.release,
      this
    );

    try {
      this.view?.destroy();
    } finally {
      this.view = null;

      for (const {
        node,
        value,
        priority
      } of this.hiddenDom) {
        if (!node.isConnected) continue;

        if (value) {
          node.style.setProperty(
            'visibility',
            value,
            priority
          );
        } else {
          node.style.removeProperty('visibility');
        }
      }

      this.hiddenDom = [];

      const owner =
        this.scene.manager.keys[this.ownerKey];

      if (
        this.wasPausedByUs &&
        owner === this.owner &&
        !owner._cleanupDone &&
        !owner.disposed &&
        this.scene.isPaused(this.ownerKey)
      ) {
        this.scene.resume(this.ownerKey);
      }

      this.wasPausedByUs = false;

      if (owner === this.owner) {
        owner.piInventoryUI?.onOverlayReleased();
      }
    }
  }
}

export function installPIInventory(scene) {
  if (!isPIInventoryScene(scene)) return null;

  if (
    scene.piInventoryUI &&
    !scene.piInventoryUI.destroyed
  ) {
    return scene.piInventoryUI;
  }

  const manager = scene.scene.manager;
  const gameEvents = scene.game.events;

  if (!manager.keys[KEY]) {
    manager.add(KEY, PIInventoryScene, false);
  }

  const style = document.createElement('style');
  style.textContent = BUTTON_CSS;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'la-pi-inventory-button';

  button.setAttribute(
    'aria-label',
    'Open PI inventory'
  );

  button.setAttribute('aria-keyshortcuts', 'I');

  button.title =
    'Inventory — private pockets, questionable contents. [I]';

  const icon = document.createElement('span');
  icon.className = 'pi-inv-icon';
  icon.setAttribute('aria-hidden', 'true');

  const namespace = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(
    namespace,
    'svg'
  );

  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('focusable', 'false');

  const shapes = [
    [
      'path',
      {
        d: 'M11 9V5h10v4',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2'
      }
    ],
    [
      'path',
      {
        d: 'M3 10h26v17H3z',
        fill: '#422b1c',
        stroke: 'currentColor',
        'stroke-width': '2'
      }
    ],
    [
      'path',
      {
        d: 'M3 11v7l13 3 13-3v-7',
        fill: '#765137',
        stroke: 'currentColor',
        'stroke-width': '2'
      }
    ],
    [
      'rect',
      {
        x: '14',
        y: '17',
        width: '4',
        height: '6',
        fill: '#eed29a',
        stroke: '#3b291b',
        'stroke-width': '1'
      }
    ],
    [
      'path',
      {
        d: 'M6 24h4M22 24h4',
        fill: 'none',
        stroke: '#ad8651',
        'stroke-width': '1'
      }
    ]
  ];

  for (const [tag, attributes] of shapes) {
    const node = document.createElementNS(
      namespace,
      tag
    );

    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, value);
    }

    svg.appendChild(node);
  }

  icon.appendChild(svg);

  const label = document.createElement('span');
  label.className = 'pi-inv-label';
  label.textContent = 'INVENTORY';

  const key = document.createElement('span');
  key.className = 'pi-inv-key';
  key.textContent = 'I';
  key.setAttribute('aria-hidden', 'true');

  button.append(icon, label, key);
  document.body.appendChild(button);

  let pending = false;
  let lastBox = '';
  let lastVisible = null;

  let inputLocked = false;
  let previousInputEnabled = true;
  let unlockRequested = false;
  let unlockQueued = false;

  const heldPointers = new Set();

  const originalCanUseOffice =
    typeof scene.canUseOffice === 'function'
      ? scene.canUseOffice
      : null;

  let wrappedCanUseOffice = null;

  function overlayOwnedAndOpen() {
    const overlay = manager.keys[KEY];

    return Boolean(
      overlay?.owner === scene &&
      (
        manager.isActive(KEY) ||
        manager.isPaused(KEY)
      )
    );
  }

  function acquireInputLock() {
    unlockRequested = false;

    if (unlockQueued) {
      gameEvents.off('poststep', finishUnlock);
      unlockQueued = false;
    }

    if (inputLocked) return;

    previousInputEnabled = scene.input.enabled;
    inputLocked = true;
    scene.input.enabled = false;

    scene.heldArrows?.clear();
  }

  function restoreInput() {
    if (!inputLocked) return;

    inputLocked = false;

    if (scene.input) {
      scene.input.enabled = previousInputEnabled;
    }
  }

  function finishUnlock() {
    unlockQueued = false;

    if (
      api.destroyed ||
      !unlockRequested ||
      pending ||
      overlayOwnedAndOpen() ||
      heldPointers.size > 0
    ) {
      return;
    }

    unlockRequested = false;
    restoreInput();
    api.refresh();
  }

  function queueUnlock() {
    if (
      api.destroyed ||
      !unlockRequested ||
      unlockQueued ||
      heldPointers.size > 0
    ) {
      return;
    }

    unlockQueued = true;

    gameEvents.once(
      'poststep',
      finishUnlock
    );
  }

  function requestInputUnlock() {
    unlockRequested = true;
    queueUnlock();
  }

  const onGlobalPointerDown = event => {
    heldPointers.add(event.pointerId);
  };

  const onGlobalPointerEnd = event => {
    heldPointers.delete(event.pointerId);
    queueUnlock();
  };

  const onWindowBlur = () => {
    heldPointers.clear();
    queueUnlock();
  };

  const stopDomEvent = event => {
    event.stopPropagation();
  };

  const onPress = event => {
    event.stopPropagation();

    if (
      event.isPrimary === false ||
      (
        event.button !== undefined &&
        event.button !== 0
      )
    ) {
      return;
    }

    event.preventDefault();
    button.blur();

    api.open();
  };

  const onClick = event => {
    event.preventDefault();
    event.stopPropagation();

    button.blur();

    // Keyboard and accessibility activation.
    // Pointer activation has already opened the panel.
    if (event.detail === 0) {
      api.open();
    }
  };

  const onKey = event => {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      typing(event)
    ) {
      return;
    }

    if (api.open()) {
      event.preventDefault();
    }
  };

  const stoppedEvents = [
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'touchstart',
    'touchmove',
    'touchend',
    'touchcancel',
    'dblclick',
    'contextmenu'
  ];

  const api = {
    destroyed: false,

    get isBlocking() {
      return Boolean(
        !api.destroyed &&
        (
          pending ||
          inputLocked ||
          overlayOwnedAndOpen()
        )
      );
    },

    onOverlayReady() {
      pending = false;
      api.refresh();
    },

    onOverlayReleased() {
      pending = false;

      if (api.destroyed) return;

      requestInputUnlock();
      api.refresh();
    },

    open() {
      if (
        api.destroyed ||
        pending ||
        inputLocked ||
        !scene.sys.isActive() ||
        blocked(scene) ||
        manager.isActive(KEY) ||
        manager.isPaused(KEY)
      ) {
        return false;
      }

      pending = true;
      acquireInputLock();

      lastVisible = false;
      button.disabled = true;
      button.style.display = 'none';

      try {
        scene.scene.launch(
          KEY,
          { owner: scene }
        );

        scene.scene.bringToTop(KEY);

        return true;
      } catch (error) {
        pending = false;
        requestInputUnlock();

        console.error(
          '[PIInventory] Opening failed:',
          error
        );

        return false;
      }
    },

    close() {
      const overlay = manager.keys[KEY];

      if (
        overlay?.owner === scene &&
        (
          manager.isActive(KEY) ||
          manager.isPaused(KEY)
        )
      ) {
        manager.stop(KEY);
      }

      pending = false;

      if (!api.destroyed) {
        requestInputUnlock();
      }
    },

    layout() {
      if (api.destroyed) return;

      const canvas = scene.game?.canvas;

      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      const signature = [
        rect.left,
        rect.top,
        rect.width,
        rect.height
      ].join('/');

      if (signature === lastBox) return;

      lastBox = signature;

      const scale = Math.min(
        1.2,
        Math.max(0.65, rect.width / 1280)
      );

      const width = Math.min(
        218 * scale,
        Math.max(1, rect.width - 16)
      );

      const height = Math.max(
        44,
        52 * scale
      );

      const margin = Math.min(
        16,
        Math.max(6, rect.width * 0.012)
      );

      Object.assign(button.style, {
        left:
          `${rect.left + rect.width - width - margin}px`,
        top:
          `${rect.top + rect.height - height - margin}px`,
        width: `${width}px`,
        height: `${height}px`,
        fontSize: `${Math.max(11, 15 * scale)}px`
      });
    },

    refresh() {
      if (api.destroyed) return;

      const overlayOpen =
        manager.isActive(KEY) ||
        manager.isPaused(KEY);

      const box = scene.game?.canvas
        ?.getBoundingClientRect();

      const visible = Boolean(
        scene.sys.isActive() &&
        !blocked(scene) &&
        !pending &&
        !inputLocked &&
        !overlayOpen &&
        box &&
        box.width > 0 &&
        box.height > 0
      );

      if (visible !== lastVisible) {
        lastVisible = visible;

        button.style.display = visible
          ? 'flex'
          : 'none';

        button.disabled = !visible;
      }

      if (visible) {
        api.layout();
      }
    },

    destroy() {
      if (api.destroyed) return;

      api.destroyed = true;
      api.close();

      gameEvents.off(
        'poststep',
        finishUnlock
      );

      unlockQueued = false;
      unlockRequested = false;
      heldPointers.clear();

      restoreInput();

      if (
        wrappedCanUseOffice &&
        scene.canUseOffice === wrappedCanUseOffice
      ) {
        scene.canUseOffice = originalCanUseOffice;
      }

      scene.events.off(
        'postupdate',
        api.refresh
      );

      scene.events.off(
        'sleep',
        api.close
      );

      scene.events.off(
        'shutdown',
        api.destroy
      );

      scene.events.off(
        'destroy',
        api.destroy
      );

      scene.scale.off(
        'resize',
        api.layout
      );

      scene.input.keyboard?.off(
        'keydown-I',
        onKey
      );

      window.removeEventListener(
        'pointerdown',
        onGlobalPointerDown,
        true
      );

      window.removeEventListener(
        'pointerup',
        onGlobalPointerEnd,
        true
      );

      window.removeEventListener(
        'pointercancel',
        onGlobalPointerEnd,
        true
      );

      window.removeEventListener(
        'blur',
        onWindowBlur
      );

      button.removeEventListener(
        'pointerdown',
        onPress
      );

      button.removeEventListener(
        'click',
        onClick
      );

      for (const type of stoppedEvents) {
        button.removeEventListener(
          type,
          stopDomEvent
        );
      }

      button.remove();
      style.remove();

      if (scene.piInventoryUI === api) {
        scene.piInventoryUI = null;
      }
    }
  };

  if (originalCanUseOffice) {
    wrappedCanUseOffice = function (...args) {
      return (
        !api.isBlocking &&
        originalCanUseOffice.apply(this, args)
      );
    };

    scene.canUseOffice = wrappedCanUseOffice;
  }

  window.addEventListener(
    'pointerdown',
    onGlobalPointerDown,
    true
  );

  window.addEventListener(
    'pointerup',
    onGlobalPointerEnd,
    true
  );

  window.addEventListener(
    'pointercancel',
    onGlobalPointerEnd,
    true
  );

  window.addEventListener(
    'blur',
    onWindowBlur
  );

  button.addEventListener(
    'pointerdown',
    onPress,
    { passive: false }
  );

  button.addEventListener(
    'click',
    onClick
  );

  for (const type of stoppedEvents) {
    button.addEventListener(
      type,
      stopDomEvent,
      { passive: true }
    );
  }

  scene.events.on(
    'postupdate',
    api.refresh
  );

  scene.events.on(
    'sleep',
    api.close
  );

  scene.events.once(
    'shutdown',
    api.destroy
  );

  scene.events.once(
    'destroy',
    api.destroy
  );

  scene.scale.on(
    'resize',
    api.layout
  );

  scene.input.keyboard?.on(
    'keydown-I',
    onKey
  );

  scene.piInventoryUI = api;

  if (scene.computerUI?.officeShop) {
    const computer = scene.computerUI;

    import('./pi-computer/PIInventoryOfficeShop.js')
      .then(({ bindPIInventoryOfficeShop }) => {
        if (
          !api.destroyed &&
          !computer.destroyed
        ) {
          bindPIInventoryOfficeShop(
            computer.officeShop
          );
        }
      })
      .catch(error => {
        console.error(
          '[PIInventory] Office shop integration failed:',
          error
        );
      });
  }

  api.layout();
  api.refresh();

  return api;
}