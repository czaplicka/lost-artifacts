import {
  InventoryView
} from './inventory/InventoryView.js';

import {
  piInventoryManager
} from '../managers/PIInventoryManager.js';

import {
  EventBus
} from '../EventBus.js';

const KEY = '__PIInventoryOverlay';

const PI_SCENES = new Set([
  'HomeCityScene',
  'DetectiveOfficeScene',
  'SpyShopScene',
  'TavernScene',
  'PoliceStationScene',
  'PigeonLoftScene'
]);

export function isPIInventoryScene(scene) {
  return PI_SCENES.has(
    scene?.sys?.settings?.key
  );
}

function typing(event) {
  return [
    event?.target,
    document.activeElement
  ].some(element =>
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
    this.hiddenDom = [];
    this.wasPausedByUs = false;
  }

  create() {
    if (
      !this.owner?.sys?.isActive() ||
      blocked(this.owner)
    ) {
      this.scene.stop();
      return;
    }

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

    const stop = (_pointer, _x, _y, event) => {
      event?.stopPropagation();
    };

    this.shade.on('pointerdown', stop);
    this.shade.on('pointerup', stop);

    this.events.once(
      'shutdown',
      this.release,
      this
    );

    this.events.once(
      'destroy',
      this.release,
      this
    );

    this.owner.heldArrows?.clear();

    this.scene.pause(this.ownerKey);
    this.wasPausedByUs = true;

    const nodes = new Set([
      this.owner.root,
      document.getElementById('hud-container')
    ]);

    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;

      this.hiddenDom.push({
        node,
        value: node.style.getPropertyValue('visibility'),
        priority: node.style.getPropertyPriority('visibility')
      });

      node.style.setProperty(
        'visibility',
        'hidden',
        'important'
      );
    }

    try {
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

          this.close();

          EventBus.emit(
            'piInventory:useRequested',
            {
              item,
              sceneKey: this.ownerKey
            }
          );
        }
      });

      this.view.create();

      this.view.titleText.setText(
        'PI INVENTORY'
      );

      this.renderInventory();
      this.view.show(true);

      this.view.subtitleText?.setText(
        'Private pockets. Private business.'
      );

      this.onUpdated = () => {
        this.renderInventory();
      };

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

      this.scale.on(
        'resize',
        this.onResize
      );

      this.onKey = event => {
        if (
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

    this.scale?.off(
      'resize',
      this.onResize
    );

    this.input?.keyboard?.off(
      'keydown',
      this.onKey
    );

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

    this.view?.destroy();
    this.view = null;

    for (
      const { node, value, priority }
      of this.hiddenDom
    ) {
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

    if (
      owner === this.owner &&
      owner.sys.isActive()
    ) {
      owner.piInventoryUI?.refresh();
    }
  }
}

export function installPIInventory(scene) {
  if (!isPIInventoryScene(scene)) {
    return null;
  }

  if (
    scene.piInventoryUI &&
    !scene.piInventoryUI.destroyed
  ) {
    return scene.piInventoryUI;
  }

  const manager = scene.scene.manager;

  if (!manager.keys[KEY]) {
    manager.add(
      KEY,
      PIInventoryScene,
      false
    );
  }

  const button = scene.add.container(0, 0)
    .setScrollFactor(0)
    .setDepth(45000);

  const plate = scene.add.rectangle(
    0,
    0,
    208,
    52,
    0x241d2b
  )
    .setOrigin(0)
    .setStrokeStyle(2, 0xd4af37)
    .setInteractive({ useHandCursor: true });

  const icon = scene.add.graphics();

  icon.lineStyle(2, 0xf2d477, 1);
  icon.strokeRoundedRect(13, 17, 24, 23, 3);
  icon.strokeRoundedRect(19, 9, 12, 13, 3);
  icon.lineBetween(14, 25, 36, 25);

  const label = scene.add.text(
    48,
    21,
    'INVENTORY [I]',
    {
      fontFamily: 'PressStart2P',
      fontSize: '10px',
      color: '#f2d477'
    }
  );

  button.add([
    plate,
    icon,
    label
  ]);

  plate.setData('cityUi', true);

  const api = {
    destroyed: false,

    open() {
      if (
        api.destroyed ||
        !scene.sys.isActive() ||
        blocked(scene) ||
        manager.isActive(KEY)
      ) {
        return false;
      }

      scene.heldArrows?.clear();

      scene.scene.launch(KEY, {
        owner: scene
      });

      scene.scene.bringToTop(KEY);

      return true;
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
    },

    refresh() {
      if (api.destroyed) return;

      const visible =
        scene.sys.isActive() &&
        !blocked(scene);

      button.setVisible(visible);

      if (plate.input) {
        plate.input.enabled = visible;
      }
    },

    layout() {
      if (api.destroyed) return;

      const scale = Math.min(
        1,
        Math.max(
          0.65,
          (scene.scale.width - 24) / 208
        )
      );

      button
        .setScale(scale)
        .setPosition(
          scene.scale.width - 16 - 208 * scale,
          scene.scale.height - 16 - 52 * scale
        );
    },

    destroy() {
      if (api.destroyed) return;

      api.destroyed = true;
      api.close();

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

      button.destroy(true);

      if (scene.piInventoryUI === api) {
        scene.piInventoryUI = null;
      }
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

  plate.on(
    'pointerdown',
    (pointer, _x, _y, event) => {
      event?.stopPropagation();

      if (!(pointer?.event?.button > 0)) {
        api.open();
      }
    }
  );

  plate.on('pointerover', () => {
    plate.setFillStyle(0x3b3045);
  });

  plate.on('pointerout', () => {
    plate.setFillStyle(0x241d2b);
  });

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

    import(
      './pi-computer/PIInventoryOfficeShop.js'
    ).then(({ bindPIInventoryOfficeShop }) => {
      if (
        !api.destroyed &&
        !computer.destroyed
      ) {
        bindPIInventoryOfficeShop(
          computer.officeShop
        );
      }
    }).catch(error => {
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