import {
  dialogueText
} from '../../dialogues/DialogueText.js';

import {
  EventBus
} from '../../EventBus.js';

const SAVE_KEY = 'debtCabinetPuzzleV1';
const SOURCE = 'scenes/apartament/DebtApartmentPuzzle.js';

const ASSET_BASE = 'assets/apartments/cabinet/';

const ASSETS = [
  {
    key: 'debt_cabinet_body',
    file: 'debt_cabinet_body.webp'
  },
  {
    key: 'debt_cabinet_fixed',
    file: 'debt_cabinet_fixed.webp'
  },
  {
    key: 'debt_cabinet_paper',
    file: 'paper.webp'
  },
  {
    key: 'debt_crowbar_in_place',
    file: 'debt_crowbar_in_place.webp'
  },
  {
    key: 'debt_crowbar',
    file: 'debt_crowbar.webp'
  },
  {
    key: 'debt_puzzle_background',
    file: 'debt_puzzle_background.webp'
  },
  {
    key: 'debt_rubber_wedge',
    file: 'debt_rubber_wedge.webp'
  },
  {
    key: 'debt_tool_drawer_background',
    file: 'debt_tool_drawer_background.webp'
  },
  {
    key: 'debt_wedge_in_place',
    file: 'debt_wedge_in_place.webp'
  }
];

const UI = {
  width: 1040,
  height: 900,
  artWidth: 960,
  artHeight: 540,
  artY: -110
};

const TEXT = {
  toolsTitle: 't_26002f58c33b35996b25',
  cabinetTitle: 't_e99d70db677ca1e62e2d',
  toolsNote: 't_62724bb86bb34dfab7fd',
  collected: 't_b1e3ce4a17f50830ff4b',
  trapped: 't_fef482c0d3ba6c7aeb29',
  wedge: 't_445486b4845b72f4360d',
  wedgeTaken: 't_3e2cf7decf0123676d44',
  crowbar: 't_52ba8546e66ca5aac66a',
  crowbarTaken: 't_b695c751bb77d8a38172',
  restOfDrawer: 't_b2bb1baf2fc4f4d46796',
  doorHint: 't_1c08af289e7f910d2121',
  wheelHint: 't_73681127f981d75911fa',
  wedgeUsed: 't_35d3169b1cf6859ab2b1',
  crowbarUsed: 't_875fd88e458b89a275b2',
  wrongDoor: 't_4271d5c04ad711f8bcee',
  wrongWheel: 't_210a848c9ba6fd76305b',
  secureDoor: 't_2cc99ad9c03677085ed1',
  liftCorner: 't_18529de41d9ffa9e69da',
  noisy: 't_49348a406ec2b59b735f',
  careful: 't_c41038a0db935429bea2',
  pinned: 't_a29dacc1cb62f60f2c77',
  alreadyTaken: 't_563ead89282f254ff360',
  collectionFailed: 't_bdd05c607e292d7c002b'
};

const t = name => dialogueText(SOURCE, TEXT[name]);

export class DebtApartmentPuzzle {
  constructor(system) {
    this.system = system;
    this.scene = system.scene;

    this.root = null;
    this.content = null;
    this.art = null;
    this.host = null;

    this.view = null;
    this.note = '';
    this.selectedTool = null;

    this.bindings = [];
    this.destroyed = false;
    this.mounted = false;
    this.opening = false;
    this.collecting = false;

    this.assetPromise = null;
    this.cancelAssetLoad = null;

    this.resizeHandler = () => {
      if (this.root) this.render();
    };

    this.shutdownHandler = () => this.destroy();

    this.scene.events.once(
      'shutdown',
      this.shutdownHandler
    );
  }

  get state() {
    return {
      wedgeTaken: false,
      crowbarTaken: false,
      doorSecured: false,
      cornerLifted: false,
      moved: false,
      collected: false,
      noisy: false,
      ...this.scene.getProgress()[SAVE_KEY]
    };
  }

  save(patch) {
    this.scene.updateProgress({
      [SAVE_KEY]: {
        ...this.state,
        ...patch
      }
    });
  }

  prepare(objects) {
    const cabinet = objects.find(
      object => object.layoutSlotId === 'cabinet'
    );

    const desk = objects.find(
      object => object.layoutSlotId === 'desk'
    );

    const drawer = objects.find(
      object => object.layoutSlotId === 'kitchen_drawers'
    );

    if (!cabinet || !desk || !drawer) {
      throw new Error(
        '[DebtApartmentPuzzle] Missing cabinet, desk or kitchen drawer.'
      );
    }

    const leads = objects.flatMap(object =>
      (object.unlocks || []).filter(
        item => item.isEscapeClue === true
      )
    );

    if (leads.length !== 1) {
      throw new Error(
        '[DebtApartmentPuzzle] Exactly one escape document is required.'
      );
    }

    this.reward = leads[0];
    this.cabinetId = cabinet.id;
    this.drawerId = drawer.id;

    for (const object of objects) {
      object.unlocks = (object.unlocks || []).filter(
        item => item.id !== this.reward.id
      );
    }

    desk.unlocks ||= [];
    desk.unlocks.push(...cabinet.unlocks);

    cabinet.unlocks = [this.reward];
    cabinet.state = 'open';
    cabinet.requiresItem = undefined;
    cabinet.discoveryAction = 'move';

    this.scene.scale.on(
      'resize',
      this.resizeHandler
    );
  }

  mount() {
    if (this.destroyed || this.mounted) return;

    const objects = this.scene.apartmentObjects || [];

    this.cabinet = objects.find(
      object => object.config.id === this.cabinetId
    );

    this.drawer = objects.find(
      object => object.config.id === this.drawerId
    );

    if (!this.cabinet || !this.drawer) {
      throw new Error(
        '[DebtApartmentPuzzle] Apartment objects were not created.'
      );
    }

    this.drawerOriginal = this.drawer.openActions;

    for (const method of [
      'onInteract',
      'inspect',
      'reveal',
      'openActions',
      'performAction',
      'showContents',
      'takeItem'
    ]) {
      this.replace(this.cabinet, method, () => {
        void this.open('cabinet');
      });
    }

    this.replace(this.drawer, 'onInteract', () => {
      void this.open('tools');
    });

    if (this.scene.hasItemAlready(this.reward.id)) {
      this.save({
        collected: true,
        moved: true
      });
    }

    this.mounted = true;
  }

  replace(object, key, replacement) {
    this.bindings.push({
      object,
      key,
      original: object[key]
    });

    object[key] = replacement;
  }

  available() {
    return Boolean(
      !this.destroyed &&
      this.scene.sys.isActive() &&
      !this.scene.isTransitioning &&
      !this.scene.leaveDialog &&
      !this.scene.getPlayerHudScene()?.isAnyPanelOpen()
    );
  }

  ensureAssets() {
    const missing = ASSETS.filter(
      asset => !this.scene.textures.exists(asset.key)
    );

    if (!missing.length) {
      return Promise.resolve();
    }

    if (this.assetPromise) {
      return this.assetPromise;
    }

    const loader = this.scene.load;

    const pending = new Promise((resolve, reject) => {
      let finished = false;
      let timeout = null;

      const cleanup = () => {
        loader.off('complete', onComplete);
        clearTimeout(timeout);
        this.cancelAssetLoad = null;
      };

      const finish = error => {
        if (finished) return;

        finished = true;
        cleanup();

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      const onComplete = () => {
        const failed = ASSETS.filter(
          asset =>
            !this.scene.textures.exists(asset.key)
        );

        finish(
          failed.length
            ? new Error(
                'Missing puzzle images: ' +
                failed.map(asset => asset.file).join(', ')
              )
            : null
        );
      };

      this.cancelAssetLoad = () => {
        finish(
          new Error('Puzzle image loading cancelled.')
        );
      };

      loader.once('complete', onComplete);

      timeout = setTimeout(() => {
        finish(
          new Error('Puzzle image loading timed out.')
        );
      }, 30000);

      for (const asset of missing) {
        loader.image(
          asset.key,
          `${ASSET_BASE}${asset.file}`
        );
      }

      if (!loader.isLoading()) {
        loader.start();
      }
    });

    this.assetPromise = pending.finally(() => {
      this.assetPromise = null;
    });

    return this.assetPromise;
  }

  async open(view) {
    if (
      this.destroyed ||
      this.opening ||
      (!this.root && !this.available())
    ) {
      return;
    }

    this.opening = true;

    try {
      await this.ensureAssets();

      if (
        this.destroyed ||
        !this.scene.sys.isActive() ||
        (!this.root && !this.available())
      ) {
        return;
      }

      this.view = view;
      this.note = '';
      this.selectedTool = null;

      this.render();
    } catch (error) {
      if (!this.destroyed) {
        console.error(
          '[DebtApartmentPuzzle]',
          error
        );

        this.scene.showMessage(
          'Could not load the cabinet images. Check the browser console.',
          5000
        );
      }
    } finally {
      this.opening = false;
    }
  }

  tell(message) {
    this.note = message;
    this.render();
  }

  close() {
    const root = this.root;

    this.root = null;
    this.content = null;
    this.art = null;

    if (this.scene.leaveDialog === root) {
      this.scene.leaveDialog = null;
    }

    root?.destroy(true);
  }

  render() {
    if (
      this.destroyed ||
      !this.scene.sys.isActive()
    ) {
      return;
    }

    this.close();

    const hud = this.scene.getPlayerHudScene();

    this.host = hud?.sys?.isActive() && hud.isHudReady
      ? hud
      : this.scene;

    if (this.host === hud) {
      hud.closeAllUIPanels();
      hud.scene.setVisible(true);
      hud.scene.bringToTop();
    }

    const { width, height } = this.host.scale;

    this.root = this.host.add
      .container(width / 2, height / 2)
      .setDepth(45000)
      .setScrollFactor(0);

    const backdrop = this.host.add.rectangle(
      0,
      0,
      width,
      height,
      0x000000,
      0.9
    ).setInteractive();

    this.root.add(backdrop);

    this.content = this.host.add.container(0, 0);

    this.content.setScale(
      Math.min(
        1,
        Math.max(0.05, (width - 16) / UI.width),
        Math.max(0.05, (height - 16) / UI.height)
      )
    );

    this.root.add(this.content);
    this.scene.leaveDialog = this.root;

    this.box(
      0,
      0,
      UI.width,
      UI.height,
      0x211a16
    );

    this.text(
      0,
      -415,
      this.view === 'tools'
        ? t('toolsTitle')
        : t('cabinetTitle'),
      25,
      '#ffd788'
    );

    this.art = this.host.add.container(0, UI.artY);
    this.content.add(this.art);

    if (this.view === 'tools') {
      this.drawTools();
    } else {
      this.drawCabinet();
    }

    this.text(
      0,
      210,
      this.note || this.defaultNote(),
      20,
      '#f1e5ca',
      950
    );

    if (this.view === 'cabinet') {
      this.drawCabinetActions();
    } else {
      this.button(
        0,
        278,
        420,
        t('restOfDrawer'),
        () => {
          this.close();
          this.drawerOriginal.call(this.drawer);
        }
      );
    }

    this.drawToolbelt();

    this.button(
      0,
      414,
      220,
      'CLOSE',
      () => this.close()
    );
  }

  defaultNote() {
    const state = this.state;

    if (this.view === 'tools') {
      return t('toolsNote');
    }

    if (state.collected) {
      return t('collected');
    }

    if (state.moved) {
      return (
        'The document is free. Take it before ' +
        'the furniture changes its mind.'
      );
    }

    if (this.selectedTool) {
      return this.selectedTool === 'wedge'
        ? 'Rubber wedge selected. Click the cabinet to secure its door.'
        : 'Crowbar selected. Click the cabinet to lift the damaged corner.';
    }

    return t('trapped');
  }

  box(x, y, width, height, color) {
    const object = this.host.add.rectangle(
      x,
      y,
      width,
      height,
      color
    ).setStrokeStyle(2, 0x927449);

    this.content.add(object);

    return object;
  }

  text(
    x,
    y,
    value,
    size = 18,
    color = '#eee1c9',
    wrap = 950
  ) {
    const object = this.host.add.text(
      x,
      y,
      value,
      {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color,
        align: 'center',
        wordWrap: {
          width: wrap
        }
      }
    ).setOrigin(0.5);

    this.content.add(object);

    return object;
  }

  button(
    x,
    y,
    width,
    label,
    callback,
    enabled = true,
    selected = false
  ) {
    const fill = selected
      ? 0x88612d
      : enabled
        ? 0x59452e
        : 0x302923;

    const background = this.box(
      x,
      y,
      width,
      46,
      fill
    );

    const caption = this.text(
      x,
      y,
      label,
      18,
      enabled ? '#fff0cc' : '#8c806e',
      width - 16
    );

    if (caption.width > width - 18) {
      caption.setScale(
        (width - 18) / caption.width
      );
    }

    if (enabled) {
      background.setInteractive({
        useHandCursor: true
      });

      background.on('pointerdown', callback);

      background.on('pointerover', () => {
        background.setFillStyle(0x80613c);
      });

      background.on('pointerout', () => {
        background.setFillStyle(fill);
      });
    }

    return background;
  }

  layer(key) {
    const image = this.host.add.image(
      0,
      0,
      key
    ).setDisplaySize(
      UI.artWidth,
      UI.artHeight
    );

    this.art.add(image);

    return image;
  }

  artTarget(callback) {
    const zone = this.host.add.zone(
      0,
      0,
      UI.artWidth,
      UI.artHeight
    ).setInteractive({
      useHandCursor: true
    });

    zone.on('pointerdown', callback);
    this.art.add(zone);

    return zone;
  }

  drawCabinet() {
    const state = this.state;

    const fixed = (
      state.doorSecured ||
      state.moved ||
      state.collected
    );

    this.layer('debt_puzzle_background');

    if (!state.collected) {
      this.layer('debt_cabinet_paper');
    }

    this.layer(
      fixed
        ? 'debt_cabinet_fixed'
        : 'debt_cabinet_body'
    );

    if (state.doorSecured) {
      this.layer('debt_wedge_in_place');
    }

    if (state.cornerLifted) {
      this.layer('debt_crowbar_in_place');
    }

    this.artTarget(() => {
      const currentState = this.state;

      if (currentState.collected) {
        this.tell(t('collected'));
        return;
      }

      if (currentState.moved) {
        this.takeDocument();
        return;
      }

      if (this.selectedTool) {
        this.useOn(
          this.selectedTool === 'wedge'
            ? 'door'
            : 'wheel'
        );

        return;
      }

      this.tell(
        `${t('doorHint')}\n${t('wheelHint')}`
      );
    });
  }

  drawCabinetActions() {
    const state = this.state;

    if (state.collected) {
      this.text(
        0,
        278,
        'DOCUMENT RECOVERED',
        19,
        '#b7c5a1'
      );

      return;
    }

    if (state.moved) {
      this.button(
        0,
        278,
        380,
        'TAKE DOCUMENT',
        () => this.takeDocument(),
        !this.collecting
      );

      return;
    }

    this.button(
      -245,
      278,
      460,
      'MOVE CAREFULLY — 8 MIN',
      () => this.move(false)
    );

    this.button(
      245,
      278,
      460,
      'YANK IT — 2 MIN / NOISE',
      () => this.move(true)
    );
  }

  drawTools() {
    const state = this.state;

    this.layer('debt_tool_drawer_background');

    if (!state.wedgeTaken) {
      const wedge = this.layer(
        'debt_rubber_wedge'
      );

      wedge.setInteractive({
        useHandCursor: true,
        pixelPerfect: true,
        alphaTolerance: 16
      });

      wedge.on('pointerdown', () => {
        this.takeTool('wedge');
      });
    }

    if (!state.crowbarTaken) {
      const crowbar = this.layer(
        'debt_crowbar'
      );

      crowbar.setInteractive({
        useHandCursor: true,
        pixelPerfect: true,
        alphaTolerance: 16
      });

      crowbar.on('pointerdown', () => {
        this.takeTool('crowbar');
      });
    }
  }

  takeTool(tool) {
    if (this.destroyed) return;

    const state = this.state;

    if (
      tool === 'wedge' &&
      !state.wedgeTaken
    ) {
      this.save({
        wedgeTaken: true
      });

      this.tell(t('wedgeTaken'));
    }

    if (
      tool === 'crowbar' &&
      !state.crowbarTaken
    ) {
      this.save({
        crowbarTaken: true
      });

      this.tell(t('crowbarTaken'));
    }
  }

  drawToolbelt() {
    const state = this.state;
    const inDrawer = this.view === 'tools';
    const finished = state.moved || state.collected;

    const wedgeAvailable = (
      state.wedgeTaken &&
      !state.doorSecured &&
      !finished
    );

    const crowbarAvailable = (
      state.crowbarTaken &&
      !state.cornerLifted &&
      !finished
    );

    const wedgeLabel = state.doorSecured
      ? 'WEDGE IN PLACE'
      : state.wedgeTaken
        ? 'RUBBER WEDGE'
        : 'TAKE RUBBER WEDGE';

    const crowbarLabel = state.cornerLifted
      ? 'CROWBAR IN PLACE'
      : state.crowbarTaken
        ? 'CROWBAR'
        : 'TAKE CROWBAR';

    this.button(
      -245,
      346,
      460,
      wedgeLabel,
      () => {
        if (inDrawer) {
          this.takeTool('wedge');
        } else {
          this.selectTool('wedge');
        }
      },
      inDrawer
        ? !state.wedgeTaken
        : wedgeAvailable,
      this.selectedTool === 'wedge'
    );

    this.button(
      245,
      346,
      460,
      crowbarLabel,
      () => {
        if (inDrawer) {
          this.takeTool('crowbar');
        } else {
          this.selectTool('crowbar');
        }
      },
      inDrawer
        ? !state.crowbarTaken
        : crowbarAvailable,
      this.selectedTool === 'crowbar'
    );
  }

  selectTool(tool) {
    const state = this.state;

    if (
      state.moved ||
      state.collected ||
      (
        tool === 'wedge' &&
        (!state.wedgeTaken || state.doorSecured)
      ) ||
      (
        tool === 'crowbar' &&
        (!state.crowbarTaken || state.cornerLifted)
      )
    ) {
      return;
    }

    this.selectedTool = this.selectedTool === tool
      ? null
      : tool;

    this.note = '';
    this.render();
  }

  useOn(target) {
    const state = this.state;

    if (state.moved || state.collected) {
      this.tell(
        'The cabinet has already been moved.'
      );

      return;
    }

    if (!this.selectedTool) {
      this.tell(
        target === 'door'
          ? t('doorHint')
          : t('wheelHint')
      );

      return;
    }

    if (
      target === 'door' &&
      this.selectedTool === 'wedge' &&
      state.wedgeTaken &&
      !state.doorSecured
    ) {
      this.save({
        doorSecured: true
      });

      this.selectedTool = null;
      this.tell(t('wedgeUsed'));

      return;
    }

    if (
      target === 'wheel' &&
      this.selectedTool === 'crowbar' &&
      state.crowbarTaken &&
      !state.cornerLifted
    ) {
      this.save({
        cornerLifted: true
      });

      this.selectedTool = null;
      this.tell(t('crowbarUsed'));

      return;
    }

    this.tell(
      target === 'door'
        ? t('wrongDoor')
        : t('wrongWheel')
    );
  }

  move(noisy) {
    const state = this.state;

    if (state.moved || state.collected) return;

    if (!state.doorSecured) {
      this.tell(t('secureDoor'));
      return;
    }

    if (!state.cornerLifted) {
      this.tell(t('liftCorner'));
      return;
    }

    this.save({
      moved: true,
      noisy
    });

    this.cabinet.state = 'open';
    this.cabinet.revealed = true;
    this.cabinet.isInteracted = true;
    this.cabinet.saveProgress();

    this.selectedTool = null;
    this.note = t(
      noisy ? 'noisy' : 'careful'
    );

    this.render();

    EventBus.emit(
      'advanceTime',
      0,
      noisy ? 2 : 8
    );
  }

  takeDocument() {
    if (
      this.destroyed ||
      this.collecting ||
      this.scene.isTransitioning
    ) {
      return;
    }

    const state = this.state;

    if (
      state.collected ||
      this.scene.hasItemAlready(this.reward.id)
    ) {
      this.save({
        collected: true,
        moved: true
      });

      this.tell(t('alreadyTaken'));
      return;
    }

    if (!state.moved) {
      this.tell(t('pinned'));
      return;
    }

    this.collecting = true;
    this.close();

    let collected = false;

    try {
      collected = this.scene.collectApartmentItem(
        this.reward,
        this.cabinet.config
      ) === true;
    } catch (error) {
      console.error(
        '[DebtApartmentPuzzle] Collection failed:',
        error
      );
    } finally {
      this.collecting = false;
    }

    if (
      collected ||
      this.scene.hasItemAlready(this.reward.id)
    ) {
      this.save({
        collected: true,
        moved: true
      });

      this.cabinet.collectedIds.add(
        this.reward.id
      );

      this.cabinet.contentsCollected = true;
      this.cabinet.saveProgress();
    } else {
      this.scene.showMessage(
        t('collectionFailed'),
        4000
      );
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.cancelAssetLoad?.();
    this.close();

    this.scene.scale.off(
      'resize',
      this.resizeHandler
    );

    this.scene.events.off(
      'shutdown',
      this.shutdownHandler
    );

    for (
      const { object, key, original }
      of this.bindings
    ) {
      object[key] = original;
    }

    this.bindings.length = 0;
  }
}