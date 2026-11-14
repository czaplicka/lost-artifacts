import { EventBus } from '../../EventBus.js';

const SAVE_KEY = 'debtCabinetPuzzleV1';

export class DebtApartmentPuzzle {
  constructor(system) {
    this.system = system;
    this.scene = system.scene;
    this.root = null;
    this.host = null;
    this.view = null;
    this.note = '';
    this.selectedTool = null;
    this.bindings = [];
    this.destroyed = false;

    this.resizeHandler = () => {
      if (this.root) this.render();
    };
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
      (object.unlocks || [])
        .filter(item => item.isEscapeClue === true)
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

    // Ordinary cabinet contents remain available at the desk.
    desk.unlocks.push(...cabinet.unlocks);
    cabinet.unlocks = [this.reward];
    cabinet.state = 'open';
    cabinet.requiresItem = undefined;
    cabinet.discoveryAction = 'move';

    this.scene.scale.on('resize', this.resizeHandler);
  }

  mount() {
    if (this.destroyed) return;

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
        this.open('cabinet');
      });
    }

    this.replace(this.drawer, 'onInteract', () => {
      this.open('tools');
    });

    if (this.scene.hasItemAlready(this.reward.id)) {
      this.save({ collected: true, moved: true });
    }
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

  open(view) {
    if (!this.root && !this.available()) return;

    this.view = view;
    this.note = '';
    this.selectedTool = null;
    this.render();
  }

  tell(text) {
    this.note = text;
    this.render();
  }

  close() {
    const root = this.root;

    this.root = null;

    if (this.scene.leaveDialog === root) {
      this.scene.leaveDialog = null;
    }

    root?.destroy(true);
  }

  render() {
    if (this.destroyed || !this.scene.sys.isActive()) return;

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

    const host = this.host;
    const { width, height } = host.scale;

    this.root = host.add.container(width / 2, height / 2)
      .setDepth(45000)
      .setScrollFactor(0);

    this.scene.leaveDialog = this.root;

    const backdrop = host.add.rectangle(
      0, 0, width, height, 0x000000, 0.88
    ).setInteractive();

    this.root.add(backdrop);

    const content = host.add.container(0, 0);

    content.setScale(
      Math.min(
        1,
        Math.max(0.1, (width - 20) / 900),
        Math.max(0.1, (height - 20) / 690)
      )
    );

    this.root.add(content);
    this.content = content;

    this.box(0, 0, 900, 690, 0x211a16);

    this.text(
      0, -315,
      this.view === 'tools'
        ? 'KITCHEN DRAWER'
        : 'OUTSTANDING BALANCE',
      24,
      '#ffd788'
    );

    if (this.view === 'tools') {
      this.drawTools();
    } else {
      this.drawCabinet();
    }

    this.text(
      0, 165,
      this.note || this.defaultNote(),
      19,
      '#f1e5ca',
      810
    );

    this.drawToolbelt();

    this.button(
      0, 307, 200, 'CLOSE',
      () => this.close()
    );
  }

  defaultNote() {
    if (this.view === 'tools') {
      return 'A repair kit. Finally, something here without interest payments.';
    }

    const state = this.state;

    if (state.collected) {
      return 'Document recovered. The cabinet remains financially unstable.';
    }

    if (state.moved) {
      return 'The document is free. Click it to take it.';
    }

    if (this.selectedTool) {
      return `Selected: ${this.selectedTool.toUpperCase()}. Click a target.`;
    }

    return 'A travel document is trapped under the broken wheel.';
  }

  box(x, y, width, height, color) {
    const object = this.host.add.rectangle(
      x, y, width, height, color
    ).setStrokeStyle(2, 0x927449);

    this.content.add(object);
    return object;
  }

  text(x, y, value, size = 18, color = '#eee1c9', wrap = 800) {
    const object = this.host.add.text(x, y, value, {
      fontFamily: 'SpecialElite',
      fontSize: `${size}px`,
      color,
      align: 'center',
      wordWrap: { width: wrap }
    }).setOrigin(0.5);

    this.content.add(object);
    return object;
  }

  button(x, y, width, label, callback, enabled = true) {
    const background = this.box(
      x, y, width, 42,
      enabled ? 0x59452e : 0x302923
    );

    const caption = this.text(
      x, y, label, 17,
      enabled ? '#fff0cc' : '#8c806e',
      width - 12
    );

    if (caption.width > width - 14) {
      caption.setScale((width - 14) / caption.width);
    }

    if (enabled) {
      background.setInteractive({ useHandCursor: true });
      background.on('pointerdown', callback);
      background.on('pointerover', () => {
        background.setFillStyle(0x80613c);
      });
      background.on('pointerout', () => {
        background.setFillStyle(0x59452e);
      });
    }

    return background;
  }

  target(x, y, width, height, callback) {
    const zone = this.host.add.zone(
      x, y, width, height
    ).setInteractive({ useHandCursor: true });

    zone.on('pointerdown', callback);
    this.content.add(zone);
  }

  drawTools() {
    const state = this.state;

    this.box(0, -95, 670, 270, 0x493629);
    this.box(0, -95, 620, 220, 0x17120f);

    if (!state.wedgeTaken) {
      const wedge = this.host.add.graphics();
      wedge.fillStyle(0x467b66);
      wedge.fillTriangle(-230, -40, -120, -40, -120, -95);
      this.content.add(wedge);

      this.text(-175, 5, 'RUBBER WEDGE', 17);
      this.target(-175, -65, 150, 100, () => {
        this.save({ wedgeTaken: true });
        this.tell('Rubber wedge taken.');
      });
    } else {
      this.text(-175, -65, 'WEDGE TAKEN', 17, '#a59a88');
    }

    if (!state.crowbarTaken) {
      const bar = this.host.add.graphics();
      bar.lineStyle(14, 0xa8adb0);
      bar.beginPath();
      bar.moveTo(95, -40);
      bar.lineTo(195, -140);
      bar.lineTo(225, -140);
      bar.strokePath();
      this.content.add(bar);

      this.text(165, 5, 'SMALL CROWBAR', 17);
      this.target(165, -95, 180, 160, () => {
        this.save({ crowbarTaken: true });
        this.tell('Small crowbar taken.');
      });
    } else {
      this.text(165, -65, 'CROWBAR TAKEN', 17, '#a59a88');
    }

    this.button(0, 100, 300, 'SEARCH THE REST OF THE DRAWER', () => {
      this.close();
      this.drawerOriginal.call(this.drawer);
    });
  }

  drawCabinet() {
    const state = this.state;
    const offset = state.moved ? 175 : 0;

    this.box(0, 76, 790, 5, 0x777066);
    this.box(300, -90, 18, 330, 0x3c3732);
    this.text(310, -280, 'WALL', 15, '#b4a48e');

    if (!state.collected) {
      this.box(-145, 66, state.moved ? 125 : 65, 24, 0xe4d4a6);
      this.text(
        -145, 66,
        state.moved ? 'DOCUMENT' : '...',
        12,
        '#342a1b'
      );

      this.target(-145, 66, 145, 60, () => this.takeDocument());
    }

    this.box(offset, -100, 310, 280, 0x63442e);
    this.box(offset - 65, -105, 155, 235, 0x795539);

    const doorWidth = state.doorSecured ? 38 : 145;
    const doorX = state.doorSecured ? offset + 160 : offset + 205;

    this.box(doorX, -65, doorWidth, 245, 0x916440);

    this.text(
      doorX, -225,
      state.doorSecured ? 'DOOR SECURED' : 'SAGGING DOOR',
      16
    );

    this.target(doorX, -65, Math.max(80, doorWidth), 245, () => {
      this.useOn('door');
    });

    const wheel = this.host.add.circle(
      offset - 110, 52, 17,
      state.cornerLifted ? 0x97b7a2 : 0x242424
    ).setStrokeStyle(3, 0x9a9386);

    this.content.add(wheel);

    if (!state.cornerLifted) {
      this.text(offset - 110, 52, '/', 25, '#ee9d72');
    }

    this.text(
      offset - 125, 110,
      state.cornerLifted ? 'CORNER SUPPORTED' : 'BROKEN WHEEL',
      15
    );

    this.target(offset - 110, 47, 130, 90, () => {
      this.useOn('wheel');
    });

    if (state.doorSecured) {
      const wedge = this.host.add.graphics();
      wedge.fillStyle(0x467b66);
      wedge.fillTriangle(
        offset + 140, 55,
        offset + 195, 55,
        offset + 195, 25
      );
      this.content.add(wedge);
    }

    if (state.cornerLifted) {
      this.box(offset - 125, 15, 90, 10, 0xa8adb0);
      this.box(offset - 100, 48, 22, 35, 0x68614f);
    }

    if (!state.moved) {
      this.button(-190, -265, 270, 'MOVE CAREFULLY — 8 MIN', () => {
        this.move(false);
      });

      this.button(190, -265, 270, 'YANK IT — 2 MIN / NOISE', () => {
        this.move(true);
      });
    }
  }

  drawToolbelt() {
    const state = this.state;

    const select = tool => {
      this.selectedTool = this.selectedTool === tool ? null : tool;
      this.note = '';
      this.render();
    };

    this.button(
      -220, 248, 240,
      this.selectedTool === 'wedge' ? '> RUBBER WEDGE' : 'RUBBER WEDGE',
      () => select('wedge'),
      state.wedgeTaken && !state.doorSecured
    );

    this.button(
      40, 248, 240,
      this.selectedTool === 'crowbar' ? '> CROWBAR' : 'CROWBAR',
      () => select('crowbar'),
      state.crowbarTaken && !state.cornerLifted
    );

    this.text(
      300, 248,
      'LOCAL TOOLKIT',
      15,
      '#b8a98d',
      170
    );
  }

  useOn(target) {
    const state = this.state;

    if (state.moved) {
      this.tell('The cabinet has already been moved.');
      return;
    }

    if (!this.selectedTool) {
      this.tell(
        target === 'door'
          ? 'The door sags outward and catches against the wall. Something could hold it clear.'
          : 'The wheel has collapsed. The corner needs lifting and support.'
      );
      return;
    }

    if (target === 'door' && this.selectedTool === 'wedge') {
      this.save({ doorSecured: true });
      this.selectedTool = null;
      this.tell('The wedge holds the door clear of the wall.');
      return;
    }

    if (target === 'wheel' && this.selectedTool === 'crowbar') {
      this.save({ cornerLifted: true });
      this.selectedTool = null;
      this.tell(
        'You lever the damaged corner up and brace the bar against the frame.'
      );
      return;
    }

    this.tell(
      target === 'door'
        ? 'Prying the door will not keep it supported.'
        : 'The rubber wedge cannot lift the weight of the cabinet.'
    );
  }

  move(noisy) {
    const state = this.state;

    if (state.moved) return;

    if (!state.doorSecured) {
      this.tell('The sagging door catches against the wall. Secure it first.');
      return;
    }

    if (!state.cornerLifted) {
      this.tell('The broken wheel digs into the floor. Lift that corner first.');
      return;
    }

    this.save({ moved: true, noisy });

    this.cabinet.state = 'open';
    this.cabinet.revealed = true;
    this.cabinet.isInteracted = true;
    this.cabinet.saveProgress();

    this.selectedTool = null;
    this.note = noisy
      ? 'CRASH!\nNeighbour: "If that is the repossession people, the television is mine!"'
      : 'You ease the cabinet aside. A perfect crime against interior design.';

    this.render();

    EventBus.emit('advanceTime', 0, noisy ? 2 : 8);
  }

  takeDocument() {
    const state = this.state;

    if (state.collected || this.scene.hasItemAlready(this.reward.id)) {
      this.save({ collected: true });
      this.tell('The document is already in your inventory.');
      return;
    }

    if (!state.moved) {
      this.tell(
        'The paper is pinned under the broken wheel. Apparently the furniture is withholding evidence.'
      );
      return;
    }

    this.close();

    let collected = false;

    try {
      collected = this.scene.collectApartmentItem(
        this.reward,
        this.cabinet.config
      ) === true;
    } catch (error) {
      console.error('[DebtApartmentPuzzle] Collection failed:', error);
    }

    if (collected || this.scene.hasItemAlready(this.reward.id)) {
      this.save({ collected: true });

      this.cabinet.collectedIds.add(this.reward.id);
      this.cabinet.contentsCollected = true;
      this.cabinet.saveProgress();
    } else {
      this.scene.showMessage(
        'The document could not be collected. Make room in your inventory and try again.',
        4000
      );
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.close();
    this.destroyed = true;

    this.scene.scale.off('resize', this.resizeHandler);

    for (const { object, key, original } of this.bindings) {
      object[key] = original;
    }

    this.bindings.length = 0;
  }
}