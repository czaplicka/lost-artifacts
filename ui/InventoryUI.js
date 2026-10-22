// ui/InventoryUI.js
import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { useItem, canUseItem } from '../managers/ItemUseService.js';
import { InventoryView } from './inventory/InventoryView.js';
import { InventoryDragController } from './inventory/InventoryDragController.js';

const DETECTIVE = 'Detective';

const say = text => EventBus.emit('showDialogue', { speaker: DETECTIVE, text });

export class InventoryUI {
  constructor(scene) {
    this.scene = scene;
    this.isVisible = false;
    this.selectedItem = null;
    this.view = null;
    this.dragController = null;
    this._renderPending = false;
    this._renderTimer = null;
    this._destroyed = false;
    this._initialized = false;

    this.handleInventoryToggled = open => this.handleToggle(open);
    this.handleInventoryUpdated = () => this.scheduleRender();
    this.handleInventorySelectionChanged = item => {
      this.selectedItem = item || null;
      if (this.isVisible) this.scheduleRender();
    };
    this.handleOutsidePointerDown = pointer => {
      if (this._destroyed || !this.isVisible || this.dragController?.isPending()) return;
      const rect = this.view?.panelRect;
      if (rect && !Phaser.Geom.Rectangle.Contains(rect, pointer.x, pointer.y)) {
        inventoryManager.close();
      }
    };
    this.handleKeyI = event => {
      if (this._destroyed || this.isTyping() || event?.repeat) return;
      if (this.dragController?.isDragging()) this.dragController.cancel(true);
      else inventoryManager.toggleInventory();
    };
    this.handleKeyEsc = () => {
      if (this._destroyed || this.isTyping()) return;
      if (this.dragController?.isPending()) this.dragController.cancel(true);
      else if (this.isVisible) inventoryManager.close();
    };
    this.handleResize = () => {
      this.dragController?.cancel(false);
      this.view?.layout();
    };
    this.handleInactive = () => {
      this.dragController?.cancel(false);
      if (this.isVisible) inventoryManager.close();
    };
    this.handleSceneShutdown = () => this.destroy();
  }

  initialize() {
    if (this._initialized || this._destroyed) return;

    if (!this.scene?.sys?.isActive()) {
      console.warn('[InventoryUI] initialize() skipped: scene is not active.');
      return;
    }

    this._initialized = true;

    try {
      this._buildView();
      this._buildDragController();
      this._attachListeners();
    } catch (error) {
      console.error('[InventoryUI] Initialization failed:', error);
      this.destroy();
      return;
    }

    this.selectedItem = inventoryManager.getSelectedItem();
    this.render();
    if (inventoryManager.isOpen) this.show(true);
  }

  _buildView() {
    this.view = new InventoryView(this.scene, {
      close: () => inventoryManager.close(),
      toggle: () => inventoryManager.toggleInventory(),
      use: () => this.useSelectedItem(),
      tooltip: item => this.showTooltip(item),
      press: (item, pointer) => this.dragController?.beginPress(item, pointer),
      isDragging: () => this.dragController?.isDragging() === true
    });
    this.view.create();
  }

  _buildDragController() {
    this.dragController = new InventoryDragController(this.scene, {
      isVisible: () => this.isVisible,
      clicked: item => {
        if (!this.isVisible || this._destroyed) return;
        this.selectItem(item);
        this.scheduleRender();
      },
      dragStarted: () => {
        this.hideTooltip();
        inventoryManager.close();
        this.view?.hide(true);
      },
      cancelled: reopen => {
        if (reopen && !this._destroyed && this.scene?.sys?.isActive()) {
          inventoryManager.open();
        }
      },
      finished: () => this.scheduleRender()
    });
  }

  _attachListeners() {
    EventBus.on('inventoryToggled', this.handleInventoryToggled, this);
    EventBus.on('inventoryUpdated', this.handleInventoryUpdated, this);
    EventBus.on('inventorySelectionChanged', this.handleInventorySelectionChanged, this);
    this.scene.input.on('pointerdown', this.handleOutsidePointerDown, this);
    this.attachKeyListener();
    this.scene.scale.on('resize', this.handleResize, this);
    this.scene.events.on(Phaser.Scenes.Events.SLEEP, this.handleInactive, this);
    this.scene.events.on(Phaser.Scenes.Events.PAUSE, this.handleInactive, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown, this);
  }

  isTyping() {
    const element = document.activeElement;
    return element?.tagName === 'INPUT'
      || element?.tagName === 'TEXTAREA'
      || element?.isContentEditable === true;
  }

  attachKeyListener() {
    this.scene.input.keyboard?.on('keydown-I', this.handleKeyI, this);
    this.scene.input.keyboard?.on('keydown-ESC', this.handleKeyEsc, this);
  }

  handleToggle(open) {
    if (this._destroyed) return;
    if (open) {
      if (this.dragController?.isPending()) this.dragController.cancel(false);
      this.show();
    } else {
      this.hide();
    }
  }

  show(immediate = false) {
    if (this._destroyed || !this.view || this.isVisible) return;
    this.isVisible = true;
    this.selectedItem = inventoryManager.getSelectedItem();
    this.render();
    this.view.show(immediate);
  }

  hide() {
    if (this._destroyed || !this.view) return;
    this.isVisible = false;
    if (!this.dragController?.isDragging()) this.dragController?.cancel(false);
    this.view.hide(true);
  }

  open() {
    if (!this._initialized || this._destroyed) return false;
    inventoryManager.open();
    return true;
  }

  close() {
    if (this._destroyed) return false;
    inventoryManager.close();
    return true;
  }

  toggle() {
    if (!this._destroyed) inventoryManager.toggleInventory();
  }

  scheduleRender() {
    if (this._destroyed || this._renderPending || !this.scene?.sys?.isActive()) return;
    this._renderPending = true;
    this._renderTimer = this.scene.time.delayedCall(0, () => {
      this._renderPending = false;
      this._renderTimer = null;
      if (this.isVisible && !this._destroyed && !this.dragController?.isPending()) {
        this.render();
      }
    });
  }

  render() {
    if (
      this._destroyed
      || !this.view
      || !this.scene?.sys?.isActive()
      || this.dragController?.isPending()
    ) return;

    this.selectedItem = inventoryManager.getSelectedItem();
    this.view.render(
      inventoryManager.getAllItems(),
      inventoryManager.getCapacity(),
      this.selectedItem,
      canUseItem(this.selectedItem)
    );
  }

  useSelectedItem() {
    if (this._destroyed || !this.isVisible || this.dragController?.isPending()) return;
    const selected = inventoryManager.getSelectedItem();
    if (!selected || !canUseItem(selected)) return;
    const result = useItem(selected.id);
    if (result?.message) say(result.message);
    this.scheduleRender();
  }

  selectItem(item) {
    if (this._destroyed || !item?.id) return;
    const selected = inventoryManager.getSelectedItem();
    if (selected?.id === item.id) {
      inventoryManager.clearSelection();
      say('Item put away. For now.');
    } else {
      inventoryManager.selectItem(item.id);
      say(`${item.name}. Let's see what this helps with.`);
    }
  }

  showTooltip(item) { this.view?.showTooltip(item, canUseItem(item)); }
  hideTooltip() { this.view?.hideTooltip(); }
  _updateUseButton() { this.render(); }
  _getVisibilityTargets() { return this.view?.targets() || []; }

  // Zachowany dostep do odczytu starych pol UI.
  get container() { return this.view?.container ?? null; }
  get panel() { return this.view?.panel ?? null; }
  get titleText() { return this.view?.titleText ?? null; }
  get counterText() { return this.view?.counterText ?? null; }
  get tooltip() { return this.view?.tooltip ?? null; }
  get closeButton() { return this.view?.closeButton ?? null; }
  get useButton() { return this.view?.useButton ?? null; }
  get button() { return this.view?.button ?? null; }
  get selectedLabel() { return this.view?.selectedLabel ?? null; }
  get _panelRect() { return this.view?.panelRect ?? null; }
  get panelX() { return this.view?.panelX; }
  get panelY() { return this.view?.panelY; }
  get width() { return this.view?.width; }
  get height() { return this.view?.height; }
  get colors() { return this.view?.colors; }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    const scene = this.scene;
    const wasVisible = this.isVisible;

    this.isVisible = false;
    this._initialized = false;
    this._renderTimer?.remove(false);
    this._renderTimer = null;
    this._renderPending = false;

    EventBus.off('inventoryToggled', this.handleInventoryToggled, this);
    EventBus.off('inventoryUpdated', this.handleInventoryUpdated, this);
    EventBus.off('inventorySelectionChanged', this.handleInventorySelectionChanged, this);

    // Przy DESTROY sceny input / scale / events moga byc juz wyzerowane.
    scene?.input?.off('pointerdown', this.handleOutsidePointerDown, this);
    scene?.input?.keyboard?.off('keydown-I', this.handleKeyI, this);
    scene?.input?.keyboard?.off('keydown-ESC', this.handleKeyEsc, this);
    scene?.scale?.off('resize', this.handleResize, this);

    for (const [event, callback] of [
      [Phaser.Scenes.Events.SLEEP, this.handleInactive],
      [Phaser.Scenes.Events.PAUSE, this.handleInactive],
      [Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown],
      [Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown]
    ]) scene?.events?.off(event, callback, this);

    this.dragController?.destroy();
    this.dragController = null;

    if (wasVisible && inventoryManager.isOpen) inventoryManager.close();

    this.view?.destroy();
    this.view = null;
    this.selectedItem = null;
    this.scene = null;
  }
}