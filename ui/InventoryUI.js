import { EventBus } from '../EventBus.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import {
  useItem,
  canUseItem
} from '../managers/ItemUseService.js';
import {
  createDiscardRequest,
  discardInventoryItem
} from '../managers/InventoryDiscardService.js';
import { InventoryView } from './inventory/InventoryView.js';
import { InventoryDragController } from './inventory/InventoryDragController.js';
import { InventoryDiscardDialog } from './inventory/InventoryDiscardDialog.js';

const say = text => {
  EventBus.emit('showDialogue', {
    speaker: 'Detective',
    text
  });
};

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

    this.discardDialog = null;
    this.discardButtonBg = null;
    this.discardButtonText = null;

    this.handleInventoryToggled = open => {
      this.handleToggle(open);
    };

    this.handleInventoryUpdated = () => {
      if (this._destroyed) return;

      this.cancelDiscard();
      this.scheduleRender();
    };

    this.handleInventorySelectionChanged = item => {
      if (this._destroyed) return;

      this.cancelDiscard();
      this.selectedItem = item || null;

      if (this.isVisible) {
        this.scheduleRender();
      }
    };

    this.handleOutsidePointerDown = pointer => {
      if (
        this._destroyed ||
        !this.isVisible ||
        this.discardDialog ||
        this.dragController?.isPending()
      ) {
        return;
      }

      const rect = this.view?.panelRect;

      if (
        rect &&
        !Phaser.Geom.Rectangle.Contains(
          rect,
          pointer.x,
          pointer.y
        )
      ) {
        inventoryManager.close();
      }
    };

    this.handleKeyI = event => {
      if (
        this._destroyed ||
        this.isTyping() ||
        event?.repeat
      ) {
        return;
      }

      if (this.discardDialog) {
        this.cancelDiscard();
        return;
      }

      if (this.dragController?.isDragging()) {
        this.dragController.cancel(true);
      } else {
        inventoryManager.toggleInventory();
      }
    };

    this.handleKeyEsc = () => {
      if (this._destroyed || this.isTyping()) {
        return;
      }

      if (this.discardDialog) {
        this.cancelDiscard();
        return;
      }

      if (this.dragController?.isPending()) {
        this.dragController.cancel(true);
      } else if (this.isVisible) {
        inventoryManager.close();
      }
    };

    this.handleResize = () => {
      if (!this.hasLiveView()) return;

      this.cancelDiscard(false);
      this.dragController?.cancel(false);

      if (!this.hasLiveView()) return;

      this.view.layout();
      this.updateDiscardButton();
    };

    this.handleInactive = () => {
      if (this._destroyed) return;

      this.cancelDiscard(false);
      this.dragController?.cancel(false);

      if (this.isVisible) {
        inventoryManager.close();
      }
    };

    this.handleSceneShutdown = () => {
      this.destroy();
    };
  }

  hasLiveView() {
    return Boolean(
      !this._destroyed &&
      this.scene?.sys?.isActive() &&
      this.view &&
      !this.view._destroyed &&
      this.view.root?.active &&
      this.view.root.scene
    );
  }

  hasLiveDiscardButton() {
    const bg = this.discardButtonBg;
    const text = this.discardButtonText;

    return Boolean(
      this.hasLiveView() &&
      bg?.active &&
      bg.scene &&
      text?.active &&
      text.scene &&
      text.texture &&
      text.texture.source?.[0] &&
      text.canvas &&
      text.context
    );
  }

  initialize() {
    if (this._initialized || this._destroyed) {
      return;
    }

    if (!this.scene?.sys?.isActive()) {
      console.warn(
        '[InventoryUI] initialize() skipped: scene is not active.'
      );
      return;
    }

    this._initialized = true;

    try {
      this._buildView();
      this._buildDragController();
      this._attachListeners();
    } catch (error) {
      console.error(
        '[InventoryUI] Initialization failed:',
        error
      );

      this.destroy();
      return;
    }

    this.selectedItem = inventoryManager.getSelectedItem();
    this.render();

    if (inventoryManager.isOpen) {
      this.show(true);
    }
  }

  _buildView() {
    this.view = new InventoryView(this.scene, {
      close: () => inventoryManager.close(),
      toggle: () => inventoryManager.toggleInventory(),
      use: () => this.useSelectedItem(),
      tooltip: item => this.showTooltip(item),

      press: (item, pointer) => {
        if (!this._destroyed && !this.discardDialog) {
          this.dragController?.beginPress(item, pointer);
        }
      },

      isDragging: () =>
        Boolean(
          this.discardDialog ||
          this.dragController?.isDragging()
        )
    });

    this.view.create();
    this.createDiscardButton();
  }

  createDiscardButton() {
    if (!this.hasLiveView()) return;

    const view = this.view;
    const gap = 10;
    const width = (view.cardW - gap) / 2;

    view.useButtonBg.setSize(width, 54);

    view.useButton
      .setPosition(view.cardX + width / 2, 437)
      .setFontSize(15);

    const x = view.cardX + width + gap;

    this.discardButtonBg = this.scene.add
      .rectangle(x, 410, width, 54, 0x353541)
      .setOrigin(0)
      .setStrokeStyle(2, 0x6a6070)
      .setInteractive({
        useHandCursor: true
      });

    this.discardButtonText = this.scene.add
      .text(x + width / 2, 437, 'DISCARD', {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: '#96909b'
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#000000', 0, false, true);

    this.discardButtonBg.on(
      'pointerdown',
      (pointer, lx, ly, event) => {
        event?.stopPropagation();
      }
    );

    this.discardButtonBg.on(
      'pointerup',
      (pointer, lx, ly, event) => {
        event?.stopPropagation();

        if (
          pointer?.event?.button !== undefined &&
          pointer.event.button !== 0
        ) {
          return;
        }

        this.requestDiscard();
      }
    );

    this.discardButtonBg.on('pointerover', () => {
      if (
        this.hasLiveDiscardButton() &&
        this.canDiscardSelected()
      ) {
        this.discardButtonBg.setFillStyle(0x873444);
      }
    });

    this.discardButtonBg.on('pointerout', () => {
      this.updateDiscardButton();
    });

    view.root.add([
      this.discardButtonBg,
      this.discardButtonText
    ]);

    this.updateDiscardButton();
  }

  _buildDragController() {
    this.dragController = new InventoryDragController(
      this.scene,
      {
        isVisible: () =>
          !this._destroyed &&
          this.isVisible &&
          !this.discardDialog,

        clicked: item => {
          if (
            !this.isVisible ||
            this._destroyed ||
            this.discardDialog
          ) {
            return;
          }

          this.selectItem(item);
          this.scheduleRender();
        },

        dragStarted: () => {
          if (this._destroyed) return;

          this.cancelDiscard();
          this.hideTooltip();
          inventoryManager.close();

          if (this.hasLiveView()) {
            this.view.hide(true);
          }
        },

        cancelled: reopen => {
          if (
            reopen &&
            !this._destroyed &&
            this.scene?.sys?.isActive()
          ) {
            inventoryManager.open();
          }
        },

        finished: () => {
          this.scheduleRender();
        }
      }
    );
  }

  _attachListeners() {
    EventBus.on(
      'inventoryToggled',
      this.handleInventoryToggled,
      this
    );

    EventBus.on(
      'inventoryUpdated',
      this.handleInventoryUpdated,
      this
    );

    EventBus.on(
      'inventorySelectionChanged',
      this.handleInventorySelectionChanged,
      this
    );

    this.scene.input.on(
      'pointerdown',
      this.handleOutsidePointerDown,
      this
    );

    this.attachKeyListener();

    this.scene.scale.on(
      'resize',
      this.handleResize,
      this
    );

    this.scene.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.handleInactive,
      this
    );

    this.scene.events.on(
      Phaser.Scenes.Events.PAUSE,
      this.handleInactive,
      this
    );

    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleSceneShutdown,
      this
    );

    this.scene.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.handleSceneShutdown,
      this
    );
  }

  isTyping() {
    const element = document.activeElement;

    return (
      element?.tagName === 'INPUT' ||
      element?.tagName === 'TEXTAREA' ||
      element?.isContentEditable === true
    );
  }

  attachKeyListener() {
    this.scene.input.keyboard?.on(
      'keydown-I',
      this.handleKeyI,
      this
    );

    this.scene.input.keyboard?.on(
      'keydown-ESC',
      this.handleKeyEsc,
      this
    );
  }

  handleToggle(open) {
    if (this._destroyed) return;

    if (open) {
      if (this.dragController?.isPending()) {
        this.dragController.cancel(false);
      }

      this.show();
    } else {
      this.hide();
    }
  }

  show(immediate = false) {
    if (!this.hasLiveView() || this.isVisible) {
      return;
    }

    this.isVisible = true;
    this.selectedItem = inventoryManager.getSelectedItem();

    this.render();

    if (this.hasLiveView()) {
      this.view.show(immediate);
    }
  }

  hide() {
    if (this._destroyed) return;

    this.cancelDiscard(false);
    this.isVisible = false;

    if (!this.dragController?.isDragging()) {
      this.dragController?.cancel(false);
    }

    if (this.hasLiveView()) {
      this.view.hide(true);
    }

    this.updateDiscardButton();
  }

  open() {
    if (!this._initialized || !this.hasLiveView()) {
      return false;
    }

    inventoryManager.open();
    return true;
  }

  close() {
    if (this._destroyed) return false;

    inventoryManager.close();
    return true;
  }

  toggle() {
    if (!this._destroyed) {
      inventoryManager.toggleInventory();
    }
  }

  scheduleRender() {
    if (
      !this.hasLiveView() ||
      this._renderPending
    ) {
      return;
    }

    this._renderPending = true;

    this._renderTimer = this.scene.time.delayedCall(
      0,
      () => {
        this._renderPending = false;
        this._renderTimer = null;

        if (
          this.isVisible &&
          this.hasLiveView() &&
          !this.dragController?.isPending()
        ) {
          this.render();
        }
      }
    );
  }

  render() {
    if (
      !this.hasLiveView() ||
      this.dragController?.isPending()
    ) {
      return;
    }

    this.selectedItem = inventoryManager.getSelectedItem();

    this.view.render(
      inventoryManager.getAllItems(),
      inventoryManager.getCapacity(),
      this.selectedItem,
      canUseItem(this.selectedItem)
    );

    this.updateDiscardButton();
  }

  canDiscardSelected() {
    return Boolean(
      this.hasLiveView() &&
      this.isVisible &&
      !this.discardDialog &&
      !this.dragController?.isPending() &&
      inventoryManager.getSelectedItem()
    );
  }

  updateDiscardButton() {
    if (!this.hasLiveDiscardButton()) {
      return;
    }

    const enabled = this.canDiscardSelected();
    const bg = this.discardButtonBg;
    const text = this.discardButtonText;
    const color = enabled ? '#ffc0c0' : '#96909b';

    bg
      .setFillStyle(enabled ? 0x652936 : 0x353541)
      .setStrokeStyle(
        2,
        enabled ? 0xff9c9c : 0x6a6070
      );

    if (text.style?.color !== color) {
      text.setColor(color);
    }

    if (bg.input) {
      bg.input.enabled = enabled;
      bg.input.cursor = enabled ? 'pointer' : 'default';
    }
  }

  requestDiscard() {
    if (!this.canDiscardSelected()) {
      return;
    }

    const request = createDiscardRequest(
      inventoryManager.getSelectedItem()
    );

    if (!request) return;

    this.hideTooltip();
    this.view?.endWindowMove();

    const dialog = new InventoryDiscardDialog(
      this.scene,
      request,
      {
        cancel: () => {
          if (this.discardDialog === dialog) {
            this.discardDialog = null;
          }

          this.updateDiscardButton();
        },

        confirm: mode => {
          if (this.discardDialog !== dialog) {
            return;
          }

          this.discardDialog = null;

          if (
            !this.hasLiveView() ||
            !this.isVisible
          ) {
            return;
          }

          const result = discardInventoryItem(
            request,
            mode
          );

          if (result.success) {
            say(result.message);
          } else {
            say(
              'The item changed or is no longer available. Select it again before discarding.'
            );
          }

          this.render();
          this.scheduleRender();
        }
      }
    );

    this.discardDialog = dialog;
    this.updateDiscardButton();

    try {
      dialog.open();
    } catch (error) {
      this.cancelDiscard();

      console.error(
        '[InventoryUI] Discard confirmation failed:',
        error
      );
    }
  }

  cancelDiscard(refreshButton = true) {
    const dialog = this.discardDialog;
    this.discardDialog = null;

    dialog?.destroy();

    if (refreshButton && !this._destroyed) {
      this.updateDiscardButton();
    }
  }

  useSelectedItem() {
    if (
      !this.hasLiveView() ||
      !this.isVisible ||
      this.discardDialog ||
      this.dragController?.isPending()
    ) {
      return;
    }

    const selected = inventoryManager.getSelectedItem();

    if (!selected || !canUseItem(selected)) {
      return;
    }

    const result = useItem(selected.id);

    if (result?.message) {
      say(result.message);
    }

    this.scheduleRender();
  }

  selectItem(item) {
    if (
      this._destroyed ||
      this.discardDialog ||
      !item?.id
    ) {
      return;
    }

    const selected = inventoryManager.getSelectedItem();

    if (selected?.id === item.id) {
      inventoryManager.clearSelection();
      say('Item put away. For now.');
    } else {
      inventoryManager.selectItem(item.id);
      say(`${item.name}. Let's see what this helps with.`);
    }
  }

  showTooltip(item) {
    if (this.hasLiveView() && !this.discardDialog) {
      this.view.showTooltip(item, canUseItem(item));
    }
  }

  hideTooltip() {
    if (this.hasLiveView()) {
      this.view.hideTooltip();
    }
  }

  _updateUseButton() {
    this.render();
  }

  _getVisibilityTargets() {
    return this.view?.targets() || [];
  }

  get container() {
    return this.view?.container ?? null;
  }

  get panel() {
    return this.view?.panel ?? null;
  }

  get titleText() {
    return this.view?.titleText ?? null;
  }

  get counterText() {
    return this.view?.counterText ?? null;
  }

  get tooltip() {
    return this.view?.tooltip ?? null;
  }

  get closeButton() {
    return this.view?.closeButton ?? null;
  }

  get useButton() {
    return this.view?.useButton ?? null;
  }

  get button() {
    return this.view?.button ?? null;
  }

  get selectedLabel() {
    return this.view?.selectedLabel ?? null;
  }

  get _panelRect() {
    return this.view?.panelRect ?? null;
  }

  get panelX() {
    return this.view?.panelX;
  }

  get panelY() {
    return this.view?.panelY;
  }

  get width() {
    return this.view?.width;
  }

  get height() {
    return this.view?.height;
  }

  get colors() {
    return this.view?.colors;
  }

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

    EventBus.off(
      'inventoryToggled',
      this.handleInventoryToggled,
      this
    );

    EventBus.off(
      'inventoryUpdated',
      this.handleInventoryUpdated,
      this
    );

    EventBus.off(
      'inventorySelectionChanged',
      this.handleInventorySelectionChanged,
      this
    );

    scene?.input?.off(
      'pointerdown',
      this.handleOutsidePointerDown,
      this
    );

    scene?.input?.keyboard?.off(
      'keydown-I',
      this.handleKeyI,
      this
    );

    scene?.input?.keyboard?.off(
      'keydown-ESC',
      this.handleKeyEsc,
      this
    );

    scene?.scale?.off(
      'resize',
      this.handleResize,
      this
    );

    const listeners = [
      [
        Phaser.Scenes.Events.SLEEP,
        this.handleInactive
      ],
      [
        Phaser.Scenes.Events.PAUSE,
        this.handleInactive
      ],
      [
        Phaser.Scenes.Events.SHUTDOWN,
        this.handleSceneShutdown
      ],
      [
        Phaser.Scenes.Events.DESTROY,
        this.handleSceneShutdown
      ]
    ];

    for (const [event, callback] of listeners) {
      scene?.events?.off(event, callback, this);
    }

    this.cancelDiscard(false);

    this.dragController?.destroy();
    this.dragController = null;

    if (wasVisible && inventoryManager.isOpen) {
      inventoryManager.close();
    }

    this.discardButtonBg = null;
    this.discardButtonText = null;

    this.view?.destroy();
    this.view = null;

    this.selectedItem = null;
    this.scene = null;
  }
}