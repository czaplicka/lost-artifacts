import { InventoryView } from './inventory/InventoryView.js';
import { piInventoryManager } from '../managers/PIInventoryManager.js';
import { EventBus } from '../EventBus.js';

const KEY = '__PIInventoryOverlay';
const PI_SCENES = new Set([
  'HomeCityScene', 'DetectiveOfficeScene', 'SpyShopScene',
  'TavernScene', 'PoliceStationScene', 'PigeonLoftScene'
]);

export function isPIInventoryScene(scene) {
  return PI_SCENES.has(scene?.sys?.settings?.key);
}

function typing(event) {
  return [event?.target, document.activeElement].some(element =>
    element?.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName));
}

function blocked(scene) {
  return Boolean(
    scene.disposed || scene._cleanupDone || scene.navigating || scene.leaving ||
    scene._sceneLoaderNavInFlight || scene.activeDevice || scene.computerChild ||
    scene.childLoading || scene.computerUI?.isOpen || scene.phoneUI?.isOpen ||
    scene.uiLocked || scene.debugMode || scene.panel || scene.modal ||
    scene.confirmation || scene.buying || scene.coldCaseUI?.isOpen ||
    scene.destinationsUI?.isOpen || scene.piCrimeBoardUI?.isOpen
  );
}

export class PIInventoryScene extends Phaser.Scene {
  constructor() { super({ key: KEY }); }

  init({ owner }) {
    this.owner = owner;
    this.ownerKey = owner.sys.settings.key;
    this.released = false;
    this.view = null;
    this.hiddenDom = [];
    this.wasPausedByUs = false;
    this.onUpdated = null;
    this.onResize = null;
    this.onKey = null;
  }

  create() {
    if (!this.owner?.sys?.isActive() || blocked(this.owner)) {
      this.scene.stop();
      return;
    }
    this.events.once('shutdown', this.release, this);
    this.events.once('destroy', this.release, this);
    try {
      this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
      this.shade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x08070b, 0.72)
        .setOrigin(0).setDepth(100).setInteractive();
      const stop = (_pointer, _x, _y, event) => event?.stopPropagation();
      this.shade.on('pointerdown', stop);
      this.shade.on('pointerup', stop);
      this.owner.heldArrows?.clear();
      this.scene.pause(this.ownerKey);
      this.wasPausedByUs = true;
      this.owner.piInventoryUI?.refresh();
      for (const node of new Set([this.owner.root, document.getElementById('hud-container')])) {
        if (!(node instanceof HTMLElement)) continue;
        this.hiddenDom.push({
          node,
          value: node.style.getPropertyValue('visibility'),
          priority: node.style.getPropertyPriority('visibility')
        });
        node.style.setProperty('visibility', 'hidden', 'important');
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
        tooltip: item => this.view?.showTooltip(item, false),
        use: () => {
          const item = piInventoryManager.getSelectedItem();
          if (!item) return;
          const sceneKey = this.ownerKey;
          this.close();
          EventBus.emit('piInventory:useRequested', { item, sceneKey });
        }
      });
      this.view.create();
      this.view.titleText.setText('PI INVENTORY');
      this.renderInventory();
      this.view.show(true);
      this.view.subtitleText?.setText('Private pockets. Private business.');
      this.onUpdated = () => this.renderInventory();
      EventBus.on('piInventory:updated', this.onUpdated);
      this.onResize = () => {
        this.shade?.setSize(this.scale.width, this.scale.height);
        this.view?.layout();
      };
      this.scale.on('resize', this.onResize);
      this.onKey = event => {
        if (typing(event) || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.code === 'Escape' || event.code === 'KeyI') {
          event.preventDefault();
          this.close();
        }
      };
      this.input.keyboard?.on('keydown', this.onKey);
    } catch (error) {
      console.error('[PIInventory] Panel creation failed:', error);
      this.close();
    }
  }

  renderInventory() {
    const selected = piInventoryManager.getSelectedItem();
    this.view?.render(piInventoryManager.getAllItems(), piInventoryManager.getCapacity(), selected, Boolean(selected));
  }

  close() { this.scene.stop(); }

  release() {
    if (this.released) return;
    this.released = true;
    if (this.onUpdated) EventBus.off('piInventory:updated', this.onUpdated);
    if (this.onResize) this.scale?.off('resize', this.onResize);
    if (this.onKey) this.input?.keyboard?.off('keydown', this.onKey);
    this.events.off('shutdown', this.release, this);
    this.events.off('destroy', this.release, this);
    try {
      this.view?.destroy();
    } finally {
      this.view = null;
      for (const { node, value, priority } of this.hiddenDom) {
        if (!node.isConnected) continue;
        if (value) node.style.setProperty('visibility', value, priority);
        else node.style.removeProperty('visibility');
      }
      this.hiddenDom = [];
      const owner = this.scene.manager.keys[this.ownerKey];
      if (this.wasPausedByUs && owner === this.owner && !owner._cleanupDone &&
          !owner.disposed && this.scene.isPaused(this.ownerKey)) {
        this.scene.resume(this.ownerKey);
      }
      this.wasPausedByUs = false;
      if (owner === this.owner) owner.piInventoryUI?.refresh();
    }
  }
}

export function installPIInventory(scene) {
  if (!isPIInventoryScene(scene)) return null;
  if (scene.piInventoryUI && !scene.piInventoryUI.destroyed) return scene.piInventoryUI;

  const manager = scene.scene.manager;
  if (!manager.keys[KEY]) manager.add(KEY, PIInventoryScene, false);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'la-pi-inventory-button';
  button.setAttribute('aria-label', 'Open PI inventory');
  button.setAttribute('aria-keyshortcuts', 'I');
  button.title = 'PI inventory (I)';

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '▣';
  Object.assign(icon.style, {
    fontFamily: 'monospace', fontSize: '21px', lineHeight: '1'
  });
  const label = document.createElement('span');
  label.textContent = 'INVENTORY [I]';
  button.append(icon, label);

  Object.assign(button.style, {
    position: 'fixed', zIndex: '10010', display: 'none',
    alignItems: 'center', justifyContent: 'center', gap: '10px',
    boxSizing: 'border-box', margin: '0', padding: '8px 12px',
    minWidth: '0', minHeight: '0', border: '2px solid #d4af37',
    borderRadius: '0', background: '#241d2b', color: '#f2d477',
    fontFamily: 'PressStart2P, monospace', fontWeight: 'normal',
    lineHeight: '1.4', letterSpacing: '0', whiteSpace: 'nowrap',
    cursor: 'pointer', pointerEvents: 'auto', touchAction: 'manipulation',
    userSelect: 'none', WebkitUserSelect: 'none',
    boxShadow: '3px 3px 0 rgba(0,0,0,0.45)'
  });
  document.body.appendChild(button);

  let pending = false;
  let lastBox = '';
  let lastVisible = null;
  const stopPointer = event => event.stopPropagation();
  const onClick = event => {
    event.preventDefault();
    event.stopPropagation();
    button.blur();
    api.open();
  };
  const onKey = event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey ||
        event.altKey || typing(event)) return;
    if (api.open()) event.preventDefault();
  };
  const onHover = () => { button.style.background = '#3b3045'; };
  const onLeave = () => { button.style.background = '#241d2b'; };

  const api = {
    destroyed: false,

    open() {
      if (api.destroyed || pending || !scene.sys.isActive() || blocked(scene) ||
          manager.isActive(KEY) || manager.isPaused(KEY)) return false;
      pending = true;
      lastVisible = false;
      button.disabled = true;
      button.style.display = 'none';
      scene.heldArrows?.clear();
      scene.scene.launch(KEY, { owner: scene });
      scene.scene.bringToTop(KEY);
      return true;
    },

    close() {
      const overlay = manager.keys[KEY];
      if (overlay?.owner === scene && (manager.isActive(KEY) || manager.isPaused(KEY))) manager.stop(KEY);
      pending = false;
    },

    layout() {
      if (api.destroyed) return;
      const canvas = scene.game?.canvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const signature = [rect.left, rect.top, rect.width, rect.height].join('/');
      if (signature === lastBox) return;
      lastBox = signature;
      const scale = Math.min(1.2, Math.max(0.65, rect.width / 1280));
      const width = Math.min(218 * scale, Math.max(1, rect.width - 16));
      const height = Math.max(44, 52 * scale);
      const margin = Math.min(16, Math.max(6, rect.width * 0.012));
      Object.assign(button.style, {
        left: `${rect.left + rect.width - width - margin}px`,
        top: `${rect.top + rect.height - height - margin}px`,
        width: `${width}px`, height: `${height}px`,
        fontSize: `${Math.max(9, 10 * scale)}px`
      });
    },

    refresh() {
      if (api.destroyed) return;
      const overlayOpen = manager.isActive(KEY) || manager.isPaused(KEY);
      if (pending && (overlayOpen || scene.sys.isActive())) pending = false;
      const canvas = scene.game?.canvas;
      const box = canvas?.getBoundingClientRect();
      const visible = Boolean(scene.sys.isActive() && !blocked(scene) && !overlayOpen &&
        box && box.width > 0 && box.height > 0);
      if (visible !== lastVisible) {
        lastVisible = visible;
        button.style.display = visible ? 'flex' : 'none';
        button.disabled = !visible;
      }
      if (visible) api.layout();
    },

    destroy() {
      if (api.destroyed) return;
      api.destroyed = true;
      api.close();
      scene.events.off('postupdate', api.refresh);
      scene.events.off('sleep', api.close);
      scene.events.off('shutdown', api.destroy);
      scene.events.off('destroy', api.destroy);
      scene.scale.off('resize', api.layout);
      scene.input.keyboard?.off('keydown-I', onKey);
      button.removeEventListener('click', onClick);
      button.removeEventListener('pointerdown', stopPointer);
      button.removeEventListener('pointerup', stopPointer);
      button.removeEventListener('pointerenter', onHover);
      button.removeEventListener('pointerleave', onLeave);
      button.remove();
      if (scene.piInventoryUI === api) scene.piInventoryUI = null;
    }
  };

  button.addEventListener('pointerdown', stopPointer);
  button.addEventListener('pointerup', stopPointer);
  button.addEventListener('click', onClick);
  button.addEventListener('pointerenter', onHover);
  button.addEventListener('pointerleave', onLeave);
  scene.events.on('postupdate', api.refresh);
  scene.events.on('sleep', api.close);
  scene.events.once('shutdown', api.destroy);
  scene.events.once('destroy', api.destroy);
  scene.scale.on('resize', api.layout);
  scene.input.keyboard?.on('keydown-I', onKey);
  scene.piInventoryUI = api;

  if (scene.computerUI?.officeShop) {
    const computer = scene.computerUI;
    import('./pi-computer/PIInventoryOfficeShop.js').then(({ bindPIInventoryOfficeShop }) => {
      if (!api.destroyed && !computer.destroyed) bindPIInventoryOfficeShop(computer.officeShop);
    }).catch(error => console.error('[PIInventory] Office shop integration failed:', error));
  }
  api.layout();
  api.refresh();
  return api;
}